ALTER TABLE "users"
ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users"
ADD CONSTRAINT "users_auth_version_nonnegative_check"
CHECK ("auth_version" >= 0);
