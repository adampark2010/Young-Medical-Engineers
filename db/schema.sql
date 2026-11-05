-- Upcoming Sessions, their sign-ups, and the website's form submissions. Run in the Neon SQL editor; safe to run again,
-- and run it again after an update adds a table (it never erases anything).
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Talk', 'Hands-On Demo', 'Design Challenge')),
  title VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  online BOOLEAN NOT NULL DEFAULT FALSE,
  place VARCHAR(120) NOT NULL DEFAULT '',
  street VARCHAR(160) NOT NULL DEFAULT '',
  town VARCHAR(120) NOT NULL DEFAULT '',
  description VARCHAR(300) NOT NULL DEFAULT '',
  created_by VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_date ON sessions (date);

-- Sign-ups from the website. session_id is empty for "Tell me when new sessions open".
-- The session's title, date and time are copied in, so a sign-up still reads well after
-- its session is deleted.
CREATE TABLE IF NOT EXISTS signups (
  id UUID PRIMARY KEY,
  session_id UUID,
  session_title VARCHAR(120) NOT NULL DEFAULT '',
  session_date DATE,
  session_start TIME,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  grade VARCHAR(10) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- one sign-up per email for each session (and one for the "tell me" list)
CREATE UNIQUE INDEX IF NOT EXISTS signups_once ON signups (COALESCE(session_id::text, 'notify'), lower(email));

-- Tutoring requests, volunteer applications and messages from the website's forms (lib/forms.js).
-- fields keeps each answer with its question, in the form's order: [["Email", "..."], ...].
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY,
  form TEXT NOT NULL CHECK (form IN ('tutoring', 'volunteer', 'contact')),
  fields JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS form_submissions_created ON form_submissions (created_at DESC);

-- The Articles pages, edited on /admin (lib/posts.js): kind is article or podcast (In the News)
-- or update (Our Updates); data holds the post's fields, named as in news.json and updates.json.
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('article', 'podcast', 'update')),
  data JSONB NOT NULL,
  created_by VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_kind ON posts (kind);

-- When the website has its own login (db/site-role.sql), let it read, add and delete rows in every
-- table above, including any a later update adds. Does nothing until that login exists.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'yme_site') THEN
    GRANT USAGE ON SCHEMA public TO yme_site;
    GRANT SELECT, INSERT, DELETE ON sessions, signups, form_submissions TO yme_site;
    GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO yme_site; -- posts can be edited
  END IF;
END $$;
