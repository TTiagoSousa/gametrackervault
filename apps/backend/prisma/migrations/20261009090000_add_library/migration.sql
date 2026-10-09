-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('PLAYING', 'PAUSED', 'PLAN_TO_PLAY', 'FINISHED_MAIN', 'FINISHED_EXTRAS', 'COMPLETED_100', 'DROPPED');

-- CreateTable
CREATE TABLE "Game" (
    "igdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "coverImageId" TEXT,
    "releaseYear" INTEGER,
    "platforms" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("igdbId")
);

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "status" "LibraryStatus" NOT NULL,
    "hoursPlayed" DOUBLE PRECISION,
    "startedAt" DATE,
    "finishedAt" DATE,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_status_idx" ON "LibraryEntry"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_userId_gameId_key" ON "LibraryEntry"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("igdbId") ON DELETE RESTRICT ON UPDATE CASCADE;

