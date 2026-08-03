"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { parseWindows, rangeCoversBlock } from "@/lib/interview-slots";
import { buildInterviewIcs } from "@/lib/ics";
import { generateMeetingRoomUrl } from "@/lib/meeting-room";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { sendInterviewBookingInvite, sendInterviewConfirmation } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Invito al round e prenotazione dell'orario.
 *
 * Il board invita chi è passato, lo studente sceglie fra gli orari coperti. La
 * prenotazione è il punto delicato: due studenti che cliccano lo stesso orario
 * nello stesso istante non devono ritrovarsi entrambi convocati.
 */

function whenLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleString("it-IT", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Invita alla sessione i candidati scelti, uno per riga, senza fissare l'orario. */
export async function inviteCandidatesToSession(input: {
  sessionId: string;
  slug: string;
  applicationIds: string[];
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(name)")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };
  if (session.status === "closed") return { error: "Questo round è chiuso." };

  // Invitare È l'apertura: non ha senso un pulsante "apri le prenotazioni"
  // separato, visto che le date ci sono già e chi invitare lo decidi tu. Serve
  // però che qualcuno del board sia disponibile, altrimenti gli invitati non
  // troverebbero un solo orario da scegliere.
  const { count: availabilityCount } = await (supabase.from("interview_availability") as any)
    .select("id", { count: "exact", head: true })
    .eq("session_id", input.sessionId);

  if (!availabilityCount) {
    return {
      error: "Nessuno del board ha ancora segnato la propria disponibilità: chi inviti non troverebbe orari.",
    };
  }

  if (session.status === "draft") {
    await (supabase.from("interview_sessions") as any)
      .update({ status: "open" })
      .eq("id", input.sessionId);
  }

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", session.association_id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  const canInvite =
    ctx.isMiraAdmin ||
    membership?.role === "association_admin" ||
    membership?.role === "association_president" ||
    Boolean((membership?.permissions as Record<string, boolean> | null)?.send_interview_invites);

  if (!canInvite) return { error: "Non hai i permessi." };
  if (!input.applicationIds.length) return { error: "Nessun candidato selezionato." };

  const { data: applications } = await (supabase.from("applications") as any)
    .select("id, student_user_id, association_id, profiles!applications_student_user_id_fkey(full_name, email)")
    .in("id", input.applicationIds)
    .eq("association_id", session.association_id);

  // I dettagli che finiscono nell'invito. Il posto si scrive solo quando è già
  // deciso adesso: con un posto per colloquio arriva dopo la prenotazione, e
  // annunciarlo qui sarebbe una promessa che la mail non mantiene.
  const placeIsLink = session.mode === "online";
  const sharedPlace =
    session.link_mode === "shared"
      ? placeIsLink
        ? session.meeting_link
        : session.location
      : null;

  const windows = parseWindows(session.windows);
  const dayLabels = [...new Set(windows.map((w) => w.date))].sort();
  const dayFormat = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
      timeZone: APP_TIME_ZONE,
      day: "numeric",
      month: "long",
    });
  const firstDay = dayLabels[0];
  const lastDay = dayLabels[dayLabels.length - 1];
  const daysLabel = !firstDay
    ? null
    : firstDay === lastDay || !lastDay
      ? dayFormat(firstDay)
      : `${dayFormat(firstDay)} to ${dayFormat(lastDay)}`;

  let invited = 0;
  // Le mail non partite non si perdono in silenzio: chi invita deve sapere che
  // quel candidato non ha ricevuto niente, altrimenti lo aspetta per giorni.
  const emailFailures: string[] = [];

  for (const application of ((applications ?? []) as any[])) {
    // Un secondo invito allo stesso round non crea una seconda riga: l'unicità
    // qui è per candidatura, altrimenti lo studente riceverebbe due link.
    const { data: existing } = await (supabase.from("interview_invites") as any)
      .select("id")
      .eq("application_id", application.id)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    let inviteId = existing?.id as string | undefined;

    if (!inviteId) {
      const { data: created, error } = await (supabase.from("interview_invites") as any)
        .insert({
          application_id: application.id,
          association_id: session.association_id,
          session_id: input.sessionId,
          sent_by_user_id: (ctx.profile as any).id,
          candidate_user_id: application.student_user_id,
          status: "sent",
        })
        .select("id")
        .single();

      if (error) continue;
      inviteId = created.id as string;
    }

    await (supabase.from("applications") as any)
      .update({ status: "interview", last_status_change_at: new Date().toISOString() })
      .eq("id", application.id);

    await (supabase.from("notifications") as any).insert({
      user_id: application.student_user_id,
      type: "interview_invite",
      title: "Scegli quando fare il colloquio",
      body: `${session.association_profiles?.name}: ${session.title}`,
      data: { invite_id: inviteId },
    });

    const name = application.profiles?.full_name ?? application.profiles?.email ?? "–";
    if (!application.profiles?.email) {
      emailFailures.push(name);
    } else {
      const sent = await sendInterviewBookingInvite({
        email: application.profiles.email,
        studentName: application.profiles.full_name ?? null,
        associationName: session.association_profiles?.name ?? "",
        sessionTitle: session.title,
        sessionDescription: session.description,
        bookingUrl: `https://mirajob.cloud/student/colloqui/${inviteId}`,
        formatLabel: session.mode === "online" ? "Online" : "In person",
        placeLabel: sharedPlace ?? null,
        placeIsLink,
        durationLabel: session.slot_duration_minutes
          ? `${session.slot_duration_minutes} minutes`
          : null,
        daysLabel,
      }).catch((e) => ({ error: e instanceof Error ? e.message : "invio fallito" }));

      if ("error" in sent && sent.error) emailFailures.push(name);
    }

    invited++;
  }

  revalidatePath(`/association/${input.slug}/colloqui/${input.sessionId}`);

  if (emailFailures.length) {
    return {
      success: true,
      invited,
      warning: `Invito registrato, ma la mail non è partita a: ${emailFailures.join(", ")}.`,
    };
  }
  return { success: true, invited };
}

