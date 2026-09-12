-- DropIndex
DROP INDEX "refresh_tokens_user_id_idx";

-- AlterTable: add the family as nullable, backfill existing sessions, then harden it.
ALTER TABLE "refresh_tokens"
ADD COLUMN "family_id" UUID,
ADD COLUMN "is_persistent" BOOLEAN NOT NULL DEFAULT false;

UPDATE "refresh_tokens"
SET "family_id" = "id"
WHERE "family_id" IS NULL;

ALTER TABLE "refresh_tokens"
ALTER COLUMN "family_id" SET NOT NULL;

-- CheckConstraint: all application emails must use the canonical storage form.
ALTER TABLE "users"
ADD CONSTRAINT "users_email_canonical_check"
CHECK ("email" = lower(btrim("email")));

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_revoked_at_idx" ON "refresh_tokens"("family_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
