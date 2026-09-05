CREATE TABLE "ConversationReadState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationReadState_userId_projectId_key" ON "ConversationReadState"("userId", "projectId");
CREATE INDEX "ConversationReadState_userId_updatedAt_idx" ON "ConversationReadState"("userId", "updatedAt");
CREATE INDEX "ConversationReadState_projectId_idx" ON "ConversationReadState"("projectId");

ALTER TABLE "ConversationReadState" ADD CONSTRAINT "ConversationReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationReadState" ADD CONSTRAINT "ConversationReadState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
