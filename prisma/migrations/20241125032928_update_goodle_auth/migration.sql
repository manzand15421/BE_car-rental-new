-- AlterTable
ALTER TABLE "order" ALTER COLUMN "overdue_time" SET DEFAULT NOW() + interval '24 hours';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleId" VARCHAR,
ADD COLUMN     "provider" TEXT DEFAULT 'local',
ALTER COLUMN "password" DROP NOT NULL;
