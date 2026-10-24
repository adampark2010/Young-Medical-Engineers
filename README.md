# Young Medical Engineers

The website's ready-to-publish HTML, styles, images and fonts live in `public/`.
There is no frontend build step.

## Publish on GitHub Pages

1. In `adampark2010/Young-Medical-Engineers`, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy website to GitHub Pages** from the **Actions**
   tab. The workflow uploads `public/` as the site root, then deploys it.
4. Wait for the workflow to finish. Use the published URL shown in
   **Settings → Pages** or the workflow's `github-pages` environment.

Do not select the repository root as a branch publishing source: the homepage
is `public/index.html`, not `/index.html` in the checkout. The repository is no
longer an Astro project, so publishing does not run an Astro build or use `dist/`.

The existing custom domain is `www.medengineers.org` (`public/CNAME`). If using
that domain, keep it configured in **Settings → Pages → Custom domain**, with
the registrar's DNS pointing to this GitHub Pages site. The site also supports
the default project URL under `/Young-Medical-Engineers/`.

### Sessions and forms on Pages

GitHub Pages serves static files; it cannot run `server.mjs`, `/admin` or the
`api/` functions. The public website loads sessions from `public/sessions.json`
when the API is unavailable.

To add or remove sessions, open `session-builder.html` on the published site,
generate the updated JSON, and use **Open sessions.json on GitHub** to replace
`public/sessions.json` on this repository's `main` branch. Committing that change
triggers another deployment. Sessions from this file and other forms send email
through FormSubmit; the inbox owner must activate FormSubmit for the live domain
when prompted. There is no database signup list or admin login on Pages.

For server-backed administration and database signups, use the separate
[Vercel and Neon instructions](VERCEL-SETUP.md).

## Local development

Use Node.js 24.x:

```sh
npm ci
npm start
npm test
```

`npm start` runs the local server with SQLite in the ignored `data/` directory.
To preview exactly the static folder that Pages publishes, run
`python3 -m http.server 8080 --directory public` instead.
