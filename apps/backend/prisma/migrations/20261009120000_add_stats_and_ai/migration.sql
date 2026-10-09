-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('ANTHROPIC');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "factsCheckedAt" TIMESTAMP(3),
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ttbCompletionist" DOUBLE PRECISION,
ADD COLUMN     "ttbExtras" DOUBLE PRECISION,
ADD COLUMN     "ttbMain" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AiSettings" (
    "userId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'ANTHROPIC',
    "apiKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

