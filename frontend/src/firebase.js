import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCB9xDGxm6TfPlPshw8PwZOIId99u9QxMM",
  authDomain: "autoservicebull.firebaseapp.com",
  databaseURL: "https://autoservicebull-default-rtdb.firebaseio.com",
  projectId: "autoservicebull",
  storageBucket: "autoservicebull.appspot.com",
  messagingSenderId: "962456284064",
  appId: "1:962456284064:web:a13b04030ea602743312c5",
  measurementId: "G-QJXTQK51S4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
