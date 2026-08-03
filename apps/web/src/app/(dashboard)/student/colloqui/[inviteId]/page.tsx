/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { rangeCoversBlock } from "@/lib/interview-slots";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { SlotPicker, type BookableSlot } from "./slot-picker";
import { DetailHeader } from "@/components/page-bar";

interface Props {
  params: Promise<{ inviteId: string }>;
}

/**
 * La pagina su cui atterra lo studente invitato: sceglie l'orario fra quelli che
 * il board ha davvero coperto. Chi ha già scelto vede il suo colloquio e può
 * ancora spostarlo, finché il round è aperto.
 */
export default async function StudentBookingPage({ params }: Props) {
  const { inviteId } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: invite } = await (supabase.from("interview_invites") as any)
    .select("id, candidate_user_id, session_id, slot_id, location_or_link")
    .eq("id", inviteId)
    .maybeSingle();

  // Un invito che non è tuo non esiste: niente messaggio "non autorizzato", che
  // confermerebbe l'esistenza di quello di qualcun altro.
  if (!invite || invite.candidate_user_id !== profileId) notFound();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(name, slug)")
    .eq("id", invite.session_id)
    .maybeSingle();

  if (!session) notFound();

  const t = await getTranslations("StudentInterviews");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: slots } = await (supabase.from("interview_slots") as any)
    .select("id, starts_at, ends_at, application_id")
    .eq("session_id", invite.session_id)
    .order("starts_at", { ascending: true });

  const { data: availability } = await (supabase.from("interview_availability") as any)
    .select("user_id, starts_at, ends_at")
    .eq("session_id", invite.session_id);

  const now = Date.now();
  const required = session.required_interviewers ?? 1;

  // Compaiono solo gli orari futuri, ancora liberi e davvero coperti dal board.
  const bookable: BookableSlot[] = ((slots ?? []) as any[])
    .filter((s) => {
      if (s.id === invite.slot_id) return true;
      if (s.application_id) return false;
      if (new Date(s.starts_at).getTime() <= now) return false;
      const covering = ((availability ?? []) as any[]).filter((a) =>
        rangeCoversBlock(a, { startsAt: s.starts_at, endsAt: s.ends_at })
      );
      return covering.length >= required;
    })
    .map((s) => ({ id: s.id, startsAt: s.starts_at }));

  const chosen = ((slots ?? []) as any[]).find((s) => s.id === invite.slot_id);
  const place =
    session.mode === "in_person" ? session.location : invite.location_or_link ?? session.meeting_link;

  return (
    <div className="space-y-4">
      <DetailHeader
        back={{ href: "/student/colloqui", label: t("backToInterviews") }}
        title={session.title}
        meta={session.association_profiles?.name}
      />
      <div>
        {session.description && (
          <p className="mt-1 text-body text-ink-secondary whitespace-pre-wrap">{session.description}</p>
        )}
        <p className="mt-1 text-body-sm text-ink-tertiary">
          {session.mode === "online" ? t("online") : t("inPerson")}
          {session.mode === "in_person" && session.location ? ` · ${session.location}` : ""}
        </p>
      </div>

      {chosen ? (
        <div className="rounded-lg border border-petrol/30 bg-petrol-50 px-4 py-3">
          <p className="text-body-sm text-ink">{t("bookedTitle")}</p>
          <p className="mt-0.5 text-body font-medium text-navy">
            {new Date(chosen.starts_at).toLocaleString(dateLocale, {
              timeZone: APP_TIME_ZONE,
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {place && (
            <p className="mt-1 text-body-sm text-ink-secondary break-all">
              {session.mode === "online" ? (
                <a href={place} target="_blank" rel="noopener noreferrer" className="text-petrol underline underline-offset-2">
                  {place}
                </a>
              ) : (
                place
              )}
            </p>
          )}
          {session.mode === "online" && !place && (
            <p className="mt-1 text-body-sm text-ink-tertiary">{t("linkComingLater")}</p>
          )}
          {session.status === "open" && (
            <p className="mt-2 text-body-sm text-ink-tertiary">{t("canReschedule")}</p>
          )}
        </div>
      ) : (
        <p className="text-body text-ink">{t("pickPrompt")}</p>
      )}

      {session.status === "open" ? (
        <SlotPicker
          inviteId={inviteId}
          slots={bookable}
          currentSlotId={invite.slot_id}
          dateLocale={dateLocale}
        />
      ) : (
        !chosen && (
          <div className="rounded-lg border border-border bg-white p-6 text-center">
            <p className="text-body-sm text-ink-secondary">{t("bookingsClosed")}</p>
          </div>
        )
      )}
    </div>
  );
}
