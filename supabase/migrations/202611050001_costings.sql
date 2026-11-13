-- Reviewed design: docs/PHASE4_DATABASE_REVIEW.md. Apply once to the intended project.
-- No existing application objects are dropped or replaced.
begin;

create schema trugen_private;
revoke all on schema trugen_private from public, anon, authenticated;

-- Nonnegative rational rounding to an integer; avoids approximate division at a tie.
create function trugen_private.half_up(n numeric, d numeric) returns numeric
language sql immutable strict set search_path = '' as $$
  select div(2 * n + d, 2 * d)
$$;

create function trugen_private.money_text(c numeric) returns text
language sql immutable strict set search_path = '' as $$
  select div(c, 100)::text || '.' || lpad(trunc(mod(c, 100))::text, 2, '0')
$$;

create function trugen_private.decimal_input(v jsonb, places integer, positive boolean) returns numeric
language plpgsql immutable set search_path = '' as $$
declare s text; n numeric;
begin
  if v is null or jsonb_typeof(v) <> 'string' then
    raise exception 'Enter numeric values as decimal strings.' using errcode = '22023';
  end if;
  s := btrim(v #>> '{}');
  if s !~ '^([0-9]+(\.[0-9]*)?|\.[0-9]+)$' or length(split_part(s, '.', 2)) > places then
    raise exception 'Invalid number or excess decimal precision.' using errcode = '22023';
  end if;
  n := s::numeric;
  if n < 0 or (positive and n = 0) then
    raise exception 'Quantities must be positive; prices and markup may be zero.' using errcode = '22023';
  end if;
  return n;
end $$;

create function trugen_private.unit_factor(u text) returns numeric
language sql immutable strict set search_path = '' as $$
  select case when u in ('kg', 'L') then 1000::numeric when u in ('g', 'mL', 'pcs') then 1::numeric end
$$;
create function trugen_private.unit_category(u text) returns text
language sql immutable strict set search_path = '' as $$
  select case when u in ('kg', 'g') then 'mass' when u in ('L', 'mL') then 'volume' when u = 'pcs' then 'count' end
$$;

create table public.costings (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  food_name text not null check (length(btrim(food_name)) > 0),
  servings numeric not null check (servings > 0 and servings = trunc(servings) and servings::text not in ('NaN', 'Infinity', '-Infinity')),
  markup_pct numeric not null check (markup_pct >= 0 and scale(markup_pct) <= 2 and markup_pct::text not in ('NaN', 'Infinity', '-Infinity')),
  rounding_step text not null check (rounding_step in ('none', '5', '10')),
  total_cost_centavos numeric not null check (total_cost_centavos >= 0 and total_cost_centavos = trunc(total_cost_centavos) and total_cost_centavos::text not in ('NaN', 'Infinity', '-Infinity')),
  profit_centavos numeric not null,
  exact_price_centavos numeric not null,
  rounded_price_centavos numeric,
  actual_rounded_profit_centavos numeric,
  cost_per_serving_centavos numeric not null,
  exact_per_serving_centavos numeric not null,
  rounded_per_serving_centavos numeric,
  version integer not null default 1 check (version > 0),
  last_request_id uuid not null,
  input_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (profit_centavos = trugen_private.half_up(total_cost_centavos * markup_pct, 100)),
  check (exact_price_centavos = total_cost_centavos + profit_centavos),
  check (cost_per_serving_centavos = trugen_private.half_up(total_cost_centavos, servings)),
  check (exact_per_serving_centavos = trugen_private.half_up(exact_price_centavos, servings)),
  check (
    (rounding_step = 'none' and rounded_price_centavos is null and actual_rounded_profit_centavos is null and rounded_per_serving_centavos is null)
    or (rounding_step <> 'none' and rounded_price_centavos is not null and actual_rounded_profit_centavos is not null and rounded_per_serving_centavos is not null
      and rounded_price_centavos = div(exact_price_centavos + rounding_step::numeric * 100 - 1, rounding_step::numeric * 100) * rounding_step::numeric * 100
      and actual_rounded_profit_centavos = rounded_price_centavos - total_cost_centavos
      and rounded_per_serving_centavos = trugen_private.half_up(rounded_price_centavos, servings))
  )
);

create table public.costing_ingredients (
  id uuid primary key default gen_random_uuid(),
  costing_id uuid not null references public.costings(id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  ingredient_name text not null check (length(btrim(ingredient_name)) > 0),
  purchased_qty numeric not null check (purchased_qty > 0 and scale(purchased_qty) <= 6 and purchased_qty::text not in ('NaN', 'Infinity', '-Infinity')),
  purchase_unit text not null check (purchase_unit in ('kg', 'g', 'L', 'mL', 'pcs')),
  purchase_price_centavos numeric not null check (purchase_price_centavos >= 0 and purchase_price_centavos = trunc(purchase_price_centavos) and purchase_price_centavos::text not in ('NaN', 'Infinity', '-Infinity')),
  used_qty numeric not null check (used_qty > 0 and scale(used_qty) <= 6 and used_qty::text not in ('NaN', 'Infinity', '-Infinity')),
  usage_unit text not null check (usage_unit in ('kg', 'g', 'L', 'mL', 'pcs')),
  line_cost_centavos numeric not null,
  unique (costing_id, sort_order),
  check (trugen_private.unit_category(purchase_unit) = trugen_private.unit_category(usage_unit)),
  check (used_qty * trugen_private.unit_factor(usage_unit) <= purchased_qty * trugen_private.unit_factor(purchase_unit)),
  check (line_cost_centavos = trugen_private.half_up(purchase_price_centavos * used_qty * trugen_private.unit_factor(usage_unit), purchased_qty * trugen_private.unit_factor(purchase_unit)))
);

create index costings_owner_created_idx on public.costings(owner_id, created_at desc, id desc);
-- The unique (costing_id, sort_order) index also supports parent lookups/cascades.

alter table public.costings enable row level security;
alter table public.costing_ingredients enable row level security;
create policy costings_owner on public.costings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ingredients_owner on public.costing_ingredients for all to authenticated
  using (exists (select 1 from public.costings c where c.id = costing_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.costings c where c.id = costing_id and c.owner_id = (select auth.uid())));
revoke all on public.costings, public.costing_ingredients from public, anon, authenticated;
grant select on public.costings, public.costing_ingredients to authenticated;

create function trugen_private.document(p_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'foodName', c.food_name, 'servings', c.servings::text,
    'markup', c.markup_pct::text, 'rounding', c.rounding_step,
    'version', c.version, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'ingredients', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'name', i.ingredient_name, 'purchasedQuantity', i.purchased_qty::text,
      'purchaseUnit', i.purchase_unit, 'purchasePrice', trugen_private.money_text(i.purchase_price_centavos),
      'usedQuantity', i.used_qty::text, 'usageUnit', i.usage_unit,
      'cost', trugen_private.money_text(i.line_cost_centavos)
    ) order by i.sort_order), '[]'::jsonb) from public.costing_ingredients i where i.costing_id = c.id),
    'summary', jsonb_build_object(
      'totalCost', trugen_private.money_text(c.total_cost_centavos),
      'calculatedProfit', trugen_private.money_text(c.profit_centavos),
      'exactPrice', trugen_private.money_text(c.exact_price_centavos),
      'roundedPrice', trugen_private.money_text(c.rounded_price_centavos),
      'actualRoundedProfit', trugen_private.money_text(c.actual_rounded_profit_centavos),
      'costPerServing', trugen_private.money_text(c.cost_per_serving_centavos),
      'exactPricePerServing', trugen_private.money_text(c.exact_per_serving_centavos),
      'roundedPricePerServing', trugen_private.money_text(c.rounded_per_serving_centavos)
    )
  ) from public.costings c where c.id = p_id and c.owner_id = auth.uid()
