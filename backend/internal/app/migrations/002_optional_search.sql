-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
    RAISE NOTICE 'pg_trgm unavailable; application will use edit-distance fallback';
  END;
  IF to_regprocedure('similarity(text,text)') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS products_title_trgm ON products USING gin(lower(title) gin_trgm_ops);
  END IF;
END;
$$;
-- +goose StatementEnd

-- +goose Down
DROP INDEX IF EXISTS products_title_trgm;
