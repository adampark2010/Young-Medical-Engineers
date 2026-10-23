# Assets

**Logo files** (`logo-full.png`, `logo-mark.png`, `logo-word.png`, `favicon.png`)
are the YME brand, recolored in September 2026 to the sharper palette used in
`style.css`. In October 2026 the cross outline changed from red to steel `#5F6F8F`
(light steel `#B9C2D3` in the dark files): a red cross on white is a protected
emblem (18 U.S.C. § 706), so keep the cross out of red. The untouched originals,
still with the old red cross, are in `logo-original/`; do not use them on the site.
The white site header uses `logo-full.png`. `logo-full-dark.png` and
`logo-mark-dark.png` are variants for dark backgrounds (white "Young", brighter
red, lighter gear), kept for dark uses such as the social card.

`og-card.jpg` is the 1200 x 630 image used when a page is shared on social media
or in messages; regenerate it if the logo changes.

## Photos

Pages show a photo wherever the matching file exists in this folder and fall back
to an inline illustration (home page) or a text-only hero (subpages) otherwise.
After adding or replacing a file, re-run the page generator (or ask Claude to).

- `photo-hero.jpg`: home hero, a scientist showing a group of students an experiment
  in a lab (1500 x 996). **Before this goes live, confirm the photo's license and
  that the students pictured (or their parents) consented, and add a credit if one
  is required.** It appears to come from a national laboratory's outreach program.
- `photo-involved.jpg`: home "Get involved" band, robotic hand reaching forward (1000 x 545).
- `photo-lab.jpg`: About page hero, engineers with a prototype exoskeleton (960 x 540).
- `photo-programs.jpg`: Programs page hero, engineers working on a prosthetic hand (678 x 452).

All four are downsized web copies and will look soft on high-resolution screens.
Replace each with a larger original (1600 px wide or more) under the same filename
when available, and make sure every photo is licensed for use on the site.

## Board headshots

Stored in `board/` as `first-last.jpg`, square, up to 800 x 800 px, cropped around
the face from the photos in the team's bios document. They fill the top of each
board card, so larger originals (1000 px or more) are welcome. The board page shows a headshot whenever a
file named after the member exists (for example `board/jungsoo-park.jpg`) and
falls back to initials otherwise. Add or replace a file, then re-run the page
generator (or ask Claude to).
