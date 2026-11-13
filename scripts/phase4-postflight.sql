-- Read-only deployed-schema verification; never changes users or costing records.
select jsonb_build_object(
  'migration_versions', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'auth_user_count', (select count(*) from auth.users),
  'auth_users_fingerprint', (select md5(string_agg(id::text || coalesce(updated_at::text, ''), ',' order by id)) from auth.users),
  'tables', (
    select jsonb_agg(jsonb_build_object(
      'name', c.relname, 'rls_enabled', c.relrowsecurity,
      'constraints', (select jsonb_agg(jsonb_build_object(
        'name', k.conname, 'type', k.contype, 'validated', k.convalidated,
        'definition', pg_get_constraintdef(k.oid)
      ) order by k.conname) from pg_constraint k where k.conrelid = c.oid),
      'indexes', (select jsonb_agg(indexname order by indexname) from pg_indexes where schemaname = 'public' and tablename = c.relname),
      'privileges', (select jsonb_agg(jsonb_build_object(
        'role', r, 'select', has_table_privilege(r, c.oid, 'SELECT'),
        'insert', has_table_privilege(r, c.oid, 'INSERT'),
        'update', has_table_privilege(r, c.oid, 'UPDATE'),
        'delete', has_table_privilege(r, c.oid, 'DELETE'),
        'truncate', has_table_privilege(r, c.oid, 'TRUNCATE')
      )) from unnest(array['anon', 'authenticated']) r)
    ) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('costings', 'costing_ingredients') and c.relkind = 'r'
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'roles', roles, 'command', cmd,
      'using', qual, 'with_check', with_check
    ) order by tablename, policyname)
    from pg_policies where schemaname = 'public' and tablename in ('costings', 'costing_ingredients')
  ),
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef, 'settings', p.proconfig,
      'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) order by n.nspname, p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'trugen_private' or (n.nspname = 'public' and left(p.proname, 7) = 'trugen_')
  ),
  'private_schema_anon_usage', has_schema_privilege('anon', 'trugen_private', 'USAGE'),
  'private_schema_authenticated_usage', has_schema_privilege('authenticated', 'trugen_private', 'USAGE')
) as verification;
