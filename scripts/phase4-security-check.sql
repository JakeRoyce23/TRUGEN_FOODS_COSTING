-- Supplementary live PostgreSQL role/RLS test, NOT a Supabase Auth login test.
-- Uses two existing user IDs, creates only a new random verification costing,
-- and rolls the entire transaction back. Does not change Auth users.
-- Run only under the owner's authorization for live security verification.
begin;
do $verification$
declare
  owner_id uuid; other_id uuid; record_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid(); doc jsonb; replay jsonb;
  input jsonb := '{"foodName":"[Verification only] transaction rollback","servings":"10","markup":"35","rounding":"10","ingredients":[{"name":"Verification ingredient","purchasedQuantity":"1","purchaseUnit":"kg","purchasePrice":"1300","usedQuantity":"0.5","usageUnit":"kg"}]}';
  before_parent bigint; before_child bigint;
begin
  select id into owner_id from auth.users order by id limit 1;
  select id into other_id from auth.users order by id offset 1 limit 1;
  if owner_id is null or other_id is null or owner_id = other_id then
    raise exception 'Two existing distinct Auth users are required.';
  end if;
  select count(*) into before_parent from public.costings;
  select count(*) into before_child from public.costing_ingredients;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if auth.uid() is distinct from owner_id then raise exception 'Owner role context failed.'; end if;
  doc := public.trugen_save_costing(record_id, request_id, null, input);
  if doc->'summary' is distinct from jsonb_build_object(
    'totalCost', '650.00', 'calculatedProfit', '227.50', 'exactPrice', '877.50',
    'roundedPrice', '880.00', 'actualRoundedProfit', '230.00', 'costPerServing', '65.00',
    'exactPricePerServing', '87.75', 'roundedPricePerServing', '88.00'
  ) then raise exception 'Approved financial example failed.'; end if;
  replay := public.trugen_save_costing(record_id, request_id, null, input);
  if replay is distinct from doc then raise exception 'Idempotent retry failed.'; end if;
  if public.trugen_get_costing(record_id) is distinct from doc then raise exception 'Retrieval failed.'; end if;
  if not exists (select 1 from public.costings where id = record_id)
    or not exists (select 1 from public.costing_ingredients where costing_id = record_id) then
    raise exception 'Owner SELECT was not permitted.';
  end if;
  begin
    update public.costings set food_name = 'Must be denied' where id = record_id;
    raise exception 'Direct owner UPDATE unexpectedly allowed.';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.costing_ingredients where costing_id = record_id;
    raise exception 'Direct owner ingredient DELETE unexpectedly allowed.';
  exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub', other_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', other_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if auth.uid() is distinct from other_id then raise exception 'Other-account role context failed.'; end if;
  if exists (select 1 from public.costings where id = record_id)
    or exists (select 1 from public.costing_ingredients where costing_id = record_id) then
    raise exception 'Cross-account RLS leak.';
  end if;
  if exists (select 1 from jsonb_array_elements(public.trugen_list_costings('', 0)) x where x->>'id' = record_id::text) then
    raise exception 'Cross-account history leak.';
  end if;
  begin
    perform public.trugen_get_costing(record_id);
    raise exception 'Cross-account GET unexpectedly allowed.';
  exception when sqlstate 'P0002' then null; end;
  begin
    perform public.trugen_save_costing(record_id, gen_random_uuid(), 1, input);
    raise exception 'Cross-account SAVE unexpectedly allowed.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.trugen_delete_costing(record_id, 1);
    raise exception 'Cross-account DELETE unexpectedly allowed.';
  exception when sqlstate 'P0002' then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  begin
    perform id from public.costings limit 1;
    raise exception 'Anonymous SELECT unexpectedly allowed.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.trugen_list_costings('', 0);
    raise exception 'Anonymous RPC unexpectedly allowed.';
  exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  input := jsonb_set(input, '{ingredients,0,usedQuantity}', '"0.25"');
  doc := public.trugen_save_costing(record_id, gen_random_uuid(), 1, input);
  if doc->>'version' <> '2' or doc#>>'{summary,totalCost}' <> '325.00'
    or doc#>>'{summary,exactPrice}' <> '438.75' or doc#>>'{summary,roundedPrice}' <> '440.00'
    or doc#>>'{summary,actualRoundedProfit}' <> '115.00' then
    raise exception 'Edit/recalculation failed.';
  end if;
  begin
    perform public.trugen_save_costing(record_id, gen_random_uuid(), 1, input);
    raise exception 'Stale edit unexpectedly allowed.';
  exception when serialization_failure then null; end;
  if public.trugen_get_costing(record_id) is distinct from doc then raise exception 'Edited retrieval failed.'; end if;
  if public.trugen_delete_costing(record_id, 2) is distinct from true then raise exception 'Delete failed.'; end if;
  if exists (select 1 from public.costings where id = record_id)
    or exists (select 1 from public.costing_ingredients where costing_id = record_id) then
    raise exception 'Delete cascade failed.';
  end if;
  reset role;
  if (select count(*) from public.costings) <> before_parent
    or (select count(*) from public.costing_ingredients) <> before_child then
    raise exception 'Verification changed existing record counts.';
  end if;
end
$verification$;
rollback;
