-- 280_run_safe_query.sql
-- See live migration in Supabase for full body.
-- run_safe_query(p_sql text) RETURNS jsonb — execute a read-only SQL string
-- and return up to 500 rows as jsonb.  Single statement, SELECT/WITH only,
-- standalone-keyword blacklist (INSERT/UPDATE/DELETE/DROP/etc.), 5-second
-- statement timeout, SECURITY INVOKER so caller RLS applies.  Used by /ask.
CREATE OR REPLACE FUNCTION public.run_safe_query(p_sql text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = public, pg_temp AS $$
DECLARE v_trimmed text; v_wrapped text; v_result jsonb;
BEGIN
  IF p_sql IS NULL THEN RAISE EXCEPTION 'SQL is null'; END IF;
  v_trimmed := btrim(p_sql);
  v_trimmed := regexp_replace(v_trimmed, ';+\s*$', '');
  IF v_trimmed ~ ';' THEN
    RAISE EXCEPTION 'Only single statements allowed (no `;` permitted inside the query)';
  END IF;
  IF NOT regexp_replace(v_trimmed, '^(\s|--[^\n]*\n)+', '') ~* '^(select|with)\s' THEN
    RAISE EXCEPTION 'Only SELECT / WITH queries allowed';
  END IF;
  IF v_trimmed ~* '\m(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|vacuum|reindex|comment|cluster|listen|notify|lock|fetch|move|prepare|deallocate|do|call|set|reset|begin|commit|rollback|savepoint|security|trigger)\M' THEN
    RAISE EXCEPTION 'Query contains a disallowed keyword';
  END IF;
  PERFORM set_config('statement_timeout', '5s', true);
  v_wrapped := format(
    'SELECT coalesce(jsonb_agg(row_to_json(sq)::jsonb), ''[]''::jsonb) FROM (%s LIMIT 500) sq',
    v_trimmed
  );
  EXECUTE v_wrapped INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.run_safe_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_safe_query(text) TO authenticated;
