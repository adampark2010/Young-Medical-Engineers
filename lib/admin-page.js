/* The admin page at /admin. Served only after sign-in (lib/admin.js), so it is kept out of public/.
   Its behaviour lives in public/assets/admin.js and public/assets/sessions.js. */
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function adminPage(name) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Session Manager · Young Medical Engineers</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="/assets/style.css">
<script src="/assets/sessions.js" defer></script>
<script src="/assets/admin.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header__inner">
    <a class="brand" href="/index.html"><img src="/assets/logo-full.png" alt="Young Medical Engineers" width="1872" height="402"></a>
    <p class="admin-who">Signed in as <strong>${escape(name)}</strong></p>
  </div>
</header>

<main id="main" tabindex="-1">
<section class="section">
  <div class="container">
    <div class="builder__intro">
      <p class="eyebrow">Admin</p>
      <h1>Manage Sessions</h1>
      <p class="lede">Add a session and it appears on <a href="/sessions.html">Upcoming Sessions</a> straight away, with its own sign-up page. Past sessions hide themselves the day after. Everyone who signs up is listed under Sign-Ups.</p>
    </div>

    <div class="tabs" role="tablist" aria-label="Admin">
      <button class="tab" type="button" role="tab" id="t-sessions" aria-controls="p-sessions" aria-selected="true">Sessions</button>
      <button class="tab" type="button" role="tab" id="t-signups" aria-controls="p-signups" aria-selected="false" tabindex="-1">Sign-Ups <span class="tab__count" id="t-signups-count"></span></button>
    </div>

    <div class="builder__grid" role="tabpanel" id="p-sessions" aria-labelledby="t-sessions">
      <form class="form-card" id="a-form" novalidate>
        <h2>Add a Session</h2>
        <div class="field">
          <label for="a-type">Type</label>
          <select id="a-type" required>
            <option value="" selected disabled>Choose&hellip;</option>
            <option>Talk</option>
            <option>Hands-On Demo</option>
            <option>Design Challenge</option>
          </select>
        </div>
        <div class="field">
          <label for="a-title">Title</label>
          <input id="a-title" type="text" maxlength="120" placeholder="Build a Working Stethoscope" required>
        </div>
        <div class="fgrid">
          <div class="field">
            <label for="a-date">Date</label>
            <input id="a-date" type="date" required>
          </div>
          <div class="field">
            <label for="a-start">Start Time</label>
            <input id="a-start" type="time" required>
          </div>
          <div class="field">
            <label for="a-end">End Time (optional)</label>
            <input id="a-end" type="time">
          </div>
        </div>
        <fieldset class="builder__choices">
          <legend>Where</legend>
          <label><input type="radio" name="where" value="place" checked> In person</label>
          <label><input type="radio" name="where" value="online"> Online</label>
        </fieldset>
        <div class="builder__place" id="a-place-fields">
          <div class="field">
            <label for="a-place">Place Name</label>
            <input id="a-place" type="text" maxlength="120" placeholder="Dunlap Public Library">
          </div>
          <div class="fgrid">
            <div class="field">
              <label for="a-street">Street Address</label>
              <input id="a-street" type="text" maxlength="160" placeholder="302 S 1st St">
            </div>
            <div class="field">
              <label for="a-town">Town and State</label>
              <input id="a-town" type="text" maxlength="120" placeholder="Dunlap, IL">
            </div>
          </div>
        </div>
        <div class="field">
          <label for="a-desc">One-Line Description (optional)</label>
          <textarea id="a-desc" maxlength="300" placeholder="What students will do, in one sentence."></textarea>
        </div>
        <h3>Preview</h3>
        <ol class="sessions builder__preview builder__preview--stack" id="a-preview" inert></ol>
        <p class="builder__msg" id="a-msg" role="status" aria-live="polite"></p>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit" id="a-save" disabled>Add to Website</button>
          <span class="form-note" id="a-status" role="status" aria-live="polite"></span>
        </div>
      </form>

      <div class="builder__out">
        <h2>On the Website</h2>
        <p class="form-note">Upcoming sessions, plus any from the last 30 days.</p>
        <p class="form-note" id="a-del-off" hidden>Deleting is switched off. Set DELETE_PASSWORD in Cloudflare and redeploy to turn it on.</p>
        <div>
          <div class="admin-tools" id="a-tools" hidden>
            <label class="admin-check"><input type="checkbox" id="a-all"> Select all</label>
            <button class="btn btn--secondary" type="button" id="a-delete" disabled>Delete Selected</button>
          </div>
          <form class="admin-confirm" id="a-del-form" hidden novalidate>
            <p id="a-del-text"></p>
            <div class="field">
              <label for="a-del-pass">Delete Password</label>
              <input id="a-del-pass" type="password" autocomplete="off" maxlength="200" required>
            </div>
            <div class="form-actions">
              <button class="btn btn--primary" type="submit" id="a-del-go">Delete</button>
              <button class="btn btn--secondary" type="button" id="a-del-cancel">Cancel</button>
            </div>
          </form>
          <ul class="admin-list" id="a-list" aria-live="polite"><li class="builder__empty">Loading sessions&hellip;</li></ul>
        </div>
        <p class="builder__msg" id="a-list-msg" role="alert"></p>
        <p class="form-note" id="a-list-status" role="status" aria-live="polite"></p>
      </div>
    </div>

    <div class="signups" role="tabpanel" id="p-signups" aria-labelledby="t-signups" hidden>
      <div class="signups__bar">
        <p class="signups__summary" id="g-summary">Loading sign-ups&hellip;</p>
        <div class="form-actions">
          <button class="btn btn--secondary btn--small" type="button" id="g-csv" disabled>Download CSV</button>
          <button class="btn btn--secondary btn--small" type="button" id="g-refresh">Refresh</button>
        </div>
      </div>
      <p class="form-note" id="g-del-off" hidden>Deleting is switched off. Set DELETE_PASSWORD in Cloudflare and redeploy to turn it on.</p>
      <div class="signups__tools">
        <div class="admin-tools admin-tools--alone" id="g-tools" hidden>
          <label class="admin-check"><input type="checkbox" id="g-all"> Select all</label>
          <button class="btn btn--secondary" type="button" id="g-delete" disabled>Delete Selected</button>
        </div>
        <form class="admin-confirm" id="g-del-form" hidden novalidate>
          <p id="g-del-text"></p>
          <div class="field">
            <label for="g-del-pass">Delete Password</label>
            <input id="g-del-pass" type="password" autocomplete="off" maxlength="200" required>
          </div>
          <div class="form-actions">
            <button class="btn btn--primary" type="submit" id="g-del-go">Delete</button>
            <button class="btn btn--secondary" type="button" id="g-del-cancel">Cancel</button>
          </div>
        </form>
      </div>
      <p class="builder__msg" id="g-msg" role="alert"></p>
      <p class="form-note" id="g-status" role="status" aria-live="polite"></p>
      <div id="g-list"></div>
    </div>
  </div>
</section>
</main>
</body>
</html>
`;
}
