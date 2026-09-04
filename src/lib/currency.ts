const FRANKFURTER_USD_IDR_URL = "https://api.frankfurter.dev/v2/rate/USD/IDR";

export interface UsdIdrExchangeRate {
  rate: number;
  timestamp: Date;
  source: string;
}

interface FrankfurterPairResponse {
  date?: unknown;
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
}

export class ExchangeRateUnavailableError extends Error {
  constructor(message = "Kurs USD-IDR belum bisa diambil.") {
    super(message);
    this.name = "ExchangeRateUnavailableError";
  }
}

export async function fetchUsdIdrExchangeRate(): Promise<UsdIdrExchangeRate> {
  let response: Response;

  try {
    response = await fetch(FRANKFURTER_USD_IDR_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new ExchangeRateUnavailableError();
  }

  if (!response.ok) {
    throw new ExchangeRateUnavailableError();
  }

  const payload = (await response.json().catch(() => null)) as
    | FrankfurterPairResponse
    | null;
  const rate = Number(payload?.rate);

  if (
    payload?.base !== "USD" ||
    payload?.quote !== "IDR" ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    throw new ExchangeRateUnavailableError();
  }

  const rateDate = typeof payload.date === "string" ? payload.date : "unknown-date";

  return {
    rate,
    timestamp: new Date(),
    source: `Frankfurter API USD/IDR (${rateDate})`,
  };
}

export function convertUsdToIdr(amountUsd: number, exchangeRate: number) {
  return Math.round(amountUsd * exchangeRate);
}
