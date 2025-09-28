// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2pPpPVRmcKC8D4clCL73PSyuwVUN8wpY",
  authDomain: "ducheffton-pedidos.firebaseapp.com",
  projectId: "ducheffton-pedidos",
  storageBucket: "ducheffton-pedidos.firebasestorage.app",
  messagingSenderId: "2379935099",
  appId: "1:2379935099:web:e5131fb3c7beeb9d59a1de"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log('Firebase inicializado:', app.name || '(default)');
console.log('Firestore pronto:', db ? 'ok' : 'db undefined');
console.log('Auth pronto:', auth ? 'ok' : 'auth undefined');
