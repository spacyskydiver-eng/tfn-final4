-- ============================================================
-- Initial migration: Kill Tracker schema
-- Generated: 2026-03-10
--
-- Apply manually or via:
--   DATABASE_URL="postgresql://..." npx prisma migrate deploy
-- ============================================================

-- CreateTable: User
CREATE TABLE "User" (
    "id"        TEXT         NOT NULL,
    "discordId" TEXT         NOT NULL,
    "username"  TEXT         NOT NULL,
    "avatar"    TEXT,
    "isAdmin"   BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApiToken
CREATE TABLE "ApiToken" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "tokenHash"  TEXT         NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: KillEvent
CREATE TABLE "KillEvent" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "reportType"  TEXT         NOT NULL,
    "rawText"     TEXT         NOT NULL,
    "contentHash" TEXT         NOT NULL,
    "parsedData"  JSONB        NOT NULL,
    "killCount"   INTEGER      NOT NULL DEFAULT 0,
    "fortKills"   INTEGER      NOT NULL DEFAULT 0,
    "syncedVia"   TEXT         NOT NULL DEFAULT 'clipboard',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KillEvent_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "User_discordId_key"             ON "User"("discordId");
CREATE UNIQUE INDEX "ApiToken_tokenHash_key"          ON "ApiToken"("tokenHash");
CREATE UNIQUE INDEX "KillEvent_userId_contentHash_key" ON "KillEvent"("userId", "contentHash");

-- Standard indexes for common query patterns
CREATE INDEX "ApiToken_userId_idx"            ON "ApiToken"("userId");
CREATE INDEX "KillEvent_userId_reportType_idx" ON "KillEvent"("userId", "reportType");
CREATE INDEX "KillEvent_userId_createdAt_idx"  ON "KillEvent"("userId", "createdAt" DESC);

-- Foreign keys
ALTER TABLE "ApiToken"  ADD CONSTRAINT "ApiToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KillEvent" ADD CONSTRAINT "KillEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
