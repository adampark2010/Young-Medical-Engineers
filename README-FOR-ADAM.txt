Young Medical Engineers website - new version (October 2026)

This is the complete site, set up the same way as the Lunch project: the pages,
styles, fonts and images are in public/, and a small server (api/ and lib/) runs the
session manager at /admin. Admins sign in there, fill in a form, and the session
shows on Upcoming Sessions straight away, with its own sign-up page. Sign-ups are
saved for admins (the Sign-Ups tab on /admin) and emailed to the YME inbox.
Sessions and sign-ups are stored in a Neon database.

GitHub Pages can only serve plain files, so the site now publishes through Vercel.
VERCEL-SETUP.md has every step: create the Vercel project, add Neon, set the admin
logins, run db/schema.sql, redeploy, test, then point medengineers.org at Vercel.

IF THE REPOSITORY STILL HOLDS THE OLD STATIC SITE
1. In your local copy of the repository, delete everything except the hidden .git folder.
2. Copy these files in, so that public/, api/, lib/, db/, tests/, package.json,
   package-lock.json, vercel.json and server.mjs sit at the top level. Leave out
   node_modules, data and any .env file.
3. git add -A && git commit -m "Redesign website" && git push
4. Follow VERCEL-SETUP.md. The pages now live in public/, so GitHub Pages on its own
   would show a 404: set up Vercel and move the domain before relying on the new
   version, then turn GitHub Pages off.

IF THE REPOSITORY IS NOW THE ASTRO BUILD (src/, astro.config.mjs, .github/workflows)
This version does not go through Astro. Either:
- Replace the Astro site with it: remove src/, public/, scripts/, astro.config.mjs,
  package.json, package-lock.json, tsconfig.json and .github/workflows, add these files
  at the top level, and follow VERCEL-SETUP.md.
- Or keep Astro and port this design into it. The copy, images, board data and
  styles are all here to copy from (public/assets/style.css holds every colour and
  type token). The session manager would then need porting too.

Notes
- Admin logins and the database connection go in Vercel's settings, never in files.
- public/assets/readme.md explains where photos and board headshots live and how to
  replace them.
- public/impact.html and public/mission.html are intentionally one-line redirects
  (the Impact page was merged into the home page; the Mission page into About Us).
- The two board members without a bio show name and role only until a bio is added.
