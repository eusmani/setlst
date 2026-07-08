-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "favoriteGenres" TEXT,
    "topAlbums" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumPlan" TEXT,
    "premiumUntil" DATETIME,
    "revenueCatId" TEXT,
    "spotifyAccessToken" TEXT,
    "spotifyRefreshToken" TEXT,
    "spotifyTokenExpires" DATETIME,
    "spotifyConnectedAt" DATETIME
);
INSERT INTO "new_User" ("avatar", "bio", "createdAt", "email", "emailVerified", "favoriteGenres", "id", "isPrivate", "password", "phone", "spotifyAccessToken", "spotifyConnectedAt", "spotifyRefreshToken", "spotifyTokenExpires", "topAlbums", "username") SELECT "avatar", "bio", "createdAt", "email", "emailVerified", "favoriteGenres", "id", "isPrivate", "password", "phone", "spotifyAccessToken", "spotifyConnectedAt", "spotifyRefreshToken", "spotifyTokenExpires", "topAlbums", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
