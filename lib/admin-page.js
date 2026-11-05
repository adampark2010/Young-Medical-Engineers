/* The admin page at /admin. Served only after sign-in (lib/admin.js), so it is kept out of public/.
   Its behaviour lives in public/assets/admin.js and public/assets/sessions.js. */
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function adminPage(name) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin · Young Medical Engineers</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="/assets/style.css?v=2026-11-05c">
<script src="/assets/sessions.js" defer></script>
<script src="/assets/admin.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header__inner">
    <a class="brand" href="/index.html"><img src="/assets/logo-full-dark.png" alt="Young Medical Engineers" width="1872" height="402"></a>
    <p class="admin-who">Signed in as <strong>${escape(name)}</strong></p>
  </div>
</header>

<main id="main" tabindex="-1">
<section class="section">
  <div class="container">
    <div class="builder__intro">
      <p class="eyebrow">Admin</p>
      <h1>Manage the Website</h1>
      <p class="lede">Sessions: add a session and it appears on <a href="/programs.html#sessions">Upcoming Sessions</a> straight away, with its own sign-up page; sign-ups and form messages are listed beside it. Articles: add, edit or remove what shows on <a href="/articles.html">In the News</a> and <a href="/updates.html">Our Updates</a>.</p>
    </div>

    <div class="tabs tabs--main" role="tablist" aria-label="Admin sections">
      <button class="tab" type="button" role="tab" id="t-group-sessions" aria-controls="g-sessions" aria-selected="true">Sessions</button>
      <button class="tab" type="button" role="tab" id="t-group-articles" aria-controls="g-articles" aria-selected="false" tabindex="-1">Articles</button>
    </div>

    <div role="tabpanel" id="g-sessions" aria-labelledby="t-group-sessions">
    <div class="tabs tabs--sub" role="tablist" aria-label="Sessions">
      <button class="tab" type="button" role="tab" id="t-sessions" aria-controls="p-sessions" aria-selected="true">Sessions</button>
      <button class="tab" type="button" role="tab" id="t-signups" aria-controls="p-signups" aria-selected="false" tabindex="-1">Sign-Ups <span class="tab__count" id="t-signups-count"></span></button>
      <button class="tab" type="button" role="tab" id="t-forms" aria-controls="p-forms" aria-selected="false" tabindex="-1">Forms <span class="tab__count" id="t-forms-count"></span></button>
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

    <div class="signups" role="tabpanel" id="p-forms" aria-labelledby="t-forms" hidden>
      <div class="signups__bar">
        <p class="signups__summary" id="f-summary">Loading form submissions&hellip;</p>
        <div class="form-actions">
          <button class="btn btn--secondary btn--small" type="button" id="f-refresh">Refresh</button>
        </div>
      </div>
      <p class="form-note" id="f-del-off" hidden>Deleting is switched off. Set DELETE_PASSWORD in Cloudflare and redeploy to turn it on.</p>
      <div class="signups__tools">
        <div class="admin-tools admin-tools--alone" id="f-tools" hidden>
          <label class="admin-check"><input type="checkbox" id="f-all"> Select all</label>
          <button class="btn btn--secondary" type="button" id="f-delete" disabled>Delete Selected</button>
        </div>
        <form class="admin-confirm" id="f-del-form" hidden novalidate>
          <p id="f-del-text"></p>
          <div class="field">
            <label for="f-del-pass">Delete Password</label>
            <input id="f-del-pass" type="password" autocomplete="off" maxlength="200" required>
          </div>
          <div class="form-actions">
            <button class="btn btn--primary" type="submit" id="f-del-go">Delete</button>
            <button class="btn btn--secondary" type="button" id="f-del-cancel">Cancel</button>
          </div>
        </form>
      </div>
      <p class="builder__msg" id="f-msg" role="alert"></p>
      <p class="form-note" id="f-status" role="status" aria-live="polite"></p>
      <div id="f-list"></div>
    </div>
    </div>

    <div role="tabpanel" id="g-articles" aria-labelledby="t-group-articles" hidden>
    <div class="tabs tabs--sub" role="tablist" aria-label="Articles">
      <button class="tab" type="button" role="tab" id="t-news" aria-controls="p-news" aria-selected="true">In the News <span class="tab__count" id="t-news-count"></span></button>
      <button class="tab" type="button" role="tab" id="t-updates" aria-controls="p-updates" aria-selected="false" tabindex="-1">Our Updates <span class="tab__count" id="t-updates-count"></span></button>
    </div>

    <div class="builder__grid" role="tabpanel" id="p-news" aria-labelledby="t-news">
      <form class="form-card" id="n-form" novalidate>
        <h2 id="n-heading">Add to In the News</h2>
          <div class="field">
            <label for="n-kind">List</label>
            <select id="n-kind" required><option value="article">Articles in the News</option><option value="podcast">Podcasts</option></select>
          </div>
          <div class="field">
            <label for="n-title">Headline</label>
            <input id="n-title" type="text" maxlength="200" required placeholder="Their headline, as they wrote it">
          </div>
        <div class="fgrid">
          <div class="field">
            <label for="n-source">Source</label>
            <input id="n-source" type="text" maxlength="80" required placeholder="NIH">
          </div>
          <div class="field">
            <label for="n-date">Date</label>
            <input id="n-date" type="date" required>
          </div>
        </div>
          <div class="field">
            <label for="n-url">Link</label>
            <input id="n-url" type="url" maxlength="500" required placeholder="https://">
          </div>
          <div class="field">
            <label for="n-note">Why It Is Worth Reading</label>
            <textarea id="n-note" maxlength="300" placeholder="One sentence in your own words."></textarea>
          </div>
          <div class="field">
            <label for="n-image">Picture (optional)</label>
            <input id="n-image" type="text" maxlength="500" placeholder="https://... or assets/news/picture.jpg">
            <p class="form-note">Only pictures you may use: your own, or work by US federal agencies such as NIH or NSF.</p>
          </div>
          <div class="field">
            <label for="n-credit">Picture Credit (optional)</label>
            <input id="n-credit" type="text" maxlength="120" placeholder="Image: NIH">
          </div>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit" id="n-save">Add to the Page</button>
          <button class="btn btn--secondary" type="button" id="n-cancel" hidden>Cancel Editing</button>
          <span class="form-note" id="n-form-status" role="status" aria-live="polite"></span>
        </div>
      </form>
      <div class="builder__out">
        <h2>On In the News</h2>
        <p class="form-note">Newest first. Edit opens an entry in the form; changes show on the page as soon as you save.</p>
        <p class="form-note" id="n-del-off" hidden>Deleting is switched off. Set DELETE_PASSWORD in Cloudflare and redeploy to turn it on.</p>
        <div>
          <div class="admin-tools" id="n-tools" hidden>
            <label class="admin-check"><input type="checkbox" id="n-all"> Select all</label>
            <button class="btn btn--secondary" type="button" id="n-delete" disabled>Delete Selected</button>
          </div>
          <form class="admin-confirm" id="n-del-form" hidden novalidate>
            <p id="n-del-text"></p>
            <div class="field">
              <label for="n-del-pass">Delete Password</label>
              <input id="n-del-pass" type="password" autocomplete="off" maxlength="200" required>
            </div>
            <div class="form-actions">
              <button class="btn btn--primary" type="submit" id="n-del-go">Delete</button>
              <button class="btn btn--secondary" type="button" id="n-del-cancel">Cancel</button>
            </div>
          </form>
          <ul class="admin-list" id="n-list" aria-live="polite"><li class="builder__empty">Loading entries&hellip;</li></ul>
        </div>
        <div class="admin-import" id="n-import" hidden>
          <p id="n-import-text"></p>
          <button class="btn btn--secondary btn--small" type="button" id="n-import-go">Copy Them In to Edit</button>
        </div>
        <p class="builder__msg" id="n-msg" role="alert"></p>
        <p class="form-note" id="n-status" role="status" aria-live="polite"></p>
      </div>
    </div>

    <div class="builder__grid" role="tabpanel" id="p-updates" aria-labelledby="t-updates" hidden>
      <form class="form-card" id="u-form" novalidate>
        <h2 id="u-heading">Add an Update</h2>
          <div class="field">
            <label for="u-title">Title</label>
            <input id="u-title" type="text" maxlength="160" required placeholder="We Met Our State Representative">
          </div>
        <div class="fgrid">
          <div class="field">
            <label for="u-label">Label (optional)</label>
            <input id="u-label" type="text" maxlength="40" placeholder="Event, Advocacy, Milestone">
          </div>
          <div class="field">
            <label for="u-date">Date</label>
            <input id="u-date" type="date" required>
          </div>
        </div>
          <div class="field">
            <label for="u-body">Text</label>
            <textarea id="u-body" class="admin-textarea--tall" maxlength="12000" required placeholder="What happened, who was there, and why it matters. Leave an empty line between paragraphs."></textarea>
          </div>
          <div class="field">
            <label for="u-image">Photo (optional)</label>
            <input id="u-image" type="text" maxlength="500" placeholder="https://... or assets/updates/photo.jpg">
            <p class="form-note">Only photos you may use, with permission from everyone recognisable in them.</p>
          </div>
        <div class="fgrid">
          <div class="field">
            <label for="u-alt">What the Photo Shows</label>
            <input id="u-alt" type="text" maxlength="200" placeholder="Four board members with the representative">
          </div>
          <div class="field">
            <label for="u-credit">Photo Credit (optional)</label>
            <input id="u-credit" type="text" maxlength="120" placeholder="Photo: Young Medical Engineers">
          </div>
        </div>
        <div class="fgrid">
          <div class="field">
            <label for="u-l1-text">Button 1 Words (optional)</label>
            <input id="u-l1-text" type="text" maxlength="60" placeholder="Save a Seat">
          </div>
          <div class="field">
            <label for="u-l1-href">Button 1 Link</label>
            <input id="u-l1-href" type="text" maxlength="500" placeholder="https://... or programs.html#sessions">
          </div>
          <div class="field">
            <label for="u-l2-text">Button 2 Words (optional)</label>
            <input id="u-l2-text" type="text" maxlength="60">
          </div>
          <div class="field">
            <label for="u-l2-href">Button 2 Link</label>
            <input id="u-l2-href" type="text" maxlength="500">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit" id="u-save">Add to the Page</button>
          <button class="btn btn--secondary" type="button" id="u-cancel" hidden>Cancel Editing</button>
          <span class="form-note" id="u-form-status" role="status" aria-live="polite"></span>
        </div>
      </form>
      <div class="builder__out">
        <h2>On Our Updates</h2>
        <p class="form-note">Newest first. Edit opens an update in the form; changes show on the page as soon as you save.</p>
        <p class="form-note" id="u-del-off" hidden>Deleting is switched off. Set DELETE_PASSWORD in Cloudflare and redeploy to turn it on.</p>
        <div>
          <div class="admin-tools" id="u-tools" hidden>
            <label class="admin-check"><input type="checkbox" id="u-all"> Select all</label>
            <button class="btn btn--secondary" type="button" id="u-delete" disabled>Delete Selected</button>
          </div>
          <form class="admin-confirm" id="u-del-form" hidden novalidate>
            <p id="u-del-text"></p>
            <div class="field">
              <label for="u-del-pass">Delete Password</label>
              <input id="u-del-pass" type="password" autocomplete="off" maxlength="200" required>
            </div>
            <div class="form-actions">
              <button class="btn btn--primary" type="submit" id="u-del-go">Delete</button>
              <button class="btn btn--secondary" type="button" id="u-del-cancel">Cancel</button>
            </div>
          </form>
          <ul class="admin-list" id="u-list" aria-live="polite"><li class="builder__empty">Loading updates&hellip;</li></ul>
        </div>
        <div class="admin-import" id="u-import" hidden>
          <p id="u-import-text"></p>
          <button class="btn btn--secondary btn--small" type="button" id="u-import-go">Copy Them In to Edit</button>
        </div>
        <p class="builder__msg" id="u-msg" role="alert"></p>
        <p class="form-note" id="u-status" role="status" aria-live="polite"></p>
      </div>
    </div>
    </div>
  </div>
</section>
</main>
</body>
</html>
`;
}
