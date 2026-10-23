-- Upcoming Sessions and their sign-ups. Run in the Neon SQL editor; safe to run again,
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
