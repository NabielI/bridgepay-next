-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

-- CreateTable
CREATE TABLE "FreelancerExperience" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerPortfolioProject" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "imageUrl" TEXT,
    "imageStoragePath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerPortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerLanguage" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerCertification" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "credentialUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreelancerExperience_freelancerId_sortOrder_idx" ON "FreelancerExperience"("freelancerId", "sortOrder");

-- CreateIndex
CREATE INDEX "FreelancerPortfolioProject_freelancerId_sortOrder_idx" ON "FreelancerPortfolioProject"("freelancerId", "sortOrder");

-- CreateIndex
CREATE INDEX "FreelancerLanguage_freelancerId_sortOrder_idx" ON "FreelancerLanguage"("freelancerId", "sortOrder");

-- CreateIndex
CREATE INDEX "FreelancerCertification_freelancerId_sortOrder_idx" ON "FreelancerCertification"("freelancerId", "sortOrder");

-- AddForeignKey
ALTER TABLE "FreelancerExperience" ADD CONSTRAINT "FreelancerExperience_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerPortfolioProject" ADD CONSTRAINT "FreelancerPortfolioProject_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerLanguage" ADD CONSTRAINT "FreelancerLanguage_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerCertification" ADD CONSTRAINT "FreelancerCertification_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
