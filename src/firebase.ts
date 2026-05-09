import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAlQ-zz01fA9BDD44hKJGZxvXNmwVXXNBo',
  authDomain: 'liu-services-ba852.firebaseapp.com',
  projectId: 'liu-services-ba852',
  storageBucket: 'liu-services-ba852.firebasestorage.app',
  messagingSenderId: '665546623506',
  appId: '1:665546623506:web:604df57bd735af03c4a6cb',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
