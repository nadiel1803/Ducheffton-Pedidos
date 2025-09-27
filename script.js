import { db } from './firebase.js';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* DOM */
const modal = document.getElementById('modal');
const abrirModalBtn = document.getElementById('abrirModal');
const closeModalBtn = document.querySelector('.close');
const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');
const submitBtn = document.getElementById('submitBtn');
const ordenarSelect = document.getElementById('ordenarHorario');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

/* Dirty flag */
let isDirty = false;
function markDirty() { isDirty = true; }
function clearDirty() { isDirty = false; }
function resetFormAndDirty() { form.reset(); enderecoContainer.style.display = 'none'; clearDirty(); }

/* Helpers */
function logAndAlertError(err, where = '') {
  console.error(`Erro${where ? ' em ' + where : ''}:`, err);
  alert('Ocorreu um erro (veja console).');
}

function safeString(value) {
  return (value === undefined || value === null) ? '' : String(value);
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Modal */
function openModalForNew() {
  modal.style.display = 'block';
  resetFormAndDirty();
  submitBtn.textContent = 'Adicionar Pedido';
  editId = null;
}

function openModalForEdit() {
  modal.style.display = 'block';
  clearDirty();
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
  return false;
}

abrirModalBtn.addEventListener('click', openModalForNew);
closeModalBtn.addEventListener('click', async () => await tryCloseModal());
window.addEventListener('click', async (e) => { if (e.target === modal) await tryCloseModal(); });
window.addEventListener('keydown', async (e) => { if (e.key === 'Escape' && modal.style.display === 'block') await tryCloseModal(); });

/* marcar dirty */
[...form.querySelectorAll('input, textarea, select')].forEach(el => {
  el.addEventListener('input', markDirty);
  el.addEventListener('change', markDirty);
});

/* mostrar/ocultar endereço */
entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
  markDirty();
});

/* Submit (Adicionar / Atualizar) */
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

  try {
    if (editId) {
      await updateDoc(doc(db, "pedidos", editId), pedido);
      editId = null;
    } else {
      await addDoc(pedidosColRef, pedido);
    }

    resetFormAndDirty();
    modal.style.display = 'none';
  } catch (err) {
    logAndAlertError(err, 'salvar pedido');
  }
});

/* impressão */
function printReceipt(docSnap) {
  const raw = docSnap.data() || {};
  const p = {
    nome: raw.nome || '',
    data: raw.data || '',
    horario: raw.horario || '',
    itens: raw.itens || '',
    valor: (Number.isFinite(Number(raw.valor)) ? Number(raw.valor) : 0).toFixed(2),
    numero: raw.numero || '',
    pagamento: raw.pagamento || '',
    entrega: raw.entrega || 'Não',
    endereco: raw.endereco || '',
    pago: raw.pago || ''
  };

  const reciboHTML = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Recibo</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: monospace;
          margin: 6px;
          color: #000;
          background: #fff;
          font-size: 12px;
          line-height: 1.2;
        }
        .center { text-align:center; }
        .bold { font-weight:700; }
        hr { border:0; border-top:1px dashed #000; margin:6px 0; }
        .items { margin-top:6px; white-space: pre-wrap; font-size:11px; }
        .small { font-size:11px; }
        .right { text-align:right; }
      </style>
    </head>
    <body>
      <div class="center bold">DuCheffton</div>
      <div class="center small">Pedido - Recibo</div>
      <hr>
      <div><strong>Cliente:</strong> ${escapeHtml(p.nome)}</div>
      <div><strong>Data:</strong> ${escapeHtml(p.data)}  <strong>Hora:</strong> ${escapeHtml(p.horario)}</div>
      <div><strong>Nº:</strong> ${escapeHtml(p.numero)}  <strong>Pag:</strong> ${escapeHtml(p.pagamento)}</div>
      <div><strong>Entrega:</strong> ${escapeHtml(p.entrega)}</div>
      ${p.entrega === 'Sim' ? `<div><strong>Endereço:</strong> ${escapeHtml(p.endereco)}</div>` : ''}
      <hr>
      <div class="items">${escapeHtml(p.itens)}</div>
      <hr>
      <div class="right bold">TOTAL: R$ ${p.valor}</div>
      <div class="small">Pago: ${escapeHtml(p.pago)}</div>
      <hr>
      <div class="center small">Obrigado! Volte sempre :)</div>
      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
            setTimeout(() => { window.close(); }, 600);
          }, 200);
        };
      </script>
    </body>
  </html>
  `;

  const w = window.open('', '_blank', 'width=350,height=700');
  if (!w) {
    alert('Pop-up bloqueado. Libere pop-ups para este site para permitir impressão automática.');
    return;
  }
  w.document.open();
  w.document.write(reciboHTML);
  w.document.close();
}

/* criar card */
function criarCard(docSnap) {
  const raw = docSnap.data() || {};
  const p = {
    nome: safeString(raw.nome) || '—',
    data: safeString(raw.data) || '—',
    horario: safeString(raw.horario) || '—',
    itens: safeString(raw.itens) || '—',
    valor: (() => { const n = Number(raw.valor); return Number.isFinite(n) ? n : 0; })(),
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

  const actions = document.createElement('div');
  actions.className = 'actions';

  /* Editar */
  const btnEditar = document.createElement('button');
  btnEditar.className = 'btnEditar';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.addEventListener('click', () => {
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
    clearDirty();
    openModalForEdit();
  });

  /* Imprimir */
  const btnImprimir = document.createElement('button');
  btnImprimir.className = 'btnImprimir';
  btnImprimir.textContent = '🖨️ Imprimir';
  btnImprimir.addEventListener('click', () => {
    printReceipt(docSnap);
  });

  /* Excluir */
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'btnExcluir';
  btnExcluir.textContent = '🗑️ Excluir';
  btnExcluir.addEventListener('click', async () => {
    try {
      if (confirm('Tem certeza que quer excluir este pedido?')) {
        await deleteDoc(doc(db, "pedidos", docSnap.id));
      }
    } catch (err) {
      logAndAlertError(err, 'excluir pedido');
    }
  });

  actions.appendChild(btnEditar);
  actions.appendChild(btnImprimir);
  actions.appendChild(btnExcluir);
  card.appendChild(actions);

  return card;
}

/* ---- ORDENAÇÃO ---- */
let pedidosCache = []; // guarda docs
function renderPedidos() {
  pedidosContainer.innerHTML = '';

  const ordem = ordenarSelect.value;
  const pedidosOrdenados = [...pedidosCache].sort((a, b) => {
    const horaA = a.data().horario || '';
    const horaB = b.data().horario || '';
    if (!horaA && !horaB) return 0;
    if (!horaA) return 1;
    if (!horaB) return -1;

    return ordem === 'asc'
      ? horaA.localeCompare(horaB)
      : horaB.localeCompare(horaA);
  });

  pedidosOrdenados.forEach(docSnap => {
    try {
      const card = criarCard(docSnap);
      pedidosContainer.appendChild(card);
    } catch (e) {
      console.error('Erro ao renderizar doc', docSnap.id, e);
    }
  });
}

ordenarSelect.addEventListener('change', renderPedidos);

/* snapshot em tempo real */
onSnapshot(pedidosColRef, (snapshot) => {
  pedidosCache = [];
  snapshot.forEach((docSnap) => pedidosCache.push(docSnap));
  renderPedidos();
}, (err) => {
  logAndAlertError(err, 'carregar pedidos (onSnapshot)');
});
