const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export class EmailDeliveryError extends Error {
  constructor(message = "Email reset password belum bisa dikirim.") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function resendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new EmailDeliveryError("RESEND_API_KEY belum dikonfigurasi.");
  }

  return apiKey;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${resendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset password BridgePay",
      text: [
        "Gunakan link berikut untuk reset password BridgePay.",
        "Link ini berlaku 30 menit dan hanya bisa dipakai satu kali.",
        "",
        resetUrl,
      ].join("\n"),
    }),
  }).catch(() => null);

  if (!response?.ok) {
    throw new EmailDeliveryError();
  }
}
