/**
 * Site-wide constants and switches.
 */

// PROVISIONAL: Hands-on demonstrations. The switch lives next to the copy it
// gates; see src/content/provisional-demonstrations.ts for how to remove it.
export { SHOW_DEMONSTRATIONS } from './content/provisional-demonstrations';

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
