import { Resend } from "resend";

// Lazy singleton: the Resend constructor throws when the API key is
// missing, which would otherwise crash every page/action that merely
// imports this module (not just the ones that actually send an email).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "MIRA <noreply@mirajob.cloud>";
const ADMIN_EMAIL = "dev@mirajob.cloud";

/**
 * Avvisa l'admin MIRA quando c'è una novità (nuovo studente, associazione o azienda).
 * È best-effort: non deve mai bloccare o far fallire la registrazione dell'utente, quindi
 * chi la chiama ignora il risultato.
 */
export async function sendAdminNewSignupNotification({
  kind,
  name,
  email,
  detail,
}: {
  kind: "student" | "association" | "company";
  name: string;
  email: string;
  detail?: string | null;
}) {
  const label =
    kind === "student" ? "Nuovo studente" : kind === "association" ? "Nuova associazione" : "Nuova azienda";
  const now = new Date().toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `${label}: ${name || email}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px 0;">
        <p style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">MIRA · Notifica admin</p>
        <h2 style="color: #0a1628; font-size: 18px; margin: 0 0 16px;">${label}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1a202c;">
          <tr><td style="padding: 4px 0; color: #718096; width: 120px;">Nome</td><td style="padding: 4px 0;">${name || "—"}</td></tr>
          <tr><td style="padding: 4px 0; color: #718096;">Email</td><td style="padding: 4px 0;">${email || "—"}</td></tr>
          ${detail ? `<tr><td style="padding: 4px 0; color: #718096;">Dettagli</td><td style="padding: 4px 0;">${detail}</td></tr>` : ""}
          <tr><td style="padding: 4px 0; color: #718096;">Quando</td><td style="padding: 4px 0;">${now}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0 12px;" />
        <p style="color: #a0aec0; font-size: 12px;">
          <a href="https://mirajob.cloud/admin" style="color: #2b6cb0;">Apri la dashboard admin</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend admin notification error:", error);
    return { error: error.message };
  }
  return { success: true };
}

/**
 * Email di sollecito inviata dall'admin (es. "completa la MIRA Card" o "pubblica la pagina
 * associazione"). Oggetto e testo arrivano dalla bozza modificabile dell'admin; il link CTA
 * è fisso per tipo di sollecito e non è modificabile lato admin.
 */
export async function sendReminderEmail({
  email,
  subject,
  message,
  ctaLabel,
  ctaUrl,
}: {
  email: string;
  subject: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
        <div style="color: #1a202c; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">${message}</div>
        <a href="${ctaUrl}" style="display: inline-block; background: #0a1628; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          ${ctaLabel}
        </a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <p style="color: #a0aec0; font-size: 12px;">
          MIRA — University Talent Platform<br/>
          <a href="https://mirajob.cloud" style="color: #2b6cb0;">mirajob.cloud</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend reminder error:", error);
    return { error: error.message };
  }
  return { success: true };
}

export async function sendInterviewInvite({
  candidateEmail,
  candidateName,
  associationName,
  presidentName,
  message,
  subject,
}: {
  candidateEmail: string;
  candidateName: string;
  associationName: string;
  presidentName: string;
  message: string;
  subject?: string;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: candidateEmail,
    subject: subject ?? `${associationName} — Invito a colloquio`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
        <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">Invito a colloquio</h2>
        <p style="color: #4a5568; font-size: 14px; margin-bottom: 24px;">
          Ciao ${candidateName || "candidato/a"},<br/>
          <strong>${associationName}</strong> ti ha convocato per un colloquio.
        </p>
        <div style="background: #f7f8fa; border-radius: 8px; padding: 20px; margin-bottom: 24px; white-space: pre-wrap; color: #1a202c; font-size: 14px; line-height: 1.6;">
${message}
        </div>
        <p style="color: #718096; font-size: 13px;">
          Inviato da ${presidentName} tramite MIRA
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #a0aec0; font-size: 12px;">
          MIRA — University Talent Platform<br/>
          <a href="https://mirajob.cloud" style="color: #2b6cb0;">mirajob.cloud</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return { error: error.message };
  }

  return { success: true };
}

function invitationEmailHtml({
  eyebrow,
  heading,
  body,
  inviteUrl,
  note,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  inviteUrl: string;
  note?: string | null;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
      <p style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">${eyebrow}</p>
      <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">${heading}</h2>
      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">${body}</p>
      ${note ? `<div style="background: #f7f8fa; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; color: #1a202c; font-size: 14px; font-style: italic;">&ldquo;${note}&rdquo;</div>` : ""}
      <a href="${inviteUrl}" style="display: inline-block; background: #0a1628; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
        Accetta l'invito
      </a>
      <p style="color: #a0aec0; font-size: 12px; margin-top: 16px;">
        Questo link scade tra 14 giorni. Se il pulsante non funziona, copia questo indirizzo:<br/>
        <a href="${inviteUrl}" style="color: #2b6cb0;">${inviteUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
      <p style="color: #a0aec0; font-size: 12px;">
        MIRA — University Talent Platform<br/>
        <a href="https://mirajob.cloud" style="color: #2b6cb0;">mirajob.cloud</a>
      </p>
    </div>
  `;
}

