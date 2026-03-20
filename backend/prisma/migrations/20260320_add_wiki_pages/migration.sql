CREATE TABLE IF NOT EXISTS "wiki_pages" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "parent_id"   UUID,
  "title"       TEXT NOT NULL DEFAULT 'Untitled',
  "content"     TEXT DEFAULT '',
  "icon"        TEXT DEFAULT '📄',
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wiki_pages_campaign_id_fkey" FOREIGN KEY ("campaign_id")
    REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wiki_pages_parent_id_fkey" FOREIGN KEY ("parent_id")
    REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
