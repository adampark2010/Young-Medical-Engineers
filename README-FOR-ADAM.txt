Young Medical Engineers website - new version (September 2026)

This zip is the complete, ready-to-publish site: plain HTML, CSS and images.
Nothing to install or build. There is no separate JavaScript file; the small
script for the menu, counters and forms is inside each page.

IF THE REPOSITORY STILL HOLDS THE OLD STATIC SITE
1. In your local copy of the repository, delete everything except the hidden .git folder.
2. Unzip this archive and move its contents into the repository folder, so that
   index.html, CNAME and the assets folder sit at the top level.
3. git add -A && git commit -m "Redesign website" && git push
4. GitHub Pages rebuilds within a minute or two. Hard refresh (Cmd-Shift-R) if needed.

IF THE REPOSITORY IS NOW THE ASTRO BUILD (src/, astro.config.mjs, .github/workflows)
This static version does not go through Astro. Either:
- Replace the Astro site with it: remove src/, public/, scripts/, astro.config.mjs,
  package.json, package-lock.json, tsconfig.json and .github/workflows, add these files
  at the top level, and in GitHub Settings > Pages set the source back to
  "Deploy from a branch" (main, root). CNAME must stay.
- Or keep Astro and port this design into it. The copy, images, board data and
  styles are all here to copy from (assets/style.css holds every colour and type token).

Notes
- assets/readme.md explains where photos and board headshots live and how to replace them.
- impact.html is intentionally a one-line redirect to the home page (the Impact page was
  merged into the home page).
- The four board members without a bio show name and role only until a bio is added.
