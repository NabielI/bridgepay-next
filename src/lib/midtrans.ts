import { createHash, timingSafeEqual } from "crypto";

interface MidtransConfig {
  serverKey: string;
  isProduction: boolean;
}

interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  projectTitle: string;
  customer: {
    name: string | null;
    email: string;
  };
}

interface SnapTransactionResponse {
  token: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}

interface MidtransNotification {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
  transaction_id?: unknown;
}

export class MidtransConfigurationError extends Error {
  constructor(message = "Konfigurasi Midtrans belum lengkap.") {
    super(message);
    this.name = "MidtransConfigurationError";
  }
}

export class MidtransRequestError extends Error {
  constructor(message = "Transaksi Midtrans gagal dibuat.") {
    super(message);
    this.name = "MidtransRequestError";
  }
}

function getMidtransConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new MidtransConfigurationError();
  }

  return {
    serverKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  };
}

function getSnapBaseUrl(isProduction: boolean) {
  return isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function getAuthorizationHeader(serverKey: string) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function createMidtransSnapTransaction(
  input: SnapTransactionInput,
): Promise<SnapTransactionResponse> {
  const config = getMidtransConfig();
  const response = await fetch(`${getSnapBaseUrl(config.isProduction)}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: getAuthorizationHeader(config.serverKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      item_details: [
        {
          id: input.orderId,
          price: input.grossAmount,
          quantity: 1,
          name: `BridgePay Escrow - ${input.projectTitle}`.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: input.customer.name ?? input.customer.email,
        email: input.customer.email,
      },
    }),
  });

  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !raw) {
    throw new MidtransRequestError();
  }

  const token = asString(raw.token);
  const redirectUrl = asString(raw.redirect_url);

  if (!token || !redirectUrl) {
    throw new MidtransRequestError("Response Midtrans tidak berisi token checkout.");
  }

  return {
    token,
    redirectUrl,
    raw,
  };
}

export function verifyMidtransNotificationSignature(
  notification: MidtransNotification,
) {
  const config = getMidtransConfig();
  const orderId = asString(notification.order_id);
  const statusCode = asString(notification.status_code);
  const grossAmount = asString(notification.gross_amount);
  const signatureKey = asString(notification.signature_key);

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${config.serverKey}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureKey);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function getMidtransPaymentStatus(notification: MidtransNotification) {
  const transactionStatus = asString(notification.transaction_status);
  const fraudStatus = asString(notification.fraud_status);

  if (transactionStatus === "settlement") {
    return "settled";
  }

  if (transactionStatus === "capture" && (!fraudStatus || fraudStatus === "accept")) {
    return "settled";
  }

  if (transactionStatus === "pending" || transactionStatus === "challenge") {
    return "pending";
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure"
  ) {
    return "failed";
  }

  return transactionStatus ?? "unknown";
}

export function getMidtransNotificationValue(
  notification: MidtransNotification,
  key: keyof MidtransNotification,
) {
  return asString(notification[key]);
}
