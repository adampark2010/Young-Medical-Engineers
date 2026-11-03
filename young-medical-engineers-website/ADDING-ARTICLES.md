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
