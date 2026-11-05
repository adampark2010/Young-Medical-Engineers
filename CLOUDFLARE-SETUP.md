# Put the YME website on Cloudflare, with a Neon database and a locked admin page

This guide moves medengineers.org from GitHub Pages to Cloudflare, saves everything people send through the website in a private Neon database, and puts the admin page behind Cloudflare Access so only your board can read it. It takes about an hour, plus waiting for the domain to switch over. GitHub Pages keeps serving the site until step 9, so nothing goes offline in between.

**What you get at the end**

- The same website, served by Cloudflare.
- Tutoring requests, volunteer applications, messages and session sign-ups saved in a database. Only signed-in admins can read them, on **/admin** (Sessions, Sign-Ups and Forms tabs).
- Your inbox gets a short notice for each one ("A new tutoring request is waiting on the admin page") with no personal details in it, so nothing private sits in email.
- Getting into /admin takes a one-time code sent to an approved email address, and then the admin's own username and password.

**Before you start:** have `youngmedicalengineers@gmail.com` open in another tab (Cloudflare and Neon send codes there), and know who can log in to the registrar where medengineers.org was bought.

**How it works, briefly:** the pages are in `public/`. `worker.js` runs the parts that need a server: the forms (`/api/...`) and the admin page (`/admin`, which reads through `/admin/api/...`). `wrangler.jsonc` is Cloudflare's settings file, `public/_headers` adds security headers to every page, and `db/` holds the database setup. No password or connection string is ever stored in these files; they go into Cloudflare as **secrets**.

---

## Part 1. Accounts

### Step 1. Secure the Gmail account first

Everything below can be recovered through `youngmedicalengineers@gmail.com`, so it has to be safe.

1. In that Gmail account, open **Manage your Google Account → Security**.
2. Turn on **2-Step Verification**, preferably with an authenticator app or a security key rather than text messages.
3. Save the backup codes somewhere the board can reach, such as a shared password manager.

### Step 2. Create the Cloudflare and Neon accounts

1. Sign up at **dash.cloudflare.com** with `youngmedicalengineers@gmail.com`.
2. In Cloudflare, open **My Profile → Authentication** and turn on two-factor authentication with an authenticator app. Save the backup codes with the Gmail ones.
3. Under **Manage Account → Members**, invite one more board member with their own email address, so the account never depends on one login.
4. Sign up at **neon.tech** with **Continue with Google**, using the same Gmail account. Google's 2-Step Verification then protects Neon too.

## Part 2. The database

### Step 3. Create the Neon database

1. In Neon, create a project named `yme-website`. For the region choose **AWS US East 2 (Ohio)**, the closest to Illinois. The free plan is enough.
2. Open **SQL Editor**. Paste in all of [`db/schema.sql`](db/schema.sql) and click **Run**. It creates four tables: `sessions`, `signups`, `form_submissions` and `posts` (the Articles pages). Run it again after any update that adds a table. Running it again later is safe; it never erases anything.
3. Make a password for the website's own database login: **24 or more random letters and numbers, no symbols**. A password manager can generate one. Save it in the board's password manager.
4. Open [`db/site-role.sql`](db/site-role.sql), paste it into a new SQL Editor tab, replace `REPLACE-WITH-A-LONG-RANDOM-PASSWORD` on line 6 with your password, and click **Run**. This makes a login called `yme_site` that can only read, add and delete rows: it cannot change or delete tables, even if its password ever leaked. (If you forget to replace the password, it stops and tells you.)
5. Click **Connect** on the project dashboard and copy the connection string. It looks like this:

   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

6. Replace the part between `postgresql://` and `@` with `yme_site:` followed by your new password:

   ```
   postgresql://yme_site:YourLongRandomPassword@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   This is the website's **DATABASE_URL**. Keep it private; you'll paste it into Cloudflare in step 5.

## Part 3. The website on Cloudflare

### Step 4. Connect the repository

1. In Cloudflare, open **Workers & Pages → Create → Import a repository**, and connect GitHub when asked.
2. Choose `adampark2010/Young-Medical-Engineers` and fill in:
   - **Project name:** `yme-website` (it must match `"name"` in `wrangler.jsonc`)
   - **Production branch:** `main`
   - **Build command:** leave empty
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/` (the folder with `wrangler.jsonc`, never `public`)
3. If there is a setting for **builds for non-production branches**, turn it off. Preview builds would use the same secrets and the same database as the real site.
4. Click **Deploy** and wait for it to finish. The site now works at `https://yme-website.<your-subdomain>.workers.dev`.

### Step 5. Add the secrets

Open the Worker, then **Settings → Variables and Secrets → Add**. Add each of these with **Type: Secret**. (Not Text: Text values set here are removed the next time GitHub deploys the site.)

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The connection string from step 3 |
| `ADMIN_LOGINS` | One `username:password` per admin, separated by commas |
| `DELETE_PASSWORD` | A separate password needed for deleting anything |

