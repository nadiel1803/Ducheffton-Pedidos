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
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');
const ordenarSelect = document.getElementById('ordenarHorario');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

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

function formatarDataParaExibicao(dataString) {
    if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
        return "Data Inválida";
    }
    const [ano, mes, dia] = dataString.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    return dataObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // Importante para evitar problemas de fuso
    });
}

/* Gerenciamento do Formulário */
function resetForm() {
    form.reset();
    enderecoContainer.style.display = 'none';
    editId = null;
    submitBtn.textContent = 'Adicionar Pedido';
    formTitle.textContent = 'Adicionar Novo Pedido';
    cancelBtn.style.display = 'none'; // Esconde o botão de cancelar
}

// Evento para o botão de cancelar edição
cancelBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja cancelar a edição? As alterações serão perdidas.')) {
        resetForm();
    }
});

/* mostrar/ocultar endereço */
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
    } else {
      await addDoc(pedidosColRef, pedido);
    }
    resetForm();
  } catch (err) {
    logAndAlertError(err, 'salvar pedido');
  }
});

/* impressão (código idêntico ao seu) */
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
        body { font-family: monospace; margin: 6px; color: #000; background: #fff; font-size: 12px; line-height: 1.2; }
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
    <h3>${escapeHtml(p.nome)}</h3>
    <p><strong>Hora:</strong> ${escapeHtml(p.horario)}</p>
    <p><strong>Itens:</strong> ${escapeHtml(p.itens)}</p>
    <p><strong>Valor:</strong> R$${p.valor.toFixed(2)} - <strong>Pago:</strong> ${escapeHtml(p.pago)}</p>
    <p>${p.entrega === 'Sim' ? '<strong>Entrega:</strong> ' + escapeHtml(p.endereco) : '<strong>Retirada</strong>'}</p>
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
    formTitle.textContent = `Editando Pedido de ${raw.nome}`;
    cancelBtn.style.display = 'inline-block'; // Mostra o botão de cancelar
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página para o topo
  });

  /* Imprimir */
  const btnImprimir = document.createElement('button');
  btnImprimir.className = 'btnImprimir';
  btnImprimir.textContent = '🖨️ Imprimir';
  btnImprimir.addEventListener('click', () => printReceipt(docSnap));

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

/* ---- NOVA LÓGICA DE RENDERIZAÇÃO E ORDENAÇÃO ---- */
let pedidosCache = [];

function renderPedidos() {
  pedidosContainer.innerHTML = '';

  // 1. Agrupar pedidos por data
  const pedidosPorData = {};
  pedidosCache.forEach(docSnap => {
    const data = docSnap.data().data || 'Sem Data';
    if (!pedidosPorData[data]) {
      pedidosPorData[data] = [];
    }
    pedidosPorData[data].push(docSnap);
  });

  // 2. Ordenar as datas (da mais recente para a mais antiga)
  const datasOrdenadas = Object.keys(pedidosPorData).sort((a, b) => b.localeCompare(a));
  
  if (datasOrdenadas.length === 0) {
      pedidosContainer.innerHTML = '<p style="text-align:center; color:#888;">Nenhum pedido registrado ainda.</p>';
      return;
  }

  // 3. Iterar sobre cada dia e renderizar os pedidos
  datasOrdenadas.forEach(data => {
    // Só renderiza o dia se houver pedidos para ele
    if (pedidosPorData[data] && pedidosPorData[data].length > 0) {
      
      // Cria o cabeçalho do dia
      const header = document.createElement('h2');
      header.className = 'data-header'; // Classe para estilização opcional
      header.textContent = formatarDataParaExibicao(data);
      pedidosContainer.appendChild(header);

      // Cria um container grid para os cards deste dia
      const diaContainer = document.createElement('div');
      diaContainer.className = 'pedidosContainer'; // Reutiliza a classe para o layout de grid
      pedidosContainer.appendChild(diaContainer);

      // Ordena os pedidos *deste dia* de acordo com o seletor
      const ordem = ordenarSelect.value;
      const pedidosDoDiaOrdenados = [...pedidosPorData[data]].sort((a, b) => {
        const horaA = a.data().horario || '';
        const horaB = b.data().horario || '';
        if (!horaA) return 1;
        if (!horaB) return -1;
        return ordem === 'asc' ? horaA.localeCompare(horaB) : horaB.localeCompare(horaA);
      });

      // Renderiza os cards ordenados para este dia
      pedidosDoDiaOrdenados.forEach(docSnap => {
        try {
          const card = criarCard(docSnap);
          diaContainer.appendChild(card);
        } catch (e) {
          console.error('Erro ao renderizar doc', docSnap.id, e);
        }
      });
    }
  });
}

ordenarSelect.addEventListener('change', renderPedidos);

/* snapshot em tempo real */
onSnapshot(pedidosColRef, (snapshot) => {
  pedidosCache = snapshot.docs; // Atualiza o cache com todos os documentos
  renderPedidos(); // Re-renderiza tudo com a nova lógica
}, (err) => {
  logAndAlertError(err, 'carregar pedidos (onSnapshot)');
});