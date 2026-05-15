/**
 * Sends a password reset email via Resend (https://resend.com).
 * If RESEND_API_KEY is not set, logs the reset link to the console (dev mode).
 *
 * Required env vars for production:
 *   RESEND_API_KEY  — your Resend API key
 *   EMAIL_FROM      — e.g. "Funk Lab <noreply@yourdomain.com>"
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string | null,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${encodeURIComponent(token)}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[Dev] Password reset for ${to}\n${resetUrl}\n`);
    return;
  }

  const from =
    process.env.EMAIL_FROM ?? "Funk Lab <noreply@yourdomain.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Reset your Funk Lab password",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#09090b;color:#f0f0f0;padding:40px;border-radius:12px;border:1px solid #2d1a42">
          <h1 style="color:#a855f7;margin:0 0 8px">🎵 Funk Lab</h1>
          <p>Hey ${name ?? "there"},</p>
          <p>Someone requested a password reset for your account. Click below — this link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#a855f7;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#777;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error: ${body}`);
  }
}
