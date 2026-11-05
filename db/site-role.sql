-- A database login just for the website: it can read, add and delete rows, but cannot change or
-- drop tables. Run once in the Neon SQL Editor, after db/schema.sql. First replace the password
-- below with 24 or more random letters and numbers (a password manager can make one); the website's
-- DATABASE_URL then signs in with it, as CLOUDFLARE-SETUP.md (step 3) explains.
DO $$
DECLARE password text := 'REPLACE-WITH-A-LONG-RANDOM-PASSWORD';
BEGIN
  IF password !~ '^[A-Za-z0-9]{24,}$' THEN
    RAISE EXCEPTION 'Replace the password on line 6 with 24 or more random letters and numbers first.';
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'yme_site') THEN
    EXECUTE format('ALTER ROLE yme_site WITH LOGIN PASSWORD %L', password);
  ELSE
    EXECUTE format('CREATE ROLE yme_site WITH LOGIN PASSWORD %L', password);
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO yme_site;
GRANT SELECT, INSERT, DELETE ON sessions, signups, form_submissions TO yme_site;
-- the Articles pages' posts can also be edited (db/schema.sql gives this too, once posts exists)
DO $$ BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO yme_site; END IF;
END $$;
