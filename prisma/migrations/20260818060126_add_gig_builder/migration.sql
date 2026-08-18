-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "GigGenerationMode" AS ENUM ('template', 'ai');

-- CreateTable
CREATE TABLE "Gig" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "skills" TEXT[],
    "startingPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "packages" JSONB NOT NULL,
    "deliverables" TEXT[],
    "status" "GigStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GigDraft" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "gigId" TEXT,
    "brief" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "skills" TEXT[],
    "targetClient" TEXT,
    "tone" TEXT NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "generated" JSONB NOT NULL,
    "generationMode" "GigGenerationMode" NOT NULL DEFAULT 'template',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GigDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gig_freelancerId_status_idx" ON "Gig"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "Gig_status_createdAt_idx" ON "Gig"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GigDraft_freelancerId_createdAt_idx" ON "GigDraft"("freelancerId", "createdAt");

-- CreateIndex
CREATE INDEX "GigDraft_gigId_idx" ON "GigDraft"("gigId");

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigDraft" ADD CONSTRAINT "GigDraft_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigDraft" ADD CONSTRAINT "GigDraft_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
