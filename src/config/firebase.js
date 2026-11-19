import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAoRiRn5Nzm46VbOlKouHhN3HlqPN4Hcag',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fincontrol-9db2c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fincontrol-9db2c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fincontrol-9db2c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '274144556700',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:274144556700:web:d1b49da0ff1dc91a601f59',
};

let cached;

export function getFirebase() {
  if (cached) return cached;
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  const googleProvider = new GoogleAuthProvider();
  cached = { app, auth, db, googleProvider };
  return cached;
}

export {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onAuthStateChanged,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
  updateDoc,
  where,
};
