ALTER TYPE "EscrowPaymentMethod" ADD VALUE 'midtrans_snap';

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'midtrans',
    "providerOrderId" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerToken" TEXT,
    "providerRedirectUrl" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawResponse" JSONB,
    "rawNotification" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentTransaction_providerOrderId_key" ON "PaymentTransaction"("providerOrderId");
CREATE UNIQUE INDEX "PaymentTransaction_providerTransactionId_key" ON "PaymentTransaction"("providerTransactionId");
CREATE INDEX "PaymentTransaction_escrowId_createdAt_idx" ON "PaymentTransaction"("escrowId", "createdAt");
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
