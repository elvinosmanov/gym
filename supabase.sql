-- FORGE · Supabase quraşdırması
-- Supabase Dashboard → SQL Editor → yapışdır → Run

-- 1) Cədvəl (əgər hələ yoxdursa)
create table if not exists public.forge_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) upsert-in işləməsi üçün unikal açar.
--    Bu olmadan hər cloudPush() YENİ sətir yaradır və
--    maybeSingle() ikinci sətirdən sonra xəta verir — sinxronizasiya səssizcə dayanır.
--    (Yuxarıdakı "primary key" bunu artıq təmin edir. Cədvəliniz köhnə sxemdədirsə:)
-- alter table public.forge_data add constraint forge_user_uniq unique (user_id);

-- 3) ƏN VACİBİ — Row Level Security.
--    Publishable açar kodda açıq görünür; bu normaldır, AMMA yalnız RLS varsa.
--    RLS-siz həmin açarla istənilən adam bütün istifadəçilərin qeydlərini oxuya və silə bilər.
alter table public.forge_data enable row level security;

drop policy if exists "own row" on public.forge_data;
create policy "own row" on public.forge_data
  for all
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) Yoxlama — RLS aktivdirmi?
--    rowsecurity sütunu true qaytarmalıdır.
select relname, relrowsecurity as rls_enabled
from pg_class
where relname = 'forge_data';

--    Siyasət yerindədirmi? Bir sətir qaytarmalıdır.
select policyname, cmd, roles
from pg_policies
where tablename = 'forge_data';

-- 5) Əlavə olaraq app özü də yoxlayır: daxil olduqdan sonra
--    öz sətrindən başqa bir şey görürsə, ekranda xəbərdarlıq çıxarır
--    (bax rlsSelfCheck()).