`ADMIN_LOGINS` looks like this:

```
adam:a-long-password-only-adam-knows,sohum:a-different-long-password
```

Usernames use letters, numbers, dots, dashes or underscores. Passwords can contain colons but not commas. Each admin gets their own; the Sessions tab shows who added what. `DELETE_PASSWORD` should differ from every admin's password, and only people who should be able to delete should know it.

Click **Deploy** after adding them. Saving a secret makes a new deployment, so changes work within a minute.

### Step 6. Test on the workers.dev address

1. Open `https://yme-website.<your-subdomain>.workers.dev/admin`. The browser asks for a username and password; use one from `ADMIN_LOGINS`.
2. Add a clearly marked test session for the next few days. Open `/programs.html#sessions` in another tab: the session is listed.
3. Sign up for it with your own email (you'll need to tick the permission box). You land on the confirmation page.
4. Send a test through **Request a Tutor** (`/tutoring.html`) and **Send a Message** (`/contact.html`).
5. Back on /admin: the **Sign-Ups** tab shows your sign-up, and the **Forms** tab shows the tutoring request and the message, with every answer.
6. Check the YME inbox: each one sent a short notice with a link to /admin and no personal details. The first notice from the new address may come as a one-time FormSubmit activation email; click the link in it once.
7. Delete the test sign-up, the two form submissions and the test session, each with **Delete Selected** and your `DELETE_PASSWORD`.
8. Click through every page (Home, About, Programs, Articles, Get Involved, Donate, and the legal pages in the footer) and check that pictures and fonts load.

## Part 4. Move medengineers.org

### Step 7. Point the domain at Cloudflare

Do this only after step 6 works.

1. In Cloudflare, choose **Add a domain**, enter `medengineers.org` and pick the **Free** plan. Cloudflare copies the domain's current DNS records.
2. Compare the copied records with the ones at the registrar. **Keep every MX and TXT record**; those run the domain's email. Add any that are missing.
3. Delete the records that point at GitHub Pages:
   - the `www` CNAME pointing to `adampark2010.github.io`
   - `medengineers.org` A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153` (and any AAAA records starting `2606:50c0:`)
4. At the registrar, replace the nameservers with the two Cloudflare shows. It usually takes effect within an hour, occasionally up to a day; Cloudflare emails when the domain is active.
5. Open the Worker, then **Settings → Domains & Routes → Add → Custom domain**. Add `www.medengineers.org`, then `medengineers.org`. Cloudflare creates the DNS records and HTTPS certificates itself.
6. In the domain's **SSL/TLS → Edge Certificates**, turn on **Always Use HTTPS**.
7. Open `https://www.medengineers.org/admin` and repeat the checks from step 6.

The site is down for at most a few minutes between deleting the GitHub records (step 7.3) and the custom domains being ready (step 7.5). Doing those steps together keeps it short.

## Part 5. Lock the admin page

### Step 8. Put Cloudflare Access in front of /admin

With this, nobody can even see the admin sign-in without a one-time code sent to an approved email address. The website also checks Cloudflare's signed pass on every admin request itself, so there is no way around it.

1. In the Cloudflare dashboard, open **Zero Trust**. The first time, choose a **team name** (for example `yme`) and the **Free** plan (free for up to 50 people; Cloudflare may ask for a card even on the free plan, and it isn't charged). Your **team domain** is then `yme.cloudflareaccess.com`; it's shown in the Zero Trust settings.
2. **One-time PIN** is the login method Zero Trust has on by default: Cloudflare emails a code to the address someone types. You can also add **Google** under **Settings → Authentication** if the board would rather sign in with Google accounts.
3. Open **Access → Applications → Add an application → Self-hosted** and fill in:
   - **Application name:** `YME admin`
   - **Session duration:** `12 hours`
   - **Public hostname:** domain `medengineers.org`, subdomain `www`, path `admin`. Add a second hostname: domain `medengineers.org`, no subdomain, path `admin`. (A path covers everything under it, so `/admin/api/...` is included.)
4. Add a policy: **Action: Allow**, then **Include → Emails** and list every admin's address, for example `youngmedicalengineers@gmail.com` and each board member's own email. Save the application.
5. Open the application again and copy its **Application Audience (AUD) Tag**, a long string of letters and numbers.
6. Back in the Worker's **Settings → Variables and Secrets**, add three more secrets:

   | Name | Value |
   | --- | --- |
   | `ACCESS_TEAM_DOMAIN` | Your team domain, for example `yme.cloudflareaccess.com` |
   | `ACCESS_AUD` | The Application Audience (AUD) Tag |
   | `ADMIN_EMAILS` | The same email addresses as the policy, separated by commas |

7. Test it in a private browser window: open `https://www.medengineers.org/admin`. Cloudflare asks for an email and sends a code; after that the browser asks for the admin username and password; then the admin page opens, and its Sessions, Sign-Ups and Forms tabs load. Try once with an address that is not on the list: Cloudflare refuses it.

Keeping `ADMIN_LOGINS` set means getting in takes both the emailed code and the admin's own password. That is the recommended setup. If the board would rather sign in with the code alone, delete the `ADMIN_LOGINS` secret; the Sessions tab then shows the admin's email address as "Added by".

Once these secrets are set, the admin page only opens through Access, so it no longer works on the workers.dev address. That is expected.

### Step 9. Turn off the old addresses

1. In GitHub, open **Settings → Pages** and click **Unpublish site**. Then tell Claude (or a developer) to delete `.github/workflows/deploy.yml` and `public/CNAME`, which only GitHub Pages used.
2. In the Worker's **Settings → Domains & Routes**, turn off the **workers.dev** address and **Preview URLs**, so the site only answers on medengineers.org.

### Step 10. Extra protection (free)

1. **Rate limiting:** open the domain's **Security → WAF → Rate limiting rules → Create rule**. Name it `Forms and admin`. Match requests where **URI Path** starts with `/api/`, **or** URI Path starts with `/admin`. Count by IP address, allow **20 requests per 10 seconds**, and **Block** for 10 seconds. This stops anyone flooding the forms or hammering the admin sign-in.
2. **Bots:** under **Security → Bots**, turn on **Bot Fight Mode**.
3. **GitHub:** make sure everyone who can change the repository has two-factor authentication on (GitHub **Settings → Password and authentication**). Whoever can push to `main` can change the website.

## Day to day

- **New submissions:** the inbox gets a notice; open **/admin → Forms** (or **Sign-Ups**) to read it. Reply from your own email.
- **Delete what you no longer need.** Tick it, click **Delete Selected**, type the delete password. Our Privacy page promises we only keep requests while they're useful.
- **Adding or removing an admin:** add or remove their email in both the Access policy (step 8.4) and `ADMIN_EMAILS`, and their entry in `ADMIN_LOGINS`.
- **Publishing:** every push or merge to `main` deploys the site. The Worker's **Deployments** tab shows each one and can **Rollback** to an earlier version.
- **Who signed in:** **Zero Trust → Logs → Access** lists every admin sign-in and every refused attempt.
- **Errors:** the Worker's **Observability** tab has logs. The site never logs passwords or form contents.
- **If the database is ever unavailable**, the forms quietly fall back to emailing the full details, so nothing sent is lost.

## If something fails

- **Build fails with a name mismatch:** the Worker must be named `yme-website`, as in `wrangler.jsonc`.
- **"The database is not connected. Set DATABASE_URL…":** check the secret's name.
- **"A database table is missing…":** run `db/schema.sql` again in the Neon project that `DATABASE_URL` points to.
- **"The website's database login may not use a table…":** run `db/schema.sql` again; it gives the `yme_site` login what it needs.
- **The admin page says "Sign in through Cloudflare Access with an admin email address":** the address isn't in `ADMIN_EMAILS`, or the page was opened on an address Access doesn't cover (such as workers.dev). Use `https://www.medengineers.org/admin`.
- **"No admin email addresses are set…":** add `ADMIN_EMAILS` (step 8.6).
- **"No admin logins are set…":** add `ADMIN_LOGINS`, or set up Access with `ADMIN_EMAILS` and leave `ADMIN_LOGINS` out.
- **The admin page opens, but its tabs say "Sign in through Cloudflare Access…":** Access covers `/admin` but not the addresses under it. In the Access application, add the same two hostnames again with the path `admin/*`.
- **The sign-in box keeps coming back:** the username or password doesn't match `ADMIN_LOGINS`. Check for a stray comma.
- **"That delete password is not right":** nothing was deleted. Check the `DELETE_PASSWORD` secret (it isn't your admin password).
- **Secrets vanish after a push:** they were added as Text, not Secret. Add them again as Secret.
- **Forms arrive as full emails instead of notices:** the database wasn't reachable when they were sent. Check `DATABASE_URL` and Neon's dashboard.
- **The custom domain won't add:** an old `www` CNAME or A record from GitHub Pages is still in Cloudflare's DNS (step 7.3).

## Local development

```
npm ci
npm start
```

This runs `server.mjs` at http://127.0.0.1:3000 with a local SQLite database in `data/`; nothing goes to Neon. It prints a temporary admin login and delete password, or uses yours: `ADMIN_LOGINS="adam:some-password" DELETE_PASSWORD="another-password" npm start`.

To run the real Cloudflare Worker instead, create a file named `.dev.vars` (git ignores it) with `DATABASE_URL`, `ADMIN_LOGINS` and `DELETE_PASSWORD`, one `NAME="value"` per line, then run `npm run preview` and open http://localhost:8787. With a real connection string it uses that database, so use a separate Neon branch for testing.

`npm test` checks sign-in (including Cloudflare Access tokens), the forms, sessions, sign-ups, deleting, the Worker's routing and the local SQLite store, with a simulated database.
