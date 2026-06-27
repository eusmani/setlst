-- CreateTable
CREATE TABLE "ThreadVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    CONSTRAINT "ThreadVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThreadVote_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThreadShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "threadId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    CONSTRAINT "ThreadShare_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThreadShare_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThreadShare_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadVote_userId_threadId_key" ON "ThreadVote"("userId", "threadId");

-- CreateIndex
CREATE INDEX "ThreadShare_toUserId_idx" ON "ThreadShare"("toUserId");
