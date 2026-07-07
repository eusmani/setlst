-- AlterTable
ALTER TABLE "User" ADD COLUMN "spotifyAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "spotifyConnectedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "spotifyRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "spotifyTokenExpires" DATETIME;
