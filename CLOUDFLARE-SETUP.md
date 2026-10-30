# Put the YME website on Cloudflare with a Neon database

The pages live in `public/`. A small Cloudflare Worker (`worker.js`) runs the session manager at **/admin** and the sign-ups at `/api/signups`. Admins sign in at /admin, fill in a form, and the session shows on **Upcoming Sessions** straight away, with its own sign-up page. Everyone who signs up is saved for admins to see on /admin (Sign-Ups tab) and is also emailed to the YME inbox. Sessions and sign-ups are stored in a Neon Postgres database.

Cloudflare's free plan covers this site, including use by an organisation. Static pages are free and unlimited; only `/`, `/admin` and `/api/*` count towards the free 100,000 Worker requests a day.

No passwords or connection strings belong in these files. They go in Cloudflare's settings as **secrets**.

GitHub Pages keeps serving the site until step 7, so nothing goes offline while you set this up.

## 1. Merge the Cloudflare files into `main`

Cloudflare deploys from `main`, so `worker.js`, `wrangler.jsonc` and the updated `package.json` must be there first. Merging them doesn't change `public/`, so the GitHub Pages site keeps working.

## 2. Create the Cloudflare account

1. Sign up at **dash.cloudflare.com**. Use an organisation address, not a personal one.
2. Turn on two-factor authentication (**My Profile → Authentication**) and keep the backup codes somewhere the board can reach, such as a shared password manager.
3. Add a second person under **Manage Account → Members**, using an email that does **not** end in `@medengineers.org` (for example `youngmedicalengineers@gmail.com`). If the domain ever breaks, that person can still sign in and fix it.

## 3. Create the Neon database

1. Sign up at **neon.tech** with the same organisation address, and create a project (the free plan is enough). Pick the region closest to most visitors, for example **AWS US East**.
2. Open the project's **SQL Editor**, paste in all of `db/schema.sql` and run it. It creates two tables: `sessions` and `signups`. Running it again later is safe; it only adds what's missing.
3. Click **Connect** and copy the connection string. It starts with `postgresql://` and contains the database password, so keep it private.

## 4. Create the Worker from GitHub

1. In Cloudflare, open **Compute (Workers) → Workers & Pages → Create → Import a repository**.
2. Connect GitHub when asked, and choose `adampark2010/Young-Medical-Engineers`.
3. Fill in the settings:
   - **Project name:** `yme-website`. It must match `"name"` in `wrangler.jsonc`, or the build fails.
   - **Production branch:** `main`
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** leave it at `/` (the folder holding `wrangler.jsonc`, never `public`)
4. Click **Deploy** and wait for the build to finish. Cloudflare installs packages from `package-lock.json` itself.

The site now works at `https://yme-website.<your-subdomain>.workers.dev`. `/admin` says logins aren't set yet; that's the next step.

## 5. Add the secrets

Open the Worker, then **Settings → Variables and Secrets → Add**. Add each of these with **Type: Secret** (not Text: Text values set here are removed the next time GitHub deploys the site).

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The Neon connection string from step 3 |
| `ADMIN_LOGINS` | One `username:password` per admin, separated by commas |
| `DELETE_PASSWORD` | A separate password needed to delete sessions and sign-ups |

`ADMIN_LOGINS` looks like this:

```
derrick:a-long-password-only-derrick-knows,adam:a-different-long-password
```

- Usernames use letters, numbers, dots, dashes or underscores (up to 40). They are not case-sensitive.
- Passwords can contain colons, but not commas. Spaces at the start or end are ignored.
- The session list shows who added each session ("Added by derrick").

`DELETE_PASSWORD` should differ from every admin's own password. Admins without it can still add sessions; they just can't delete any. Without it, deleting is switched off and /admin says so.

Click **Deploy** after adding them. Saving a secret makes a new deployment, so changes work within a minute. To change a password, add someone or remove someone later, edit the secret the same way.

## 6. Test on the workers.dev address

1. Open `https://yme-website.<your-subdomain>.workers.dev/admin`. The browser asks for a username and password; use one of your `ADMIN_LOGINS` pairs.
2. Add a clearly marked test session dated in the next few days. It shows under **On the Website**.
3. Open `/sessions.html` in another tab. **Find a Session** appears with your test session, and it is in the sign-up form's list.
4. Click **Sign Up** on the test session, fill in the form with your own email, and send it. You land on the confirmation page.
5. Back on /admin, open the **Sign-Ups** tab: your test sign-up is listed under the session. The YME inbox gets an email too. (FormSubmit may send a one-time activation email for the new address; click the link in it once.)
6. Tick the test sign-up, click **Delete Selected** and type your `DELETE_PASSWORD`. Then do the same for the test session on the **Sessions** tab. Reload Upcoming Sessions: it is gone, and a Get Notified panel shows while nothing is scheduled.
7. Click through the other pages (Home, About, Programs, Board, Tutoring, Volunteer, Donate, Contact) and check that images and fonts load.

