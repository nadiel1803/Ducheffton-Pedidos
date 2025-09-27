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
const closeModalBtn = document.querySelector('.close');
const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');
const submitBtn = document.getElementById('submitBtn');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

// FLAG que indica se o formulário foi alterado desde a última limpeza/salvamento
let isDirty = false;

// ---------------- Helpers ----------------
function logAndAlertError(err, where = '') {
  console.error(`Erro${where ? ' em ' + where : ''}:`, err);
  alert('Ocorreu um erro (veja console).');
}

function safeString(value) {
  return (value === undefined || value === null) ? '' : String(value);
}

function markDirty() {
  isDirty = true;
}

function clearDirty() {
  isDirty = false;
}

// Reseta o form e limpa flag
function resetFormAndDirty() {
  form.reset();
  enderecoContainer.style.display = 'none';
  clearDirty();
}

// ---------------- Modal open/close com confirmação ----------------
function openModalForNew() {
  modal.style.display = 'block';
  resetFormAndDirty();
  submitBtn.textContent = 'Adicionar Pedido';
  editId = null;
}

function openModalForEdit() {
  modal.style.display = 'block';
  // não resetar, os campos serão preenchidos antes de abrir pelo fluxo de edição
  clearDirty(); // marca que naquele momento ainda não tem alterações "novas"
}

async function tryCloseModal() {
  if (!isDirty) {
    modal.style.display = 'none';
    resetFormAndDirty();
    editId = null;
    return true;
  }
  const ok = confirm('Você tem alterações não salvas. Deseja descartar?');
  if (ok) {
    modal.style.display = 'none';
    resetFormAndDirty();
    editId = null;
    return true;
  }
  // se escolheu cancelar, mantém o modal aberto
  return false;
}

// abrir modal (novo)
abrirModalBtn.addEventListener('click', () => {
  openModalForNew();
});

// fechar pelo X (verifica dirty)
closeModalBtn.addEventListener('click', async () => {
  await tryCloseModal();
});

// clique fora do modal: agora chama tryCloseModal ao invés de fechar direto
window.addEventListener('click', async (e) => {
  if (e.target === modal) {
    await tryCloseModal();
  }
});

// tecla ESC: tenta fechar com confirmação se dirty
window.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && modal.style.display === 'block') {
    await tryCloseModal();
  }
});

// ---------------- detectar mudanças no form (marcar dirty) ----------------
// adiciona listener de input/change a todos os controls do formulário
[...form.querySelectorAll('input, textarea, select')].forEach(el => {
  el.addEventListener('input', markDirty);
  el.addEventListener('change', markDirty);
});

// quando abrir para edição, a gente vai preencher os campos e resetar a flag de dirty
// (isso é feito no fluxo de edição abaixo por clearDirty())

// ---------------- Mostrar/ocultar endereço ----------------
entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
  markDirty();
});

// ---------------- Submit (Adicionar / Atualizar) ----------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const pedido = {
    nome: safeString(document.getElementById('nome').value).trim(),
    data: document.getElementById('data').value || '',
    numero: safeString(document.getElementById('numero').value).trim(),
    pagamento: safeString(document.getElementById('pagamento').value),
    entrega: safeString(document.getElementById('entrega').value),
    endereco: safeString(document.getElementById('endereco').value).trim(),
    itens: safeString(document.getElementById('itens').value).trim(),
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
    } else {
      const docRef = await addDoc(pedidosColRef, pedido);
      console.log('Pedido adicionado com ID:', docRef.id);
    }

    resetFormAndDirty();
    modal.style.display = 'none';
  } catch (err) {
    logAndAlertError(err, 'salvar pedido');
  }
});

// ---------------- Render seguro (cria card) ----------------
function criarCard(docSnap) {
  const raw = docSnap.data() || {};
  if (raw.valor === undefined) {
    console.warn(`Documento ${docSnap.id} não tem campo 'valor' definido. Usando 0 como fallback.`);
  }

  const p = {
    nome: safeString(raw.nome) || '—',
    data: safeString(raw.data) || '—',
    horario: safeString(raw.horario) || '—',
    itens: safeString(raw.itens) || '—',
    valor: (function(){
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
    // preenche campos com raw (não p, pra manter os tipos originais)
    document.getElementById('nome').value = raw.nome || '';
    document.getElementById('data').value = raw.data || '';
    document.getElementById('numero').value = raw.numero || '';
    document.getElementById('pagamento').value = raw.pagamento || '';
    document.getElementById('entrega').value = raw.entrega || 'Não';
    document.getElementById('endereco').value = raw.endereco || '';
    document.getElementById('itens').value = raw.itens || '';
    document.getElementById('valor').value = raw.valor !== undefined ? raw.valor : '';
    document.getElementById('horario').value = raw.horario || '';
    document.getElementById('pago').value = raw.pago || '';

    enderecoContainer.style.display = raw.entrega === 'Sim' ? 'block' : 'none';
    editId = docSnap.id;
    submitBtn.textContent = 'Atualizar Pedido';
    clearDirty(); // limpamos a flag porque acabamos de preencher os campos programaticamente
    openModalForEdit();
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
