-- AlterTable
ALTER TABLE "ThreadReply" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ThreadReply_parentId_idx" ON "ThreadReply"("parentId");
