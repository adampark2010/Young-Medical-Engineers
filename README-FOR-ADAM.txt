Young Medical Engineers website (October 2026)

The pages, styles, fonts and images are in public/. A small Cloudflare Worker
(worker.js, with the code in lib/) runs the session manager at /admin. Admins sign in
there, fill in a form, and the session shows on Upcoming Sessions straight away, with
its own sign-up page. Sign-ups are saved for admins (the Sign-Ups tab on /admin) and
emailed to the YME inbox. Sessions and sign-ups are stored in a Neon database.

MOVING FROM GITHUB PAGES TO CLOUDFLARE
CLOUDFLARE-SETUP.md has every step: merge these files into main, create the Cloudflare
and Neon accounts, connect the repository, add the secrets, test on the workers.dev
address, move medengineers.org, then turn GitHub Pages off. GitHub Pages keeps serving
the site until the end, so nothing goes offline in between.

Notes
- Admin logins and the database connection go in Cloudflare's settings as secrets,
  never in files.
- Every push to main deploys the site on Cloudflare once it is set up.
- public/assets/readme.md explains where photos and board headshots live and how to
  replace them.
- public/impact.html and public/mission.html are intentionally one-line redirects
  (the Impact page was merged into the home page; the Mission page into About Us).
- The two board members without a bio show name and role only until a bio is added.
