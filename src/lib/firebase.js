// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Optional for future use
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAE57jEozOA3Dur79-GZdu9nRtaCis1Ugs",
  authDomain: "lost-and-found-c315f.firebaseapp.com",
  projectId: "lost-and-found-c315f",
  storageBucket: "lost-and-found-c315f.firebasestorage.app",
  messagingSenderId: "750660525319",
  appId: "1:750660525319:web:a0bd166c38fd8fd92579a2",
  measurementId: "G-P50JSLF01W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize other services you might need
export const db = getFirestore(app); // For Firestore database
