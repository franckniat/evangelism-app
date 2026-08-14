-- =============================================================================
-- Moisson — schéma multi-tenant (groupes / équipes d'évangélistes)
--
-- Principes de sécurité appliqués :
--  * RLS activée sur TOUTES les tables du schéma public.
--  * Les fonctions SECURITY DEFINER vivent dans le schéma privé `private`,
--    non exposé à la Data API, avec `set search_path = ''` (anti-hijacking).
--  * Les policies ciblent `TO authenticated` ET portent un prédicat
--    d'appartenance au groupe (le rôle seul ne suffit pas).
--  * Les policies UPDATE définissent USING *et* WITH CHECK.
--  * GRANT explicites : depuis 2026-04-28 les nouvelles tables du schéma
--    public ne sont plus exposées automatiquement à la Data API.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Schéma privé (helpers non exposés)
-- -----------------------------------------------------------------------------
create schema if not exists private;

-- `private` n'est jamais listé dans les « Exposed schemas » : PostgREST n'y
-- publie donc aucun endpoint. En revanche `authenticated` a besoin de USAGE,
-- car une policy RLS est évaluée avec les droits de l'utilisateur courant :
-- sans ce GRANT, toutes les requêtes échoueraient sur « permission denied ».
revoke all on schema private from anon;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Types
-- -----------------------------------------------------------------------------
create type public.group_role     as enum ('owner', 'admin', 'member');
create type public.convert_status as enum ('sauve', 'nonsauve', 'sceptique', 'reflexion', 'baptise');
create type public.sexe           as enum ('H', 'F');

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- Profil applicatif, en 1-1 avec auth.users
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text        not null default '',
  church     text        not null default '',
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Groupes (équipes)
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(trim(name)) > 0),
  description text        not null default '',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Appartenance à un groupe
create table public.group_members (
  group_id  uuid              not null references public.groups (id)   on delete cascade,
  user_id   uuid              not null references public.profiles (id) on delete cascade,
  role      public.group_role not null default 'member',
  joined_at timestamptz       not null default now(),
  primary key (group_id, user_id)
);

-- Codes / liens d'invitation
create table public.group_invites (
  code       text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  group_id   uuid              not null references public.groups (id)   on delete cascade,
  role       public.group_role not null default 'member',
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  max_uses   integer check (max_uses is null or max_uses > 0),
  uses       integer     not null default 0,
  revoked    boolean     not null default false,
  created_at timestamptz not null default now()
);

