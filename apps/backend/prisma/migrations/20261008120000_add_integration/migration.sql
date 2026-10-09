-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('IGDB');

-- CreateTable
CREATE TABLE "Integration" (
    "provider" "IntegrationProvider" NOT NULL,
    "clientId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("provider")
);

