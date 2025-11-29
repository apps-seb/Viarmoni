import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkcFFE_E-GzSVVUdfCew4fscnV6PHkH0I",
  authDomain: "viarmoni.firebaseapp.com",
  projectId: "viarmoni",
  storageBucket: "viarmoni.firebasestorage.app",
  messagingSenderId: "765794389868",
  appId: "1:765794389868:web:d7bedf9297d0458e616d49"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
