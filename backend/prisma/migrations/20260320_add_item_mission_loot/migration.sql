ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "mission_id" UUID;
ALTER TABLE "items" ADD CONSTRAINT "items_mission_id_fkey"
  FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
