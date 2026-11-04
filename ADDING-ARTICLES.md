# Adding one of our own updates

**Our Updates** (`updates.html`) is YME's own news: an event we ran, a meeting
with a legislator, a new school we are working with, what is coming up. Each
update is an entry in `public/updates.json`. Add a new one at the top of the
`"updates"` list (the page sorts by date anyway, newest first):

    {
      "id": "meeting-representative-smith",
      "kind": "Advocacy",
      "title": "We Met Representative Smith About STEM in Schools",
      "date": "2026-11-20",
      "image": "assets/updates/representative-smith.jpg",
      "alt": "Four YME board members with Representative Smith in her office",
      "credit": "Photo: Young Medical Engineers",
      "body": [
        "First paragraph: what happened, who was there, when and where.",
        "Second paragraph: why it matters for students.",
        "Optional third paragraph: what happens next, or how to get involved."
      ],
      "links": [
        { "text": "Read the Bill", "href": "https://..." }
      ]
    }

(The names in that example are made up; write about what really happened.)

- `id`: lowercase words and dashes. The update's own link is
  `updates.html#` followed by the id, handy for Instagram and emails.
- `kind`: a short label shown above the title, such as `Event`, `Advocacy`,
  `Partnership` or `Milestone`. Optional.
- `date`: the day it happened or was posted, as `YYYY-MM-DD`.
- `body`: one string per paragraph. Plain text only; no HTML.
- `image`, `alt`, `credit`: optional. Put the photo in
  `public/assets/updates/`, about 1600 pixels wide. `alt` says what is in the
  picture for anyone who cannot see it. Only use photos you may: your own,
  with permission from everyone recognisable in them (and from a parent for
  students under 18).
- `links`: optional buttons under the update. The first one is red, the
  rest are outlined. Links to other sites open in a new tab.

Keep it factual: only write what the team can confirm.

# Adding a news link

The Articles page is two curated lists of other people's work, both read from
`public/news.json`: `"articles"` and `"podcasts"`. Add an entry at the top of
whichever list it belongs in. The page describes itself as a monthly round-up,
so it is worth adding a few each month rather than letting it go stale.

    {
      "title": "Their headline, as they wrote it",
      "source": "Publication name",
      "date": "2026-11-14",
      "url": "https://...",
      "note": "One sentence in your own words on why it is worth reading."
    }

Add `"image"` and `"credit"` to give it a thumbnail (see below). An entry
without them is a text card, which is how the articles list currently runs,
because the sources it links to publish no images.

Nothing else to change. The page reads the file on load.

## Images

A card shows a thumbnail if you add `"image"`, and a credit line under it if
you add `"credit"`:

      "image": "assets/news/smart-bandage.jpg",
      "credit": "Photo: NIH"

`image` can be a file you put in `public/assets/news/`, or a full URL.
Prefer the local copy: a linked image breaks the day the source reorganises.

Some sites publish a bigger file than the one on the page. NIH, for instance,
serves a 344px version in the article but keeps the 1920px original one path
up, with the `/styles/<name>/public/` segment removed. Worth checking before
settling for a small one.

The site cannot fetch these by itself. When you paste a link into Slack or
iMessage and a picture appears, that app's *server* fetched the page and read
its `og:image` tag. This site is static files on GitHub Pages, so there is no
server of ours to do that, and browser JavaScript is not allowed to read
another site's HTML. So the image has to be named in `news.json`.

Not every article has one to take. The four NIBIB items seeded here publish
no `og:image` at all, which is why they are text only.

Pick images you are allowed to use. Work by US federal agencies (NIH, NSF,
NASA, FDA) is public domain, so those are the safe default. Universities and
companies are not: a Caltech photo credited "Credit: Caltech" is Caltech's
property. Using one as a credited thumbnail that links back to their article
is ordinary practice and low risk, but it is a judgement call rather than a
right, so credit it properly and drop it if ever asked.

Downloading a copy into `public/assets/news/` is better than linking to the
original, which breaks when they move it.

When a government page is summarising someone else's research, the original
institution's page is usually the better link: it is the primary source and it
normally has the pictures.

**Write your own note.** Linking to someone's article with their headline and
a credit is normal and fine. Copying their summary paragraph is not.
