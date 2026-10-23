import { createSessionsHandler } from '../lib/sessions.js';
import { createStore } from '../lib/database.js';
export default { fetch: createSessionsHandler({ storeFactory: createStore }) };