/**
 * Lo studente prende un orario.
 *
 * L'occupazione è condizionata dentro la stessa operazione che la scrive: se un
 * altro candidato ha preso lo slot un istante prima, la scrittura non tocca
 * nessuna riga e chi arriva secondo se lo sente dire, invece di presentarsi a un
 * colloquio che non esiste.
 */
export async function bookInterviewSlot(input: { inviteId: string; slotId: string }) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: invite } = await (supabase.from("interview_invites") as any)
    .select("id, application_id, session_id, candidate_user_id, slot_id")
    .eq("id", input.inviteId)
    .maybeSingle();

  if (!invite) return { error: "Invito non trovato." };
  if (invite.candidate_user_id !== profileId) return { error: "Questo invito non è tuo." };
  if (!invite.session_id) return { error: "Invito non collegato a un round." };

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(name)")
    .eq("id", invite.session_id)
    .maybeSingle();

  if (!session) return { error: "Round non trovato." };
  if (session.status !== "open") return { error: "Le prenotazioni per questo round sono chiuse." };

  const { data: slot } = await (supabase.from("interview_slots") as any)
    .select("id, session_id, starts_at, ends_at, application_id")
    .eq("id", input.slotId)
    .maybeSingle();

  if (!slot || slot.session_id !== invite.session_id) return { error: "Orario non valido." };

  // Chi è disponibile su questa fascia. Se non basta a coprire il round, l'orario
  // non doveva nemmeno comparire: è un controllo di sicurezza, non di interfaccia.
  const { data: availability } = await (supabase.from("interview_availability") as any)
    .select("user_id, starts_at, ends_at")
    .eq("session_id", invite.session_id);

  const covering = ((availability ?? []) as any[]).filter((a) =>
    rangeCoversBlock(a, { startsAt: slot.starts_at, endsAt: slot.ends_at })
  );

  if (covering.length < (session.required_interviewers ?? 1)) {
    return { error: "Questo orario non è più disponibile." };
  }

  // Fra chi è libero conduce chi ha meno colloqui in questo round: senza questo,
  // il primo della lista se li prenderebbe tutti.
  const { data: assigned } = await (supabase.from("interview_slots") as any)
    .select("interviewer_user_id")
    .eq("session_id", invite.session_id)
    .not("interviewer_user_id", "is", null);

  const load = new Map<string, number>();
  for (const row of ((assigned ?? []) as any[])) {
    load.set(row.interviewer_user_id, (load.get(row.interviewer_user_id) ?? 0) + 1);
  }
  const interviewer = [...covering].sort(
    (a, b) => (load.get(a.user_id) ?? 0) - (load.get(b.user_id) ?? 0)
  )[0];

  // Il cuore: occupa solo se ancora libero, nella stessa istruzione.
  const { data: claimed } = await (supabase.from("interview_slots") as any)
    .update({
      application_id: invite.application_id,
      booked_at: new Date().toISOString(),
      status: "booked",
      interviewer_user_id: interviewer?.user_id ?? null,
    })
    .eq("id", input.slotId)
    .is("application_id", null)
    .select("id");

  if (!claimed || !claimed.length) {
    return { error: "Qualcuno ha appena preso questo orario. Scegline un altro." };
  }

  // Se stava già su un altro orario, quello torna libero.
  if (invite.slot_id && invite.slot_id !== input.slotId) {
    await (supabase.from("interview_slots") as any)
      .update({ application_id: null, booked_at: null, status: "open", interviewer_user_id: null })
      .eq("id", invite.slot_id);
  }

  const { data: interviewerProfile } = interviewer
    ? await (supabase.from("profiles") as any)
        .select("full_name, email, meeting_link")
        .eq("id", interviewer.user_id)
        .maybeSingle()
    : { data: null };

  // Il posto. In "auto" nasce adesso, e questo e' il motivo per cui esiste quella
  // modalita': cosi' la conferma di prenotazione lo contiene gia' e non serve una
  // seconda email. In "per_interview" arriva dopo, messo da chi conduce.
  const generatedRoom =
    session.mode === "online" && session.link_mode === "auto" ? generateMeetingRoomUrl() : null;

  const place =
    generatedRoom ??
    (session.link_mode !== "shared"
      ? null
      : session.mode === "in_person"
        ? session.location
        : session.meeting_link ?? interviewerProfile?.meeting_link ?? null);

  if (generatedRoom) {
    await (supabase.from("interview_slots") as any)
      .update({ meeting_link: generatedRoom })
      .eq("id", input.slotId);
  }

  await (supabase.from("interview_invites") as any)
    .update({
      slot_id: input.slotId,
      selected_time: slot.starts_at,
      location_or_link: place,
      status: "scheduled",
    })
    .eq("id", input.inviteId);

  const ics = buildInterviewIcs({
    uid: input.slotId,
    title: `${session.title} · ${session.association_profiles?.name ?? ""}`,
    description: session.description,
    location: place,
    startsAt: new Date(slot.starts_at),
    endsAt: new Date(slot.ends_at),
    organizerName: session.association_profiles?.name ?? "MIRA",
  });

  const { data: student } = await (supabase.from("profiles") as any)
    .select("full_name, email")
    .eq("id", profileId)
    .maybeSingle();

  const label = whenLabel(slot.starts_at);

  await sendInterviewConfirmation({
    email: student?.email,
    recipientName: student?.full_name ?? null,
    associationName: session.association_profiles?.name ?? "",
    sessionTitle: session.title,
    whenLabel: label,
    placeLabel: place,
    placeIsLink: session.mode === "online",
    icsContent: ics,
  }).catch(() => {});

  // Anche chi conduce riceve l'evento: è il modo per cui se lo trova in calendario
  // senza doverlo ricopiare.
  if (interviewerProfile?.email) {
    await sendInterviewConfirmation({
      email: interviewerProfile.email,
      recipientName: interviewerProfile.full_name ?? null,
      associationName: session.association_profiles?.name ?? "",
      sessionTitle: session.title,
      whenLabel: label,
      placeLabel: place,
      placeIsLink: session.mode === "online",
      icsContent: ics,
      variant: "interviewer",
      counterpartName: student?.full_name ?? null,
    }).catch(() => {});
  }

  revalidatePath("/student/colloqui");
  revalidatePath(`/student/colloqui/${input.inviteId}`);
  return { success: true };
}

