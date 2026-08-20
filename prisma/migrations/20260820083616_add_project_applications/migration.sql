-- CreateEnum
CREATE TYPE "ProjectApplicationStatus" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "assignedFreelancerId" TEXT;

-- CreateTable
CREATE TABLE "ProjectApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "status" "ProjectApplicationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectApplication_projectId_status_idx" ON "ProjectApplication"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectApplication_freelancerId_status_idx" ON "ProjectApplication"("freelancerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectApplication_projectId_freelancerId_key" ON "ProjectApplication"("projectId", "freelancerId");

-- CreateIndex
CREATE INDEX "Project_assignedFreelancerId_idx" ON "Project"("assignedFreelancerId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedFreelancerId_fkey" FOREIGN KEY ("assignedFreelancerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
