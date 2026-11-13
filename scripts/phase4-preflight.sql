-- Metadata only; run with Supabase CLI db query --read-only.
-- This does not create, replace, update, or delete database objects or records.
-- Confirm the explicit CLI target is jueboylmczhlkrjtdjva before execution.
select jsonb_build_object(
  'database', current_database(),
  'server_version', current_setting('server_version'),
  'private_schema_exists', exists (
    select 1 from pg_namespace where nspname = 'trugen_private'
  ),
  'auth_users_exists', to_regclass('auth.users') is not null,
  'auth_uid_exists', to_regprocedure('auth.uid()') is not null,
  'migration_history_exists', to_regclass('supabase_migrations.schema_migrations') is not null,
  'required_roles', (
    select coalesce(jsonb_agg(rolname order by rolname), '[]'::jsonb)
    from pg_roles where rolname in ('anon', 'authenticated')
  ),
  'public_relations', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity
    ) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'i', 'S')
  ),
  'existing_application_functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid)
    ) order by n.nspname, p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'trugen_private'
      or (n.nspname = 'public' and left(p.proname, 7) = 'trugen_')
  ),
  'existing_application_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'policy', policyname,
      'roles', roles, 'command', cmd, 'using', qual, 'with_check', with_check
    ) order by schemaname, tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname in ('public', 'trugen_private')
  ),
  'enabled_ddl_event_triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', evtname, 'event', evtevent, 'function', evtfoid::regprocedure::text
    ) order by evtname), '[]'::jsonb)
    from pg_event_trigger where evtenabled <> 'D'
  )
) as preflight;
