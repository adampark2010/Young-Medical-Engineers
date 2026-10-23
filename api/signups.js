import { createSignupsHandler } from '../lib/signups.js';
import { createStore } from '../lib/database.js';
export default { fetch: createSignupsHandler({ storeFactory: createStore }) };
