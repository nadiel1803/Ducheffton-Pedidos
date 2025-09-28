import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  loginError.textContent = '';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = 'Erro ao logar: ' + err.message;
  }
});

onAuthStateChanged(auth, (user) => {
  const overlay = document.getElementById('authOverlay');
  const app = document.getElementById('appContainer');

  if (user) {
    overlay.style.display = 'none';
    app.style.display = 'block';
    // Aqui garantimos que a função de renderizar pedidos seja chamada
    import('./script.js').then(m => m.renderPedidos());
  } else {
    overlay.style.display = 'flex';
    app.style.display = 'none';
  }
});
