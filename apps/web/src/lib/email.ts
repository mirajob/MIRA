import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "MIRA <noreply@mirajob.cloud>";

export async function sendInterviewInvite({
  candidateEmail,
  candidateName,
  associationName,
  presidentName,
  message,
}: {
  candidateEmail: string;
  candidateName: string;
  associationName: string;
  presidentName: string;
  message: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: candidateEmail,
    subject: `${associationName} — Invito a colloquio`,
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
