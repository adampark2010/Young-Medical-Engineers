import { deleteIds, deletePassword, signedIn } from './auth.js';
import { EMAIL, UUID, databaseFailure, isJson, json, readJson, sameOrigin, text } from './http.js';

/* The website's three forms and what each one keeps: [the field's name in the form, longest allowed,
   true when line breaks are kept]. Every field is required. The names are the labels admins see. */
export const FORMS = {
  tutoring: { title: 'Tutoring request', fields: [['Student name', 100], ['Email', 254], ['Grade level', 60], ['Subject', 80], ['Goals', 2000, true], ['Permission', 120]] },
  volunteer: { title: 'Volunteer application', fields: [['Name', 100], ['Email', 254], ['Institution', 160], ['Availability', 60], ["How you'd like to help", 80], ['Subjects', 2000, true]] },
  contact: { title: 'Message', fields: [['Name', 100], ['Email', 254], ['Topic', 80], ['Message', 5000, true]] }
};

/* Returns { id, form, fields } with fields as [name, answer] pairs in the form's order, or null if
   anything is missing or invalid. Anything the form did not ask for is left out. */
export function validForm(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !UUID.test(x.id)) return null;
  const spec = Object.hasOwn(FORMS, x.form) ? FORMS[x.form] : null;
  if (!spec || !x.fields || typeof x.fields !== 'object') return null;
  const fields = [];
  for (const [name, max, lines] of spec.fields) {
    const answer = text(x.fields[name], max, lines);
    if (!answer) return null;
    if (name === 'Email' && !EMAIL.test(answer)) return null;
    fields.push([name, answer]);
  }
  return { id: x.id.toLowerCase(), form: x.form, fields };
}

/* POST: anyone sends a form from the website. GET: signed-in admins read every submission.
   DELETE: admins remove some, with the DELETE_PASSWORD. */
export function createFormsHandler({ env = process.env, storeFactory } = {}) {
  return async function forms(request) {
    const method = request.method;
    if (!['GET', 'POST', 'DELETE'].includes(method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
    if (!env.DATABASE_URL) return json(503, { error: 'The database is not connected. Set DATABASE_URL in Cloudflare and redeploy.' });
    if (method !== 'POST') {
      const gate = await signedIn(request, env);
      if (gate.response) return gate.response;
    }
    try {
      const store = storeFactory(env.DATABASE_URL);
      if (method === 'GET') return json(200, { canDelete: Boolean(deletePassword(env)), submissions: await store.formSubmissions() });
      if (!sameOrigin(request)) return json(403, { error: method === 'POST' ? 'Please use the form on the YME website.' : 'Please manage submissions from the YME admin page.' });
      if (!isJson(request)) return json(415, { error: 'Please use the form on the website.' });
      if (method === 'DELETE' && !deletePassword(env)) return json(503, { error: 'Deleting is switched off. Add DELETE_PASSWORD in Cloudflare and redeploy.' });
      let data;
      try { data = await readJson(request); } catch { return json(400, { error: 'We could not read that request. Please try again.' }); }
      if (method === 'DELETE') {
        const ids = deleteIds(data, env);
        return ids instanceof Response ? ids : json(200, { removed: await store.removeFormSubmissions(ids) });
      }
      /* the forms have a hidden box people never see; anything typed there came from a bot */
      if (typeof data?._honey === 'string' && data._honey.trim()) return json(200, { saved: true });
      const entry = validForm(data);
      if (!entry) return json(400, { error: 'Please fill in every field, with a valid email address.' });
      await store.addFormSubmission(entry); /* a retry with the same id is saved once */
      return json(200, { saved: true });
    } catch (error) {
      return databaseFailure(error, {
        GET: 'Form submissions are temporarily unavailable.',
        POST: 'Sending is temporarily unavailable. Please try again.',
        DELETE: 'Deleting is temporarily unavailable. Please try again.'
      }[method]);
    }
  };
}
