// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig"; // import the config

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore instance and utilities
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export { collection, addDoc, serverTimestamp, getDocs };
