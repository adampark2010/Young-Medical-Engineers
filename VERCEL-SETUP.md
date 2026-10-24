# Put the YME website on Vercel with a Neon database

The website is now set up like Lunch: the pages live in `public/`, and small server functions in `api/` run the session manager and sign-ups. Admins sign in at **/admin**, fill in a form, and the session shows on **Upcoming Sessions** straight away, with its own sign-up page. Everyone who signs up is saved for admins to see on **/admin** (Sign-Ups tab) and is also emailed to the YME inbox. Sessions and sign-ups are stored in a Neon Postgres database. No passwords or connection strings belong in these files; they go in Vercel's settings.

GitHub Pages can only serve plain files, so the session manager needs Vercel (or another host that runs Node.js functions). Every other page still works as plain HTML.

## 1. Create the Vercel project

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. **Root Directory:** leave it at `.`. It must be the folder holding `vercel.json` and `package.json`, never `public`.
3. **Framework Preset:** **Other**. `vercel.json` already sets Output Directory `public`, Install Command `npm ci` and an empty Build Command. Node.js 24.x is set in `package.json`.
4. Deploy. The pages work at once. `/admin` and the session list wait for steps 2 to 5.

Vercel's free Hobby plan is meant for personal, non-commercial projects. Check that it fits an organisation's website, or use a team plan.

## 2. Add a Neon database

In the project, open **Storage**, create a **Neon** database and connect it to this project. The integration adds the connection setting for you.

The site reads it as `DATABASE_URL`. If the integration named it differently, add `DATABASE_URL` yourself in **Settings → Environment Variables** with the same value. Keep it secret.

## 3. Add the admin logins

In **Settings → Environment Variables**, add `ADMIN_LOGINS` for **Production**. Give each admin their own username and password, written `username:password`, separated by commas:

```
derrick:a-long-password-only-derrick-knows,adam:a-different-long-password
```

- Usernames use letters, numbers, dots, dashes or underscores (up to 40). They are not case-sensitive.
- Passwords can contain colons, but not commas. Spaces at the start or end are ignored.
- The session list shows who added each session ("Added by derrick").
- To change a password, add someone, or remove someone, edit `ADMIN_LOGINS` and redeploy (step 5).

Then add `DELETE_PASSWORD` for **Production** (and Preview, if you test on preview links). This is a separate password that `/admin` asks for every time someone deletes sessions, the same idea as Lunch's clear password:

- Make it different from every admin's own password, and share it only with people who should be able to delete.
- Admins without it can still add sessions; they just can't delete any.
- Without `DELETE_PASSWORD`, deleting is switched off and `/admin` says so.
- To change it, edit the value and redeploy.

## 4. Create the tables

Open the connected Neon database's **SQL Editor**. Paste in the contents of `db/schema.sql` and run it. It creates two tables: `sessions` and `signups`.

**Already set up before sign-ups were added?** Run `db/schema.sql` again. It uses `CREATE TABLE IF NOT EXISTS`, so it only adds what's missing and never erases sessions or sign-ups. Use the same Neon database and branch as Production's `DATABASE_URL`.

## 5. Redeploy

Open **Deployments**, choose the latest deployment's menu, and select **Redeploy**. Wait until it is Ready. Changes to environment variables only take effect in a new deployment.

## 6. Test it

1. Open `https://<your-project>.vercel.app/admin`. The browser asks for a username and password; use your `ADMIN_LOGINS` pair.
2. Add a clearly marked test session dated in the next few days. It shows under **On the Website**.
3. Open `/sessions.html` in another tab. **Find a Session** now appears with your test session, and it is in the sign-up form's list.
4. Click **Sign Up** on the test session, fill in the form with your own email, and send it. You land on the confirmation page.
5. Back on `/admin`, open the **Sign-Ups** tab: your test sign-up is listed under the session. The YME inbox gets an email too. (The first sign-up from a new address can trigger a one-time FormSubmit activation email; click the link in it once.)
6. Tick the test sign-up, click **Delete Selected** and type your `DELETE_PASSWORD`. Then do the same for the test session on the **Sessions** tab. Reload Upcoming Sessions: it is gone, and a Get Notified panel shows while nothing is scheduled.

## Moving medengineers.org to Vercel

Do this in the repository and domain that publish the real site, and only once the Vercel project for it works.

1. Push or upload these files to the real repository. Keep `api/`, `lib/`, `db/`, `public/`, `tests/`, `package.json`, `package-lock.json`, `vercel.json` and `server.mjs` side by side at its top level. Never upload `node_modules`, `data`, or any `.env` file.
2. Follow steps 1 to 6 above for a Vercel project connected to that repository.
3. In that project, open **Settings → Domains** and add `www.medengineers.org` and `medengineers.org`. Vercel shows the DNS records to set at the domain's registrar. Whoever manages the domain makes that change.
4. Once Vercel shows the domains as valid and the site loads on them, turn off GitHub Pages in the real repository (**Settings → Pages**).

**Important:** after this change the pages are in `public/`, not at the top of the repository. A GitHub Pages site that publishes the repository's top level would show a 404, so set up Vercel before or together with pushing this version to the real repository. `public/CNAME` only matters to GitHub Pages; Vercel ignores it.

## If something fails

- **404 on /admin or /api/sessions:** check that Root Directory is `.`, and that `api/` and `vercel.json` are in the commit Vercel deployed.
- **"The database is not connected. Set DATABASE_URL…":** check the variable's name and Production scope, then redeploy.
- **"No admin logins are set…":** add `ADMIN_LOGINS` for Production and redeploy.
- **"A database table is missing…":** run `db/schema.sql` (again) in the database that Production uses.
- **Sign-ups arrive by email but not on /admin:** the `signups` table is missing (run `db/schema.sql` again), or the session came from `sessions.json` (those sign-ups go by email only).
- **"Deleting is switched off…":** add `DELETE_PASSWORD` for the environment you're using and redeploy.
- **"That delete password is not right":** nothing was deleted. Check the `DELETE_PASSWORD` value in Vercel (it is not your admin password), and redeploy after any change.
- **The sign-in box keeps coming back:** the username or password doesn't match `ADMIN_LOGINS`. Check for a stray comma, then redeploy after any change.
- **"Saving…", "Signing up…", "Deleting…" or "Sessions are temporarily unavailable":** check the Neon integration and the function logs in Vercel. Never share the connection string publicly.
- **"Please manage sessions from the YME admin page":** the save came from a different address. Add sessions on `/admin` at the same address as the site.

## Signing out

The browser remembers the sign-in until it is fully closed. On a shared computer, use a private window and close it afterwards.

## Local development

```
npm ci
npm start
```

This runs `server.mjs` at http://127.0.0.1:3000 with a local SQLite database in `data/`. Nothing it saves goes to Neon. It prints a temporary admin login and delete password for http://127.0.0.1:3000/admin, or uses your own if you start it with `ADMIN_LOGINS="derrick:some-password" DELETE_PASSWORD="another-password" npm start`.

`npm test` checks sign-in, validation, adding and deleting sessions, and signing up (including repeats, bots and the delete password) with a simulated database, plus the local SQLite store. It does not connect to Neon; check the live database with the steps in section 6.

Official references:
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/marketplace-storage
- https://github.com/neondatabase/serverless
