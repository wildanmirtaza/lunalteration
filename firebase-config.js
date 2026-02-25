import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCTvqvxHSc3L1qqEahUkuulYYmIaPYCoc",
  authDomain: "lunalteration.firebaseapp.com",
  projectId: "lunalteration",
  storageBucket: "lunalteration.firebasestorage.app",
  messagingSenderId: "581524538927",
  appId: "1:581524538927:web:1d8d0986c2f893960768da"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);