/** Il link del singolo colloquio, quando la sessione lavora in per_interview. */
export async function setSlotMeetingLink(input: {
  slotId: string;
  slug: string;
  sessionId: string;
  link: string;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: slot } = await (supabase.from("interview_slots") as any)
    .select(`
      id, session_id, starts_at, ends_at, meeting_link, application_id,
      applications(student_user_id, profiles!applications_student_user_id_fkey(full_name, email)),
      interview_sessions(association_id, title, description, association_profiles(name))
    `)
    .eq("id", input.slotId)
    .maybeSingle();

  if (!slot) return { error: "Colloquio non trovato." };

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", slot.interview_sessions?.association_id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership && !ctx.isMiraAdmin) return { error: "Non fai parte di questa associazione." };

  const link = input.link.trim() || null;
  const changed = link !== (slot.meeting_link ?? null);

  const { error } = await (supabase.from("interview_slots") as any)
    .update({ meeting_link: link })
    .eq("id", input.slotId);

  if (error) return { error: error.message };

  await (supabase.from("interview_invites") as any)
    .update({ location_or_link: link })
    .eq("slot_id", input.slotId);

  // Salvare il link e basta non serve a niente: il candidato deve riceverlo.
  // Parte una conferma aggiornata con l'evento allegato, così il colloquio in
  // calendario si aggiorna invece di restare senza indirizzo.
  const student = slot.applications?.profiles;
  if (changed && link && student?.email) {
    const session = slot.interview_sessions;
    const associationName = session?.association_profiles?.name ?? "";

    const ics = buildInterviewIcs({
      uid: input.slotId,
      title: `${session?.title ?? "Colloquio"} · ${associationName}`,
      description: session?.description,
      location: link,
      startsAt: new Date(slot.starts_at),
      endsAt: new Date(slot.ends_at),
      organizerName: associationName || "MIRA",
    });

    await sendInterviewConfirmation({
      email: student.email,
      recipientName: student.full_name ?? null,
      associationName,
      sessionTitle: session?.title ?? "",
      whenLabel: whenLabel(slot.starts_at),
      placeLabel: link,
      placeIsLink: true,
      icsContent: ics,
      variant: "details",
    }).catch(() => {});

    const studentUserId = slot.applications?.student_user_id;
    if (studentUserId) {
      await (supabase.from("notifications") as any).insert({
        user_id: studentUserId,
        type: "interview_link",
        title: "Link del colloquio",
        body: `${associationName}: il link per il tuo colloquio è disponibile.`,
        data: { slot_id: input.slotId },
      });
    }
  }

  revalidatePath(`/association/${input.slug}/colloqui/${input.sessionId}`);
  revalidatePath("/student/colloqui");
  return { success: true, notified: Boolean(changed && link) };
}
