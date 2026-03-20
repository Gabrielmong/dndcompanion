ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "content" TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS "mission_maps" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "mission_id" UUID NOT NULL,
  "name"       TEXT NOT NULL DEFAULT 'Map',
  "url"        TEXT NOT NULL,
  "key"        TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mission_maps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mission_maps_mission_id_fkey" FOREIGN KEY ("mission_id")
    REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
