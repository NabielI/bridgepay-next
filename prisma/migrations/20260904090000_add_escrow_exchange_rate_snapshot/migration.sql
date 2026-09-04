ALTER TABLE "Escrow"
ADD COLUMN "exchangeRateSnapshot" DECIMAL(18,6),
ADD COLUMN "exchangeRateTimestamp" TIMESTAMP(3),
ADD COLUMN "exchangeRateSource" TEXT;
