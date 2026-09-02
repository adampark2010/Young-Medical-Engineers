/**
 * Site-wide switches.
 *
 * PROVISIONAL: Hands-on demonstrations.
 * The team has not finalised whether demonstrations run. Everything that
 * exists only because of demonstrations is gated on this one flag:
 *   - the "Hands-on demonstrations" item under Programs > Building interest
 *     (src/content/provisional-demonstrations.ts)
 *   - the "or demo" wording in the Contact topic dropdown
 *   - the "Help with demonstrations" option on the Volunteer form
 * To drop demonstrations in one commit: set this to false and delete
 * src/content/provisional-demonstrations.ts.
 */
export const SHOW_DEMONSTRATIONS = true;

export const SITE = {
  name: 'Young Medical Engineers',
  url: 'https://www.medengineers.org',
  email: 'youngmedicalengineers@gmail.com',
  instagramHandle: '@ym_engineers',
  instagramUrl: 'https://www.instagram.com/ym_engineers',
  // Carried forward from the previous site. The PayPal business account is
  // the same email address used for contact.
  paypalUrl:
    'https://www.paypal.com/donate/?business=youngmedicalengineers%40gmail.com&currency_code=USD&item_name=Young+Medical+Engineers',
} as const;

// TODO(forms): no submission endpoint exists yet. When one does (Formspree,
// a Google Apps Script, a Cloudflare Worker, etc.), set it here. Until it is
// set, the forms show their error message on submit and point people to email.
export const FORM_ENDPOINT: string | null = null;
