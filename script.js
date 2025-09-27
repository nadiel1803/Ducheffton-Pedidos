import { db } from './firebase.js';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const modal = document.getElementById('modal');
const abrirModalBtn = document.getElementById('abrirModal');
const closeModal = document.querySelector('.close');
const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');
const submitBtn = document.getElementById('submitBtn');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

// ---------------- Helpers ----------------
function logAndAlertError(err, where = '') {
  console.error(`Erro${where ? ' em ' + where : ''}:`, err);
  // alerta simples (pode remover se encher)
  alert('Ocorreu um erro (veja console).');
}

function safeString(value) {
  return (value === undefined || value === null) ? '' : String(value);
}

// ---------------- Modal ----------------
abrirModalBtn.addEventListener('click', () => {
  modal.style.display = 'block';
  form.reset();
  enderecoContainer.style.display = 'none';
  submitBtn.textContent = 'Adicionar Pedido';
  editId = null;
});

closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
});

// ---------------- Submit (Adicionar / Atualizar) ----------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // captura segurando valores e forçando tipos
  const pedido = {
    nome: safeString(document.getElementById('nome').value).trim(),
    data: document.getElementById('data').value || '',
    numero: safeString(document.getElementById('numero').value).trim(),
    pagamento: safeString(document.getElementById('pagamento').value),
    entrega: safeString(document.getElementById('entrega').value),
    endereco: safeString(document.getElementById('endereco').value).trim(),
    itens: safeString(document.getElementById('itens').value).trim(),
    // transforma em número; se não for válido, 0
    valor: (() => {
      const v = parseFloat(document.getElementById('valor').value);
      return Number.isFinite(v) ? v : 0;
    })(),
    horario: document.getElementById('horario').value || '',
    pago: safeString(document.getElementById('pago').value)
  };

  console.log('Tentando salvar/atualizar pedido:', pedido);

  try {
    if (editId) {
      await updateDoc(doc(db, "pedidos", editId), pedido);
      console.log('Pedido atualizado:', editId);
      editId = null;
      submitBtn.textContent = 'Adicionar Pedido';
    } else {
      const docRef = await addDoc(pedidosColRef, pedido);
      console.log('Pedido adicionado com ID:', docRef.id);
    }

    form.reset();
    enderecoContainer.style.display = 'none';
    modal.style.display = 'none';
    // onSnapshot atualiza automaticamente
  } catch (err) {
    logAndAlertError(err, 'salvar pedido');
  }
});

// ---------------- Render seguro (cria card) ----------------
function criarCard(docSnap) {
  const raw = docSnap.data() || {};
  // logs pra debug se algum campo inesperado faltar
  if (raw.valor === undefined) {
    console.warn(`Documento ${docSnap.id} não tem campo 'valor' definido. Usando 0 como fallback.`);
  }

  const p = {
    nome: safeString(raw.nome) || '—',
    data: safeString(raw.data) || '—',
    horario: safeString(raw.horario) || '—',
    itens: safeString(raw.itens) || '—',
    valor: (function(){
      // tenta converter pro número; fallback 0
      const n = Number(raw.valor);
      return Number.isFinite(n) ? n : 0;
    })(),
    pago: safeString(raw.pago) || '—',
    entrega: safeString(raw.entrega) || 'Não',
    endereco: safeString(raw.endereco) || ''
  };

  const card = document.createElement('div');
  card.className = 'cardPedido';
  card.innerHTML = `
    <h3>${p.nome}</h3>
    <p><strong>Data:</strong> ${p.data} - <strong>Hora:</strong> ${p.horario}</p>
    <p><strong>Itens:</strong> ${p.itens}</p>
    <p><strong>Valor:</strong> R$${p.valor.toFixed(2)} - <strong>Pago:</strong> ${p.pago}</p>
    <p>${p.entrega === 'Sim' ? 'Entrega: ' + p.endereco : 'Retirada'}</p>
  `;

  // editar
  const btnEditar = document.createElement('button');
  btnEditar.className = 'btnEditar';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.addEventListener('click', () => {
    document.getElementById('nome').value = p.nome === '—' ? '' : p.nome;
    document.getElementById('data').value = p.data === '—' ? '' : p.data;
    document.getElementById('numero').value = raw.numero || '';
    document.getElementById('pagamento').value = raw.pagamento || '';
    document.getElementById('entrega').value = raw.entrega || 'Não';
    document.getElementById('endereco').value = raw.endereco || '';
    document.getElementById('itens').value = raw.itens || '';
    document.getElementById('valor').value = raw.valor !== undefined ? raw.valor : '';
    document.getElementById('horario').value = p.horario === '—' ? '' : p.horario;
    document.getElementById('pago').value = raw.pago || '';

    enderecoContainer.style.display = raw.entrega === 'Sim' ? 'block' : 'none';
    editId = docSnap.id;
    submitBtn.textContent = 'Atualizar Pedido';
    modal.style.display = 'block';
  });

  // excluir
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'btnExcluir';
  btnExcluir.textContent = '🗑️ Excluir';
  btnExcluir.addEventListener('click', async () => {
    try {
      if (confirm('Tem certeza que quer excluir este pedido?')) {
        await deleteDoc(doc(db, "pedidos", docSnap.id));
        console.log('Pedido excluído:', docSnap.id);
      }
    } catch (err) {
      logAndAlertError(err, 'excluir pedido');
    }
  });

  card.appendChild(btnEditar);
  card.appendChild(btnExcluir);
  return card;
}

// ---------------- onSnapshot em tempo real ----------------
onSnapshot(pedidosColRef, (snapshot) => {
  pedidosContainer.innerHTML = '';
  snapshot.forEach((docSnap) => {
    try {
      const card = criarCard(docSnap);
      pedidosContainer.appendChild(card);
    } catch (e) {
      console.error('Erro ao renderizar doc', docSnap.id, e);
    }
  });
}, (err) => {
  logAndAlertError(err, 'carregar pedidos (onSnapshot)');
});