-- Secteurs d'évangélisation (cloisonnés par groupe)
create table public.sectors (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups (id) on delete cascade,
  name       text        not null check (length(trim(name)) > 0),
  ville      text        not null default '',
  pays       text        not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

-- Convertis (cloisonnés par groupe)
create table public.converts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid                  not null references public.groups (id)  on delete cascade,
  sector_id   uuid references public.sectors (id) on delete set null,
  prenom      text                  not null check (length(trim(prenom)) > 0),
  nom         text                  not null check (length(trim(nom)) > 0),
  tel         text                  not null default '',
  sexe        public.sexe           not null default 'H',
  statut      public.convert_status not null default 'reflexion',
  next_visit  date,
  done        boolean               not null default false,
  notes       text                  not null default '',
  created_by  uuid references public.profiles (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at  timestamptz           not null default now(),
  updated_at  timestamptz           not null default now()
);

-- Historique de suivi.
-- `group_id` est dénormalisé volontairement : la policy RLS reste simple et
-- rapide (pas de sous-requête vers `converts`).
create table public.convert_history (
  id          uuid primary key default gen_random_uuid(),
  convert_id  uuid        not null references public.converts (id) on delete cascade,
  group_id    uuid        not null references public.groups (id)   on delete cascade,
  text        text        not null,
  occurred_on date        not null default current_date,
  author_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Index
-- -----------------------------------------------------------------------------
create index group_members_user_idx      on public.group_members (user_id);
create index group_invites_group_idx     on public.group_invites (group_id);
create index sectors_group_idx           on public.sectors (group_id);
create index converts_group_idx          on public.converts (group_id);
create index converts_group_visit_idx    on public.converts (group_id, next_visit);
create index converts_sector_idx         on public.converts (sector_id);
create index convert_history_convert_idx on public.convert_history (convert_id);
create index convert_history_group_idx   on public.convert_history (group_id);

-- -----------------------------------------------------------------------------
-- 4. Helpers SECURITY DEFINER (schéma privé, non exposé)
--    Ils contournent volontairement la RLS pour éviter la récursion infinie
--    des policies qui interrogent `group_members`.
-- -----------------------------------------------------------------------------

create or replace function private.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_admin(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function private.is_group_owner(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- Deux utilisateurs partagent-ils au moins un groupe ? (visibilité des profils)
create or replace function private.shares_group_with(target uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = (select auth.uid()) and b.user_id = target
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. Triggers
-- -----------------------------------------------------------------------------

-- Création automatique du profil à l'inscription.
-- `raw_user_meta_data` sert uniquement à pré-remplir l'affichage,
-- jamais à une décision d'autorisation.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, church, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'church', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Le créateur d'un groupe en devient automatiquement propriétaire.
-- SECURITY DEFINER car la policy d'insert sur group_members exige déjà
-- d'être admin — ce qui est impossible au moment de la création.
create or replace function private.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, coalesce(new.created_by, (select auth.uid())), 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_group_created
after insert on public.groups
for each row execute function private.handle_new_group();

-- updated_at automatique
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger converts_touch_updated_at
before update on public.converts
for each row execute function private.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.group_invites   enable row level security;
alter table public.sectors         enable row level security;
alter table public.converts        enable row level security;
alter table public.convert_history enable row level security;

-- --- profiles ---------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_group_with(id));

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- --- groups -----------------------------------------------------------------
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (private.is_group_member(id));

create policy "groups_insert_self" on public.groups
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "groups_update_admin" on public.groups
  for update to authenticated
  using (private.is_group_admin(id))
  with check (private.is_group_admin(id));

create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (private.is_group_owner(id));

-- --- group_members ----------------------------------------------------------
create policy "members_select" on public.group_members
  for select to authenticated
  using (private.is_group_member(group_id));

create policy "members_insert_admin" on public.group_members
  for insert to authenticated
  with check (private.is_group_admin(group_id));

create policy "members_update_admin" on public.group_members
  for update to authenticated
  using (private.is_group_admin(group_id))
  with check (private.is_group_admin(group_id));

-- Quitter le groupe soi-même, ou exclusion par un admin
create policy "members_delete_self_or_admin" on public.group_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

-- --- group_invites ----------------------------------------------------------
create policy "invites_select_member" on public.group_invites
  for select to authenticated
  using (private.is_group_member(group_id));

create policy "invites_insert_admin" on public.group_invites
  for insert to authenticated
  with check (private.is_group_admin(group_id));

create policy "invites_update_admin" on public.group_invites
  for update to authenticated
  using (private.is_group_admin(group_id))
  with check (private.is_group_admin(group_id));

create policy "invites_delete_admin" on public.group_invites
  for delete to authenticated
  using (private.is_group_admin(group_id));

-- --- sectors ----------------------------------------------------------------
create policy "sectors_select" on public.sectors
  for select to authenticated using (private.is_group_member(group_id));

create policy "sectors_insert" on public.sectors
  for insert to authenticated with check (private.is_group_member(group_id));

create policy "sectors_update" on public.sectors
  for update to authenticated
  using (private.is_group_member(group_id))
  with check (private.is_group_member(group_id));

create policy "sectors_delete" on public.sectors
  for delete to authenticated using (private.is_group_member(group_id));

-- --- converts ---------------------------------------------------------------
create policy "converts_select" on public.converts
  for select to authenticated using (private.is_group_member(group_id));

create policy "converts_insert" on public.converts
  for insert to authenticated with check (private.is_group_member(group_id));

create policy "converts_update" on public.converts
  for update to authenticated
  using (private.is_group_member(group_id))
  with check (private.is_group_member(group_id));

create policy "converts_delete" on public.converts
  for delete to authenticated using (private.is_group_member(group_id));

-- --- convert_history --------------------------------------------------------
create policy "history_select" on public.convert_history
  for select to authenticated using (private.is_group_member(group_id));

create policy "history_insert" on public.convert_history
  for insert to authenticated with check (private.is_group_member(group_id));

create policy "history_update" on public.convert_history
  for update to authenticated
  using (private.is_group_member(group_id))
  with check (private.is_group_member(group_id));

create policy "history_delete" on public.convert_history
  for delete to authenticated using (private.is_group_member(group_id));

-- -----------------------------------------------------------------------------
-- 7. RPC : rejoindre un groupe via un code d'invitation
--    Exposée dans le schéma public car appelée par un NON-membre, qui ne peut
--    donc pas lire `group_invites` sous RLS. Contrôle explicite de auth.uid()
--    dans le corps + EXECUTE réservé aux utilisateurs authentifiés.
-- -----------------------------------------------------------------------------
create or replace function public.redeem_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites%rowtype;
  v_uid    uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_invite
  from public.group_invites
  where code = upper(trim(invite_code))
  for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_invite.revoked then
    raise exception 'INVITE_REVOKED' using errcode = 'P0001';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'INVITE_EXHAUSTED' using errcode = 'P0001';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, v_uid, v_invite.role)
  on conflict (group_id, user_id) do nothing;

  -- N'incrémente le compteur que si l'utilisateur vient réellement d'être ajouté
  if found then
    update public.group_invites set uses = uses + 1 where code = v_invite.code;
  end if;

  return v_invite.group_id;
end;
$$;

revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- Aperçu d'une invitation (nom du groupe avant de rejoindre)
create or replace function public.invite_preview(invite_code text)
returns table (group_name text, valid boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites%rowtype;
begin
  select * into v_invite from public.group_invites where code = upper(trim(invite_code));
  if not found then
    return query select null::text, false;
    return;
  end if;

  return query
  select g.name,
         (not v_invite.revoked)
           and (v_invite.expires_at is null or v_invite.expires_at >= now())
           and (v_invite.max_uses is null or v_invite.uses < v_invite.max_uses)
  from public.groups g
  where g.id = v_invite.group_id;
end;
$$;

revoke all on function public.invite_preview(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. GRANT explicites (obligatoires : plus d'exposition automatique)
--    Rien n'est accordé à `anon` : toute l'application requiert un compte.
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;

-- Helpers RLS : appelés depuis les policies, donc EXECUTE requis.
-- `anon` n'a pas USAGE sur le schéma `private` et ne peut donc pas les appeler.
grant execute on function
  private.is_group_member(uuid),
  private.is_group_admin(uuid),
  private.is_group_owner(uuid),
  private.shares_group_with(uuid)
to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.groups,
  public.group_members,
  public.group_invites,
  public.sectors,
  public.converts,
  public.convert_history
to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Realtime : suivre les modifications des coéquipiers
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.converts;
alter publication supabase_realtime add table public.sectors;
alter publication supabase_realtime add table public.group_members;
