import { firebaseApi } from './firebaseApi.js';
import { mockApi } from './mockApi.js';

// Por padrão conecta ao Firebase real (Auth Google + Firestore).
// Para testar com dados fictícios offline, defina VITE_USE_FIREBASE=false no .env.
export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE !== 'false';
export const api = USE_FIREBASE ? firebaseApi : mockApi;
