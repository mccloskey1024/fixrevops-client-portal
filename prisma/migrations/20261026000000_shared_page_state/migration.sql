-- CreateTable
CREATE TABLE "SharedPageState" (
    "slug" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedPageState_pkey" PRIMARY KEY ("slug")
);
