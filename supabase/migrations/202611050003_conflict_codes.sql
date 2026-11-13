-- Phase 5B: application revision conflicts are HTTP 409 responses, not retryable
-- PostgreSQL serialization failures. Function behavior is otherwise unchanged.
begin;

create or replace function public.trugen_save_costing(p_id uuid, p_request_id uuid, p_expected_version integer, p_input jsonb) returns jsonb
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
      raise exception 'This costing changed elsewhere. Reopen the latest record before editing.' using errcode = 'PT409';
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

create or replace function public.trugen_delete_costing(p_id uuid, p_expected_version integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare old public.costings%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into old from public.costings where id = p_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Costing not found or unavailable.' using errcode = 'P0002'; end if;
  if p_expected_version is distinct from old.version then raise exception 'This costing changed elsewhere. Reload before deleting.' using errcode = 'PT409'; end if;
  delete from public.costings where id = p_id and owner_id = auth.uid();
  return true;
end $$;

revoke all on function public.trugen_save_costing(uuid, uuid, integer, jsonb),
  public.trugen_delete_costing(uuid, integer) from public, anon, authenticated;
grant execute on function public.trugen_save_costing(uuid, uuid, integer, jsonb),
  public.trugen_delete_costing(uuid, integer) to authenticated;

commit;
