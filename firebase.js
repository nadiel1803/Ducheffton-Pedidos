// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Suas chaves de configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB2pPpPVRmcKC8D4clCL73PSyuwVUN8wpY",
  authDomain: "ducheffton-pedidos.firebaseapp.com",
  projectId: "ducheffton-pedidos",
  storageBucket: "ducheffton-pedidos.appspot.com", // corrigi para o padrão .appspot.com que é o mais comum
  messagingSenderId: "2379935099",
  appId: "1:2379935099:web:e5131fb3c7beeb9d59a1de"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do Firestore para ser usada em outros arquivos
export const db = getFirestore(app);