export async function sendAssociationInvitationEmail({
  email,
  associationName,
  inviteUrl,
  note,
}: {
  email: string;
  associationName: string;
  inviteUrl: string;
  note?: string | null;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Sei stato invitato a gestire ${associationName} su MIRA`,
    html: invitationEmailHtml({
      eyebrow: "Invito ufficiale MIRA",
      heading: `Presidente di ${associationName}`,
      body: `Il team MIRA ti ha invitato a creare e gestire la pagina di <strong>${associationName}</strong> sulla piattaforma. Accetta l'invito per registrarti e iniziare.`,
      inviteUrl,
      note,
    }),
  });

  if (error) {
    console.error("Resend association invite error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function sendCompanyInvitationEmail({
  email,
  companyName,
  inviteUrl,
  note,
}: {
  email: string;
  companyName: string;
  inviteUrl: string;
  note?: string | null;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Sei stato invitato a gestire ${companyName} su MIRA`,
    html: invitationEmailHtml({
      eyebrow: "Invito ufficiale MIRA",
      heading: `Amministratore di ${companyName}`,
      body: `Il team MIRA ti ha invitato ad attivare l'account di <strong>${companyName}</strong> sulla piattaforma. Accetta l'invito per registrarti e iniziare a cercare candidati.`,
      inviteUrl,
      note,
    }),
  });

  if (error) {
    console.error("Resend company invite error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function sendCompanyRejectionEmail({
  email,
  companyName,
  reason,
}: {
  email: string;
  companyName: string;
  reason?: string | null;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Aggiornamento sulla richiesta di ${companyName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
        <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">Richiesta non approvata</h2>
        <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          La richiesta di accesso per <strong>${companyName}</strong> non è stata approvata in questo momento.
        </p>
        ${reason ? `<div style="background: #f7f8fa; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; color: #1a202c; font-size: 14px;">${reason}</div>` : ""}
        <p style="color: #718096; font-size: 13px;">Per domande, rispondi a questa email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <p style="color: #a0aec0; font-size: 12px;">MIRA — University Talent Platform</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend company rejection error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function sendAssociationDecisionEmail({
  email,
  associationName,
  approved,
  reason,
}: {
  email: string;
  associationName: string;
  approved: boolean;
  reason?: string | null;
}) {
  // Le email di decisione alle associazioni sono sempre in inglese (le associazioni MIRA
  // operano in inglese sulla piattaforma). Il ramo "approvata" ha un HTML dedicato invece di
  // riusare invitationEmailHtml: quel template mostrerebbe un footer "il link scade tra 14
  // giorni" che qui è fuori luogo (non c'è nessun link a scadenza).
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: approved
      ? `${associationName} has been approved on MIRA`
      : `Update on your ${associationName} request`,
    html: approved
      ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
          <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
          <p style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Request approved</p>
          <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">${associationName} is now active</h2>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Good news: your request has been approved. The page for <strong>${associationName}</strong> is now active on MIRA and you can start managing it.
          </p>
          <a href="https://mirajob.cloud/api/auth/redirect" style="display: inline-block; background: #0a1628; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Go to MIRA
          </a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #a0aec0; font-size: 12px;">
            MIRA — University Talent Platform<br/>
            <a href="https://mirajob.cloud" style="color: #2b6cb0;">mirajob.cloud</a>
          </p>
        </div>
      `
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
          <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
          <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">Request not approved</h2>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            The request for <strong>${associationName}</strong> was not approved at this time.
          </p>
          ${reason ? `<div style="background: #f7f8fa; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; color: #1a202c; font-size: 14px;">${reason}</div>` : ""}
          <p style="color: #718096; font-size: 13px;">For any questions, just reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #a0aec0; font-size: 12px;">MIRA — University Talent Platform</p>
        </div>
      `,
  });

  if (error) {
    console.error("Resend association decision error:", error);
    return { error: error.message };
  }

  return { success: true };
}
