Young Medical Engineers website - redesigned version (October 2026)


STEP 1. UNDO THE FIVE RENAMES. DO THIS FIRST.

Email providers refuse to deliver JavaScript files, even inside a zip, so
the five scripts in public/assets/ were given a .txt ending to get through.
The site will not work until the ending is taken off again.

In Terminal, from the folder you unzipped:

    cd public/assets
    for f in *.js.txt; do mv "$f" "${f%.txt}"; done
    cd ../..

Or rename these five by hand:

    public/assets/admin.js.txt     ->  public/assets/admin.js
    public/assets/builder.js.txt   ->  public/assets/builder.js
    public/assets/news.js.txt      ->  public/assets/news.js
    public/assets/sessions.js.txt  ->  public/assets/sessions.js
    public/assets/signup.js.txt    ->  public/assets/signup.js

Nothing else in the zip was changed. If you skip this step the pages still
load, but Articles shows no articles, Programs shows no upcoming sessions,
and the sign-up forms do not submit.


STEP 2. PUT IT IN THE REPOSITORY

This zip is the website only: public/ is every page, style, font and image,
and .github/ is the workflow that publishes it. The repository also holds a
separate session-manager app (api/, lib/, db/, server.mjs, vercel.json).
Leave those alone - this zip does not touch them.

1. Open your local copy of the repository.
2. Delete the whole public/ folder. Delete it rather than copying over it:
   some old files were removed in this version, and deleting is what removes
   them.
3. Copy public/, .github/ and ADDING-ARTICLES.md out of this zip into the
   repository, so they sit at the top level.
4. In Terminal, from the repository folder:

       git add -A
       git commit -m "Redesign website"
       git push


STEP 3. CHECK TWO SETTINGS ON GITHUB

Go to the repository on github.com, then Settings > Pages:

    Source          must be "GitHub Actions"   (not "Deploy from a branch")
    Custom domain   must be www.medengineers.org

If Source was on "Deploy from a branch", the push in step 2 deployed
nothing. Change it, then open the Actions tab, choose "Deploy website to
GitHub Pages", and press "Run workflow".

Wait for the green tick, then open https://www.medengineers.org

If that does not load but the github.io address does, the problem is DNS at
the domain registrar, not the site.


WHY THE SITE IS DOWN RIGHT NOW

Two things broke it. Both are fixed here.

- The CNAME file was deleted, so GitHub stopped answering for the domain.
  public/CNAME is back, holding www.medengineers.org.
- Pages was set to serve the repository root, where there is no index.html,
  so it rendered the README as the homepage. The workflow publishes public/.

Step 3 is the part a zip cannot do. Somebody with access to the repository
settings has to change it by hand, once.


THINGS WORTH KNOWING

- Six pages are one-line redirects, not real pages, because they were merged
  into others:
      board.html        -> about.html (the board is at the bottom)
      mission.html      -> about.html
      impact.html       -> index.html (the numbers are on the home page)
      sessions.html     -> programs.html
      support.html      -> donate.html
      get-involved.html -> tutoring.html
  Leave them. They stop old links and search results from 404ing.

- The impact numbers on the home page are plain text in public/index.html.
  Edit the number inside each <span class="stat__num">. They currently read
  120 students reached, 55 active students, $1,000 raised. These are public
  claims by a nonprofit, so they should match the real figures.

- Articles and podcasts come from public/news.json. ADDING-ARTICLES.md
  explains how to add one.

- Photos and board headshots: public/assets/readme.md says where each one
  lives and how to replace it.

- The donate page says 501(c)(3) recognition is pending and donations are not
  tax-deductible yet. Change that the moment it is granted.

- GitHub Pages serves plain files and cannot run the session manager, so
  /admin will not work on the live site. The website does not need it:
  Upcoming Sessions reads public/sessions.json, and adding a session means
  editing that file.
