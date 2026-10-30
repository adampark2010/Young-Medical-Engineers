Young Medical Engineers website - developer notes (October 2026)

WHAT THIS IS
Plain HTML pages, one stylesheet and images in public/, plus a small server for the
session manager: a Cloudflare Worker (worker.js) and a Neon Postgres database. No
framework and no build step. To run it on your computer:
  npm ci
  npm start          then visit http://127.0.0.1:3000 (session manager: /admin)
npm start runs server.mjs with a local SQLite database in data/ and prints a
temporary admin login. npm test runs the server tests. npm run preview runs the
real Cloudflare Worker locally (see CLOUDFLARE-SETUP.md). CLOUDFLARE-SETUP.md
explains how to put it online.

FILES
Pages and images (public/, the folder Cloudflare publishes):
index.html        Home: photo hero, Who We Are, What We Do, Coming Up (the next three
                  sessions, or a Get Notified line when none), Free. Always. band,
                  Our Impact So Far (the three numbers), Get Involved, footer
about.html        About Us: Why We Do This, What We Believe, Where You'll Find Us / How It
                  Works, board banner, Join Us
programs.html     Building Interest, Supporting Students, Expanding Our Reach
board.html        Executive Board: founder story + nine member cards with headshots
tutoring.html     Free tutoring request form
sessions.html     Upcoming Sessions: filters (type, in person or online), sessions
                  grouped by month as ticket cards, each with a Sign Up link; a Get
                  Notified panel when nothing is scheduled. Sessions load by themselves
signup.html       One session's sign-up page (signup.html?session=<id>): its details and a
                  short form (name, email, optional grade and note). signup.html?notify
                  is the "tell me when new sessions open" list. Not indexed
signed-up.html    Confirmation after signing up: Add to Calendar (.ics) and Share With a
                  Friend. Not indexed
sessions.json     Backup list of sessions for hosting without the server, written by
                  session-builder.html. Normally {"sessions": []}
session-builder.html  Backup staff tool (not linked, not indexed): writes sessions.json
volunteer.html    Volunteer application form
donate.html       Donate page (PayPal link, Where Your Gift Goes, tax note)
contact.html      Contact form + FAQ
impact.html       One-line redirect to index.html (old Impact page address)
mission.html      One-line redirect to about.html (old Mission page address)
assets/style.css  All colours, type and layout. Design tokens are at the top (:root).
assets/sessions.js  Session data and the ticket card for every page (YMESessions): loads
                  /api/sessions and sessions.json, and draws the list on sessions.html
assets/signup.js  The sign-up form and the confirmation page
assets/admin.js   /admin: the Sessions and Sign-Ups tabs
assets/builder.js The Session Builder
assets/readme.md  Where photos and board headshots live and how to replace them
assets/board/     Headshots, one per member, named first-last.jpg
assets/fonts/     Self-hosted fonts (Inter, Archivo; woff2) and their SIL Open Font License files
assets/logo-*.png Logo files (recoloured brand set); logo-*-dark.png are for dark backgrounds
assets/logo-original/  The untouched original logo PNGs (old red cross; do not use)
assets/photo-*.jpg     Page photos (small web copies; larger originals welcome)
assets/og-card.jpg     1200x630 image used for social-media link previews
CNAME             Custom domain for GitHub Pages (www.medengineers.org). Cloudflare ignores it.
robots.txt, sitemap.xml   Search-engine files; update sitemap.xml if pages are added

Server (top level, next to public/):
worker.js         The Cloudflare Worker. It answers three addresses and leaves every
                  other one to the files in public/:
                  /api/sessions: anyone can read upcoming sessions; signed-in admins
                  add (POST) them, and delete (DELETE) several at once with the
                  separate delete password
                  /api/signups: anyone signs up from the website (POST); signed-in
                  admins list sign-ups (GET) and delete them with the delete password
                  /admin: asks for an admin sign-in, then shows the session manager
                  It also serves index.html at /, because pages keep their .html
                  addresses (html_handling "none" in wrangler.jsonc).
lib/              The code behind it: sign-in and the delete password (auth.js),
                  request helpers (http.js), sessions (sessions.js), sign-ups
                  (signups.js), the /admin page (admin.js, admin-page.js), the Neon
                  database (database.js) and the local SQLite one (sqlite-store.js)
db/schema.sql     Creates the sessions and signups tables; run it in Neon (again after
                  any update that adds a table; it never erases anything)
tests/            npm test (uses a simulated database, never Neon)
server.mjs        Local server for npm start (SQLite in data/, not Neon)
wrangler.jsonc    Cloudflare's settings: publish public/, run worker.js for /, /api/*
                  and /admin, and turn on Node compatibility (node:crypto, Buffer)
package.json, package-lock.json   Node 24, the Neon driver, and wrangler (Cloudflare's
                  tool, for npm run preview and deploying)
CLOUDFLARE-SETUP.md   Step-by-step setup on Cloudflare and Neon, and moving
                  medengineers.org

HOW THINGS WORK
- Header, navigation and footer are repeated in every page. A change to them must be
  made in all eleven content pages (index, about, programs, board, tutoring,
  sessions, signup, signed-up, volunteer, donate, contact; search and replace works
  well).
- The footer mirrors the header menu: About (About Us, Executive Board), Programs
  (All Programs, Free Tutoring, Upcoming Sessions, Get Notified) and Get Involved
  (Volunteer, Contact, Donate), with the email and Instagram under the logo. Keep
  it in step with the menu when pages are added.
- The header nav lists each page exactly once: About (About Us, Executive Board) and
  Programs (All Programs, Free Tutoring, Upcoming Sessions) dropdowns, then
  Volunteer, Contact and the Donate button. Menus open on hover or click on desktop
  and become tap-to-expand sections in the mobile menu. On each page, that page's
  own link (the Donate button on donate.html) carries aria-current="page"; a red
  underline marks it automatically.
