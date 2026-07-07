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

export async function sendAcceptanceEmail({
  candidateEmail,
  candidateName,
  associationName,
}: {
  candidateEmail: string;
  candidateName: string;
  associationName: string;
}) {
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: candidateEmail,
    subject: `Complimenti! Sei stato accettato in ${associationName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
        <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">Congratulazioni! 🎉</h2>
        <p style="color: #1a202c; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          Ciao ${candidateName},<br/><br/>
          Siamo lieti di comunicarti che sei stato <strong>accettato</strong> in <strong>${associationName}</strong>!
        </p>
        <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Accedi a MIRA per vedere i dettagli e iniziare a far parte dell'associazione.
        </p>
        <a href="https://mirajob.cloud/student" style="display: inline-block; background: #0a1628; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Vai su MIRA
        </a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;" />
        <p style="color: #a0aec0; font-size: 12px;">
          MIRA — University Talent Platform<br/>
          <a href="https://mirajob.cloud" style="color: #2b6cb0;">mirajob.cloud</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend acceptance error:", error);
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
  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: approved
      ? `${associationName} è stata approvata su MIRA`
      : `Aggiornamento sulla richiesta di ${associationName}`,
    html: approved
      ? invitationEmailHtml({
          eyebrow: "Richiesta approvata",
          heading: `${associationName} è attiva`,
          body: `Buone notizie: la tua richiesta è stata approvata. La pagina di <strong>${associationName}</strong> è ora attiva su MIRA e puoi iniziare a gestirla.`,
          inviteUrl: "https://mirajob.cloud/api/auth/redirect",
          note: null,
        }).replace("Accetta l'invito", "Vai su MIRA")
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
          <img src="https://mirajob.cloud/brand/mira-lockup.svg" alt="MIRA" style="height: 24px; margin-bottom: 32px;" />
          <h2 style="color: #0a1628; font-size: 20px; margin-bottom: 8px;">Richiesta non approvata</h2>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            La richiesta per <strong>${associationName}</strong> non è stata approvata in questo momento.
          </p>
          ${reason ? `<div style="background: #f7f8fa; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; color: #1a202c; font-size: 14px;">${reason}</div>` : ""}
          <p style="color: #718096; font-size: 13px;">Per domande, rispondi a questa email.</p>
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