$$;

create function public.trugen_get_costing(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  result := trugen_private.document(p_id);
  if result is null then raise exception 'Costing not found or unavailable.' using errcode = 'P0002'; end if;
  return result;
end $$;

create function public.trugen_list_costings(p_search text default '', p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  if p_offset is null or p_offset < 0 then raise exception 'Invalid page.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(trugen_private.document(c.id) order by c.created_at desc, c.id desc), '[]'::jsonb) into result
  from (select id, created_at from public.costings where owner_id = auth.uid()
    and strpos(lower(food_name), lower(btrim(coalesce(p_search, '')))) > 0
    order by created_at desc, id desc limit 50 offset p_offset) c;
  return result;
end $$;

create function public.trugen_save_costing(p_id uuid, p_request_id uuid, p_expected_version integer, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); old public.costings%rowtype; existing boolean;
  food text; servings_value numeric; markup_value numeric; step text;
  item jsonb; items jsonb := '[]'::jsonb; n integer := 0; ingredient_name text;
  purchased numeric; used numeric; price numeric; pu text; uu text; line numeric;
  total numeric := 0; profit numeric; exact numeric; rounded numeric; new_version integer;
begin
  if actor is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  if p_id is null or p_request_id is null or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception 'Invalid save request.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into old from public.costings where id = p_id for update;
  existing := found;
  if existing then
    if old.owner_id <> actor then raise exception 'Costing not found or unavailable.' using errcode = '42501'; end if;
    if old.last_request_id = p_request_id then
      if old.input_snapshot <> p_input then raise exception 'A save request cannot be reused for changed data.' using errcode = '22023'; end if;
      return trugen_private.document(p_id);
    end if;
    if p_expected_version is distinct from old.version then
      raise exception 'This costing changed elsewhere. Reopen the latest record before editing.' using errcode = '40001';
    end if;
  elsif p_expected_version is not null then
    raise exception 'Costing not found or unavailable.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_input->'foodName') is distinct from 'string' or length(btrim(p_input->>'foodName')) = 0 then
    raise exception 'Enter a food or order name.' using errcode = '22023';
  end if;
  food := btrim(p_input->>'foodName');
  if jsonb_typeof(p_input->'servings') is distinct from 'string' or btrim(p_input->>'servings') !~ '^[0-9]+(\.0*)?$' then
    raise exception 'Enter positive whole-number servings.' using errcode = '22023';
  end if;
  servings_value := (p_input->>'servings')::numeric;
  if servings_value <= 0 then raise exception 'Enter positive whole-number servings.' using errcode = '22023'; end if;
  markup_value := trugen_private.decimal_input(p_input->'markup', 2, false);
  step := p_input->>'rounding';
  if step is null or step not in ('none', '5', '10') then raise exception 'Select no rounding, 5, or 10.' using errcode = '22023'; end if;
  if jsonb_typeof(p_input->'ingredients') is distinct from 'array' then raise exception 'Add ingredients.' using errcode = '22023'; end if;
  if jsonb_array_length(p_input->'ingredients') = 0 then raise exception 'Add at least one ingredient.' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(p_input->'ingredients') loop
    if jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) = 0 then
      raise exception 'Enter an ingredient name.' using errcode = '22023';
    end if;
    ingredient_name := btrim(item->>'name');
    purchased := trugen_private.decimal_input(item->'purchasedQuantity', 6, true);
    used := trugen_private.decimal_input(item->'usedQuantity', 6, true);
    price := trunc(trugen_private.decimal_input(item->'purchasePrice', 2, false) * 100);
    pu := item->>'purchaseUnit'; uu := item->>'usageUnit';
    if trugen_private.unit_category(pu) is null or trugen_private.unit_category(uu) is null
      or trugen_private.unit_category(pu) <> trugen_private.unit_category(uu) then
      raise exception 'Choose compatible units: kg/g, L/mL, or pcs/pcs.' using errcode = '22023';
    end if;
    if used * trugen_private.unit_factor(uu) > purchased * trugen_private.unit_factor(pu) then
      raise exception 'Usage cannot exceed the purchased quantity.' using errcode = '22023';
    end if;
    line := trugen_private.half_up(price * used * trugen_private.unit_factor(uu), purchased * trugen_private.unit_factor(pu));
    total := total + line;
    items := items || jsonb_build_array(jsonb_build_object('name', ingredient_name, 'purchased', purchased, 'used', used,
      'price', price, 'pu', pu, 'uu', uu, 'line', line, 'position', n));
    n := n + 1;
  end loop;
  profit := trugen_private.half_up(total * markup_value, 100);
  exact := total + profit;
  if step <> 'none' then rounded := div(exact + step::numeric * 100 - 1, step::numeric * 100) * step::numeric * 100; end if;
  new_version := case when existing then old.version + 1 else 1 end;

  insert into public.costings(id, owner_id, food_name, servings, markup_pct, rounding_step,
    total_cost_centavos, profit_centavos, exact_price_centavos, rounded_price_centavos, actual_rounded_profit_centavos,
    cost_per_serving_centavos, exact_per_serving_centavos, rounded_per_serving_centavos, version, last_request_id, input_snapshot)
  values (p_id, actor, food, servings_value, markup_value, step, total, profit, exact, rounded, rounded - total,
    trugen_private.half_up(total, servings_value), trugen_private.half_up(exact, servings_value),
    trugen_private.half_up(rounded, servings_value), new_version, p_request_id, p_input)
  on conflict (id) do update set food_name = excluded.food_name, servings = excluded.servings, markup_pct = excluded.markup_pct,
    rounding_step = excluded.rounding_step, total_cost_centavos = excluded.total_cost_centavos, profit_centavos = excluded.profit_centavos,
    exact_price_centavos = excluded.exact_price_centavos, rounded_price_centavos = excluded.rounded_price_centavos,
    actual_rounded_profit_centavos = excluded.actual_rounded_profit_centavos, cost_per_serving_centavos = excluded.cost_per_serving_centavos,
    exact_per_serving_centavos = excluded.exact_per_serving_centavos, rounded_per_serving_centavos = excluded.rounded_per_serving_centavos,
    version = excluded.version, last_request_id = excluded.last_request_id, input_snapshot = excluded.input_snapshot, updated_at = clock_timestamp();
  delete from public.costing_ingredients where costing_id = p_id;
  insert into public.costing_ingredients(costing_id, sort_order, ingredient_name, purchased_qty, purchase_unit, purchase_price_centavos, used_qty, usage_unit, line_cost_centavos)
  select p_id, (v->>'position')::integer, v->>'name', (v->>'purchased')::numeric, v->>'pu', (v->>'price')::numeric, (v->>'used')::numeric, v->>'uu', (v->>'line')::numeric
  from jsonb_array_elements(items) v;
  return trugen_private.document(p_id);
end $$;

create function public.trugen_delete_costing(p_id uuid, p_expected_version integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare old public.costings%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into old from public.costings where id = p_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Costing not found or unavailable.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from old.version then raise exception 'This costing changed elsewhere. Reload before deleting.' using errcode = '40001'; end if;
  delete from public.costings where id = p_id and owner_id = auth.uid();
  return true;
end $$;

revoke all on all functions in schema trugen_private from public, anon, authenticated;
revoke all on function public.trugen_get_costing(uuid), public.trugen_list_costings(text, integer),
  public.trugen_save_costing(uuid, uuid, integer, jsonb), public.trugen_delete_costing(uuid, integer) from public, anon, authenticated;
grant execute on function public.trugen_get_costing(uuid), public.trugen_list_costings(text, integer),
  public.trugen_save_costing(uuid, uuid, integer, jsonb), public.trugen_delete_costing(uuid, integer) to authenticated;

commit;
