import { NextResponse } from "next/server";

import {
  ExchangeRateUnavailableError,
  fetchUsdIdrExchangeRate,
} from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const exchangeRate = await fetchUsdIdrExchangeRate().catch((error: unknown) => {
    if (error instanceof ExchangeRateUnavailableError) {
      return null;
    }

    throw error;
  });

  if (!exchangeRate) {
    return NextResponse.json(
      { message: "Kurs USD-IDR belum tersedia." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    rate: exchangeRate.rate,
    timestamp: exchangeRate.timestamp.toISOString(),
    source: exchangeRate.source,
  });
}