- Moving between pages cross-fades while the header stays still (CSS view
  transitions in style.css; browsers without support just load the page). Each page
  also asks Chrome to prefetch a link on hover (the speculationrules line in <head>).
- The small script at the bottom of each page handles the mobile menu and dropdowns,
  the impact counters, the scroll-in fade, and form delivery. It is the same in all
  eleven content pages, so change every copy together. Content already on screen when
  a page opens does not fade. Without JavaScript, or with reduced motion, nothing
  fades. Sessions and sign-ups have their own files (assets/sessions.js, signup.js).
- Forms post to FormSubmit (https://formsubmit.co) and arrive at
  youngmedicalengineers@gmail.com. The first submission from the live domain triggers
  a one-time activation email to that inbox; click the link in it once.
- Fonts are self-hosted in assets/fonts (no serif typeface anywhere):
  Archivo (regular width) for headlines, the red labels, footer titles,
  numbers and the Free. Always. band; Inter for body text, nav, buttons and
  forms. Keep them local; do not link to Google Fonts or
  other font services. Archivo stands in for Univers, which is a paid Monotype
  font: do not add Univers files to the site without a Monotype web licence.
- Design rules the team settled on: plain Title Case headings, no italics, no icon
  cards or boxed grids, no decorative rules above headings, no rounded corners (the
  --radius tokens in style.css are all 0). Company colours: navy #1B365D, red
  #C8102E, white #FFFFFF and blue-gray #EAF0F7 (tokens at the top of style.css).
  The logo also uses steel #5F6F8F for its cross, which is steel, never red: a red
  cross on white is a protected emblem (18 U.S.C. § 706).
- Voice: warm and direct. On the inner pages the h1 is a friendly headline (for
  example "Help Keep It Free") and the red eyebrow above it carries the page's
  plain name ("Donate"); text speaks to "you" and uses contractions. Only state
  facts the team has confirmed: no invented numbers, quotes or stories.
- Layout patterns: a small red .eyebrow label above each page title; numbered
  .pillars lists (01, 02, 03) for short groups of points; board cards are unboxed
  (rounded photo with text underneath). Red is the only accent; use it sparingly.
- Look and feel: warm and people-first, in the spirit of charity: water. Photo
  sections (home hero, About and Programs headers, home Get Involved) are full-width
  photos with white headlines and text on a soft dark fade; on phones the home
  photo sits above its text. Other pages are white with blue-gray sections, navy
  headings and icons, square buttons, and red for buttons, labels, the Free.
  Always. band and the About page board banner.
- On the home page only, the header (class site-header--overlay) is transparent with
  a white logo over the photo and turns solid white once the page scrolls; the small
  script sets this, and without JavaScript the header simply stays white. While it is
  see-through, the phone's status bar (theme-color) takes the photo's dark top edge.
- Past the top or bottom of a page (the bounce on iPhone and Mac), browsers show the
  html background colour. The small script marks the top half of the page
  (html.near-top), so that area matches the nearer end: the header colour at the top,
  white like the footer at the bottom, and on the home page the photo's dark top
  edge (--photo-edge in style.css). The home photo fades up into that colour, so
  pulling down looks like the photo carrying on. If the home photo is replaced, keep
  --photo-edge (or pick a colour close to the new photo's top) so the join stays
  seamless.
- To add a session, go to /admin, sign in with your own admin login, fill in the
  form and click Add to Website. It shows on Upcoming Sessions straight away. Each
  admin has their own username and password, set in Cloudflare as ADMIN_LOGINS (see
  CLOUDFLARE-SETUP.md); the list on /admin shows who added what. Everything typed is
  shown as plain text, never as HTML.
- To delete sessions, tick them in the list on /admin (or Select all), click Delete
  Selected, and type the delete password. That is a separate password set in Cloudflare
  as DELETE_PASSWORD, like Lunch's clear password: only people who know it can
  delete, and without it deleting is switched off. Deleting can't be undone.
- Upcoming Sessions: visitors filter by type and by in person or online (the choice
  stays in the address, for example sessions.html?type=talk, so a filtered list can
  be shared). Each session is a ticket card with a Sign Up link to its own page,
  signup.html?session=<id>. Past sessions hide themselves the day after. While
  nothing is scheduled, Find a Session is hidden and a Get Notified panel shows.
- Signing up: the form asks for name and email, plus an optional grade and note. Each
  sign-up is saved in the database (the signups table) and also emailed to the YME
  inbox through FormSubmit; either one reaching the team counts, and the visitor
  goes on to signed-up.html. Someone signing up twice with the same email for the
  same session is saved once. A hidden box that people never see catches bots.
- Sign-ups on /admin: the Sign-Ups tab lists everyone, grouped by session (upcoming
  first, then the "tell me" list, then past sessions), with Copy Emails for each
  group, Download CSV for all of them, and delete with the delete password. Sign-ups
  stay until deleted, so delete them once a session is over. They hold students'
  names and emails, so keep the CSV files private too.
- Sessions in the database and in sessions.json show together. Without the server
  (for example a plain static copy), use session-builder.html: it reads
  sessions.json, adds the new session (and leaves out any you untick), and gives the
  whole new file to paste over sessions.json on GitHub (its EDIT_URL setting should
  point at whichever repository publishes the live site). Sign-ups for those
  sessions arrive by email only.
- To update the impact numbers, edit the three .stat blocks in index.html (both the
  visible number and the data-count value).

PUBLISHING
The site runs on Cloudflare Workers with a Neon database: see CLOUDFLARE-SETUP.md.
Logins and the database connection are set as secrets in Cloudflare's settings, never
in these files. Every push to main deploys the site.
