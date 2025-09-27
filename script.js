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
const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');
const submitBtn = document.getElementById('submitBtn');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

/* Helpers */
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

/* Mostrar/ocultar endereço */
entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
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
      submitBtn.textContent = "Adicionar Pedido";
    } else {
      await addDoc(pedidosColRef, pedido);
    }
    form.reset();
    enderecoContainer.style.display = "none";
  } catch (err) {
    console.error("Erro ao salvar pedido:", err);
    alert("Erro ao salvar pedido.");
  }
});

/* Impressão */
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
        body { font-family: monospace; margin: 6px; font-size: 12px; }
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
      <div><strong>Data:</strong> ${escapeHtml(p.data)} <strong>Hora:</strong> ${escapeHtml(p.horario)}</div>
      <div><strong>Nº:</strong> ${escapeHtml(p.numero)} <strong>Pag:</strong> ${escapeHtml(p.pagamento)}</div>
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
          setTimeout(() => { window.print(); window.close(); }, 300);
        };
      </script>
    </body>
  </html>`;
  const w = window.open('', '_blank', 'width=350,height=700');
  w.document.write(reciboHTML);
  w.document.close();
}

/* Criar card */
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
    <h4>${p.nome}</h4>
    <p><strong>Hora:</strong> ${p.horario}</p>
    <p><strong>Itens:</strong> ${p.itens}</p>
    <p><strong>Valor:</strong> R$${p.valor.toFixed(2)} - <strong>Pago:</strong> ${p.pago}</p>
    <p>${p.entrega === 'Sim' ? 'Entrega: ' + p.endereco : 'Retirada'}</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'actions';

  // Editar
  const btnEditar = document.createElement('button');
  btnEditar.className = 'btnEditar';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.onclick = () => {
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
  };

  // Imprimir
  const btnImprimir = document.createElement('button');
  btnImprimir.className = 'btnImprimir';
  btnImprimir.textContent = '🖨️ Imprimir';
  btnImprimir.onclick = () => printReceipt(docSnap);

  // Excluir
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'btnExcluir';
  btnExcluir.textContent = '🗑️ Excluir';
  btnExcluir.onclick = async () => {
    if (confirm('Excluir este pedido?')) {
      await deleteDoc(doc(db, "pedidos", docSnap.id));
    }
  };

  actions.append(btnEditar, btnImprimir, btnExcluir);
  card.appendChild(actions);

  return card;
}

/* Renderização agrupada */
let pedidosCache = [];
function renderPedidos() {
  pedidosContainer.innerHTML = '';

  // Agrupar por data
  const pedidosPorData = {};
  pedidosCache.forEach(docSnap => {
    const data = docSnap.data().data || 'Sem data';
    if (!pedidosPorData[data]) pedidosPorData[data] = [];
    pedidosPorData[data].push(docSnap);
  });

  Object.keys(pedidosPorData).sort().forEach(data => {
    const pedidosDoDia = pedidosPorData[data];

    // Container do dia
    const diaDiv = document.createElement('div');
    diaDiv.className = 'diaPedidos';

    // Header do dia + select de ordem
    const header = document.createElement('div');
    header.className = 'diaHeader';

    const title = document.createElement('h3');
    title.textContent = data;

    const ordenarSelect = document.createElement('select');
    ordenarSelect.innerHTML = `
      <option value="asc">Horário ↑</option>
      <option value="desc">Horário ↓</option>
    `;

    header.append(title, ordenarSelect);
    diaDiv.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'pedidosGrid';

    function renderGrid() {
      grid.innerHTML = '';
      const ordenados = pedidosDoDia.slice().sort((a, b) => {
        const horaA = a.data().horario || '';
        const horaB = b.data().horario || '';
        return ordenarSelect.value === 'asc'
          ? horaA.localeCompare(horaB)
          : horaB.localeCompare(horaA);
      });
      ordenados.forEach(docSnap => grid.appendChild(criarCard(docSnap)));
    }

    ordenarSelect.addEventListener('change', renderGrid);
    renderGrid();

    diaDiv.appendChild(grid);
    pedidosContainer.appendChild(diaDiv);
  });
}

/* snapshot em tempo real */
onSnapshot(pedidosColRef, (snapshot) => {
  pedidosCache = [];
  snapshot.forEach((docSnap) => pedidosCache.push(docSnap));
  renderPedidos();
}, (err) => {
  console.error("Erro ao carregar pedidos:", err);
  alert("Erro ao carregar pedidos.");
});
