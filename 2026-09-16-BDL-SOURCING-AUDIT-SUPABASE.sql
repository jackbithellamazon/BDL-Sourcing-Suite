-- ============================================================================
--  BDL SOURCING · STOREFRONT AUDIT           run once, in the Supabase SQL editor
--  Project: the shared BDL project (the same one the Sourcing app already uses)
--
--  SAFE: CREATE-only. Nothing existing is touched, altered or deleted.
--  Running it twice is harmless.
--
--  Until this is run, the audit page still works — every answer is saved in the
--  browser and sends itself the moment these tables exist. Nothing is lost.
-- ============================================================================

-- ── 1. THE ANSWERS ─────────────────────────────────────────────────────────
--  One row per answer. An answer belongs to the PRODUCT, not the shelf, so
--  judging something on one rival's shelf counts on every other rival's too.
--  History is kept: a correction within 15 minutes overwrites the same id,
--  anything later writes a new row, so "Not lead in June, Discord in September"
--  is still readable.
create table if not exists src_audit_verdicts (
  id          text primary key,             -- asin|who|timestamp36
  asin        text not null,
  domain      smallint not null default 2,  -- 2 = amazon.co.uk
  verdict     text not null,                -- not | unsure | discord | ws | joint | missed
  reason      text default '',              -- why it was missed: out of stock, passed on it…
  note        text default '',
  seller_id   text default '',              -- whose shelf it was judged on
  who         text default '',
  at          timestamptz not null default now(),
  expires_at  timestamptz                   -- null = stands until it is judged again
);
alter table src_audit_verdicts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='src_audit_verdicts' and policyname='allow all') then
    create policy "allow all" on src_audit_verdicts for all using (true) with check (true);
  end if;
end $$;
create index if not exists sav_asin_idx   on src_audit_verdicts (asin, at desc);
create index if not exists sav_seller_idx on src_audit_verdicts (seller_id);

-- the current answer for each product: the newest row wins
create or replace view src_audit_current as
  select distinct on (asin) *
  from src_audit_verdicts
  order by asin, at desc;
grant select on src_audit_current to anon, authenticated;

-- ── 2. PRODUCT DETAILS CACHE ───────────────────────────────────────────────
--  Title, picture, price and rank, so the same product is never paid for twice.
--  Filled free from a Keepa export, or from the API at about 1 token each.
create table if not exists src_products (
  asin        text primary key,
  domain      smallint not null default 2,
  title       text,
  brand       text,
  image       text,
  price       numeric,
  rank        integer,
  root        text,
  mo          integer,        -- bought in the past month
  fba         integer,        -- FBA offers
  source      text,           -- export | keepa
  fetched_at  timestamptz default now()
);
alter table src_products enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='src_products' and policyname='allow all') then
    create policy "allow all" on src_products for all using (true) with check (true);
  end if;
end $$;

-- ── 3. SHELVES WE FETCHED OURSELVES ────────────────────────────────────────
--  OA Overview already saves the 39 rivals (bdl_competitor_shelf) and the audit
--  reads those directly. This table is only for a seller pulled on demand, or a
--  pasted list of ASINs, so everyone sees the same list.
create table if not exists src_audit_shelves (
  seller_id   text primary key,
  name        text,
  kind        text default 'pulled',   -- pulled | list
  asins       jsonb not null default '[]'::jsonb,
  pulled_at   timestamptz default now(),
  pulled_by   text
);
alter table src_audit_shelves enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='src_audit_shelves' and policyname='allow all') then
    create policy "allow all" on src_audit_shelves for all using (true) with check (true);
  end if;
end $$;

-- ── DONE · quick check ─────────────────────────────────────────────────────
select 'answers'  as table, count(*) from src_audit_verdicts
union all select 'products', count(*) from src_products
union all select 'shelves',  count(*) from src_audit_shelves;

-- ============================================================================
--  SIZE, for the record: one answer is about 200 bytes. Judging all 8,511
--  products on the 39 rival shelves is roughly 2 MB. The picture cache is about
--  0.3 KB a product, so under 3 MB for the lot. Nothing is snapshotted daily.
-- ============================================================================
