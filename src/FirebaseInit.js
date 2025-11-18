import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyChHAGbs6yBJ04Pe_1XTyDTcWSOW04Yl0M",
  authDomain: "mila-phone-realtime.firebaseapp.com",

  // WAJIB ditambahkan ↓↓↓
  databaseURL: "https://mila-phone-realtime-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "mila-phone-realtime",
  storageBucket: "mila-phone-realtime.firebasestorage.app",
  messagingSenderId: "283562738302",
  appId: "1:283562738302:web:0238792f8da3a3ffc3ce2f"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
