import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

export const SIMPLIFIED_TAX_RATE = new Prisma.Decimal("0.005");
export const SIMPLIFIED_TAX_LABEL = "PPh Final UMKM 0.5%";

type InvoiceClient = Pick<Prisma.TransactionClient, "invoice">;

const invoiceResultSelect = Prisma.validator<Prisma.InvoiceSelect>()({
  id: true,
  invoiceNumber: true,
  amountUsd: true,
  exchangeRateSnapshot: true,
  exchangeRateTimestamp: true,
  exchangeRateSource: true,
  amountIdr: true,
  taxRate: true,
  estimatedTaxIdr: true,
  netEstimatedPayoutIdr: true,
  status: true,
  issuedAt: true,
});

interface InvoiceInput {
  projectId: string;
  escrowId: string;
  freelancerId: string;
  clientId: string;
  amountUsd: number;
  exchangeRateSnapshot: Prisma.Decimal;
  exchangeRateTimestamp: Date;
  exchangeRateSource?: string | null;
}

export function calculateInvoiceAmounts(
  amountUsd: number,
  exchangeRateSnapshot: Prisma.Decimal | number | string,
) {
  const rate = Number(exchangeRateSnapshot);
  const amountIdr = Math.round(amountUsd * rate);
  const estimatedTaxIdr = Math.round(
    amountIdr * Number(SIMPLIFIED_TAX_RATE),
  );

  return {
    amountIdr,
    estimatedTaxIdr,
    netEstimatedPayoutIdr: amountIdr - estimatedTaxIdr,
  };
}

export function createInvoiceNumber(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `BP-INV-${stamp}-${suffix}`;
}

export async function createInvoiceForReleasedEscrow(
  client: InvoiceClient,
  input: InvoiceInput,
) {
  const existingInvoice = await client.invoice.findUnique({
    where: { escrowId: input.escrowId },
    select: invoiceResultSelect,
  });

  if (existingInvoice) {
    return { ...existingInvoice, created: false };
  }

  const amounts = calculateInvoiceAmounts(
    input.amountUsd,
    input.exchangeRateSnapshot,
  );

  const invoice = await client.invoice.create({
    data: {
      invoiceNumber: createInvoiceNumber(),
      projectId: input.projectId,
      escrowId: input.escrowId,
      freelancerId: input.freelancerId,
      clientId: input.clientId,
      amountUsd: input.amountUsd,
      exchangeRateSnapshot: input.exchangeRateSnapshot,
      exchangeRateTimestamp: input.exchangeRateTimestamp,
      exchangeRateSource: input.exchangeRateSource ?? null,
      taxRate: SIMPLIFIED_TAX_RATE,
      ...amounts,
    },
    select: invoiceResultSelect,
  });

  return { ...invoice, created: true };
}