## 7. Move medengineers.org to Cloudflare

Do this only after step 6 works.

1. In Cloudflare, choose **Add a domain**, enter `medengineers.org` and pick the **Free** plan. Cloudflare copies the domain's current DNS records.
2. Check the copied records against the ones at the registrar. **Keep every MX and TXT record**: those run the domain's email. If any are missing, add them before going on.
3. Delete the two kinds of record that point at GitHub Pages:
   - `www` CNAME pointing to `adampark2010.github.io`
   - `medengineers.org` A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and any AAAA records starting `2606:50c0:`)
4. At the domain's registrar, replace the nameservers with the two Cloudflare shows. Whoever manages the domain makes this change. It usually takes effect within an hour, and occasionally up to a day; Cloudflare emails when the domain is active.
5. Open the Worker, then **Settings → Domains & Routes → Add → Custom domain**. Add `www.medengineers.org`, then add `medengineers.org` the same way. Cloudflare creates the DNS records and HTTPS certificates itself.
6. Open `https://www.medengineers.org/admin` and repeat the checks from step 6.

The site goes down for at most a few minutes between deleting the GitHub records (step 3) and the custom domains being ready (step 5). Doing steps 3 to 5 together keeps that short.

## 8. Turn off GitHub Pages

Once the site loads from Cloudflare on both addresses:

1. In GitHub, open **Settings → Pages** and click **Unpublish site**.
2. Delete `.github/workflows/deploy.yml` (and `public/CNAME`, which only GitHub Pages uses), so pushes to `main` stop starting a Pages deployment.
3. Update `README.md` so it no longer describes GitHub Pages.

## Day to day

- **Publishing:** every push or merge to `main` deploys the site. The Worker's **Deployments** tab shows each one.
- **Undoing a bad deploy:** **Deployments → … → Rollback** on an earlier version.
- **Preview links:** Cloudflare builds other branches too and comments a preview link on their pull requests. Previews use the **same** secrets and the **same** Neon database as the live site, so anything added on a preview shows on the real site. Mark test sessions clearly and delete them.
- **Errors:** open the Worker's **Observability** tab for logs. The Worker never logs passwords or form contents.

## If something fails

- **Build fails with a name mismatch:** the Worker's name in Cloudflare must be `yme-website`, the same as `"name"` in `wrangler.jsonc`.
- **Build fails with "Missing entry-point" or no `wrangler.jsonc`:** `main` doesn't have the Cloudflare files yet (step 1), or Root directory isn't `/`.
- **"The database is not connected. Set DATABASE_URL…":** check the secret's name, spelled exactly `DATABASE_URL`.
- **"No admin logins are set…":** add `ADMIN_LOGINS` as a secret.
- **Secrets vanish after a push:** they were added as Text, not Secret. Add them again as Secret.
- **"A database table is missing…":** run `db/schema.sql` (again) in the Neon project that `DATABASE_URL` points at.
- **Sign-ups arrive by email but not on /admin:** the `signups` table is missing (run `db/schema.sql` again), or the session came from `sessions.json` (those sign-ups go by email only).
- **"Deleting is switched off…":** add `DELETE_PASSWORD` as a secret.
- **"That delete password is not right":** nothing was deleted. Check the `DELETE_PASSWORD` secret (it is not your admin password).
- **The sign-in box keeps coming back:** the username or password doesn't match `ADMIN_LOGINS`. Check for a stray comma.
- **"Sessions are temporarily unavailable" or "Saving is temporarily unavailable":** check that the Neon project is running and the connection string is right, then look at the Worker's Observability logs. Never share the connection string publicly.
- **"Please manage sessions from the YME admin page":** the save came from a different address. Add sessions on /admin at the same address as the site.
- **The custom domain won't add:** an old `www` CNAME or apex A record from GitHub Pages is still in Cloudflare's DNS (step 7.3).

## Signing out

The browser remembers the sign-in until it is fully closed. On a shared computer, use a private window and close it afterwards.

## Local development

```
npm ci
npm start
```

This runs `server.mjs` at http://127.0.0.1:3000 with a local SQLite database in `data/`. Nothing it saves goes to Neon. It prints a temporary admin login and delete password, or uses your own if you start it with `ADMIN_LOGINS="derrick:some-password" DELETE_PASSWORD="another-password" npm start`.

To run the real Cloudflare Worker instead, create a file named `.dev.vars` (it is ignored by git) holding `DATABASE_URL`, `ADMIN_LOGINS` and `DELETE_PASSWORD`, one `NAME="value"` per line, then run `npm run preview` and open http://localhost:8787. With a real Neon connection string this reads and writes that database, so use a separate Neon branch for testing.

`npm test` checks sign-in, validation, adding and deleting sessions, signing up, the Worker's routing and the local SQLite store, with a simulated database. It does not connect to Neon; check the live database with the steps in section 6.
