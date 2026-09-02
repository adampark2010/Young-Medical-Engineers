/**
 * PROVISIONAL: Hands-on demonstrations.
 *
 * The team has not finalised whether demonstrations run. Everything that
 * exists only because of demonstrations is gated on the one flag below:
 *   - the "Hands-on demonstrations" item under Programs > Building interest
 *   - the "or demo" wording in the Contact topic dropdown
 *   - the "Help with demonstrations" option on the Volunteer form
 *
 * To drop demonstrations in one commit: set SHOW_DEMONSTRATIONS to false.
 * Nothing else needs to change; the build, the audit and every page adapt.
 * (This file can be deleted later along with its import in copy.ts, but that
 * is optional cleanup, not part of the removal.)
 *
 * Note: the approved About intro and two Contact FAQ answers also mention
 * demonstrations in passing. Those are approved sentences and would need new
 * wording from the team.
 */
export const SHOW_DEMONSTRATIONS = true;

// Approved copy from the website update instructions, Programs page,
// Group 1: Building interest.
export const demonstrations = {
  name: 'Hands-on demonstrations',
  text: 'We bring demonstrations to schools and libraries. Students might build a working stethoscope to hear their own heartbeat, or see a 3D printed prosthetic hand in action. We reuse the same equipment across events, so participation costs students nothing.',
} as const;
