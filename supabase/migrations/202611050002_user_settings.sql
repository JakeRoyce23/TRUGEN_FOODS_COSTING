-- Phase 5A: private per-owner defaults for future costings.
-- This migration is additive and does not alter existing costing records or calculations.
begin;

create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  default_markup_pct numeric not null default 35
    check (default_markup_pct >= 0 and scale(default_markup_pct) <= 2
      and default_markup_pct::text not in ('NaN', 'Infinity', '-Infinity')),
  rounding_step text not null default 'none'
    check (rounding_step in ('none', '5', '10')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy user_settings_owner_select on public.user_settings
  for select to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.user_settings from public, anon, authenticated;
grant select on public.user_settings to authenticated;

create function public.trugen_get_user_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'defaultMarkup', s.default_markup_pct::text,
    'rounding', s.rounding_step,
    'updatedAt', s.updated_at
  ) into result
  from public.user_settings s where s.owner_id = actor;
  return coalesce(result, jsonb_build_object(
    'defaultMarkup', '35',
    'rounding', 'none',
    'updatedAt', null
  ));
end $$;

create function public.trugen_save_user_settings(p_default_markup text, p_rounding text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  markup_value numeric;
  saved public.user_settings%rowtype;
begin
  if actor is null then
    raise exception 'Sign in to continue.' using errcode = '42501';
  end if;
  markup_value := trugen_private.decimal_input(to_jsonb(p_default_markup), 2, false);
  if p_rounding is null or p_rounding not in ('none', '5', '10') then
    raise exception 'Select no rounding, 5, or 10.' using errcode = '22023';
  end if;

  insert into public.user_settings(owner_id, default_markup_pct, rounding_step, updated_at)
  values (actor, markup_value, p_rounding, now())
  on conflict (owner_id) do update set
    default_markup_pct = excluded.default_markup_pct,
    rounding_step = excluded.rounding_step,
    updated_at = excluded.updated_at
  returning * into saved;

  return jsonb_build_object(
    'defaultMarkup', saved.default_markup_pct::text,
    'rounding', saved.rounding_step,
    'updatedAt', saved.updated_at
  );
end $$;

revoke all on function public.trugen_get_user_settings(),
  public.trugen_save_user_settings(text, text) from public, anon, authenticated;
grant execute on function public.trugen_get_user_settings(),
  public.trugen_save_user_settings(text, text) to authenticated;

commit;
