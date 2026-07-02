-- CreateTable
CREATE TABLE "ConcertAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "city" TEXT,
    "date" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ConcertAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConcertAttendance_userId_idx" ON "ConcertAttendance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertAttendance_userId_externalId_key" ON "ConcertAttendance"("userId", "externalId");
