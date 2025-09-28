import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('emailLogin');
const senhaInput = document.getElementById('senhaLogin');
const loginMsg = document.getElementById('loginMsg');

loginBtn.addEventListener('click', async () => {
  loginMsg.textContent = '';
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    loginMsg.textContent = 'Preencha email e senha!';
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (err) {
    console.error('Erro login:', err);
    loginMsg.textContent = 'Email ou senha inválidos!';
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authOverlay.style.display = 'none';
    appContainer.style.display = 'block';
  } else {
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
  }
});
