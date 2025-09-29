// script.js
import { db } from './firebase.js';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* DOM (com fallbacks pra evitar nulls se tiver diferença no HTML) */
const form = document.getElementById('pedidoForm') || document.getElementById('pedido-form') || document.querySelector('form');
const pedidosContainer = document.getElementById('pedidosContainer') || document.querySelector('.pedidosContainer') || document.querySelector('.pedidosContainerGeral');
const entregaSelect = document.getElementById('entrega') || document.querySelector('[name="entrega"]');
const enderecoContainer = document.getElementById('enderecoContainer') || document.getElementById('endereco-group');
const submitBtn = document.getElementById('submitBtn') || document.querySelector('button[type="submit"]');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle') || document.querySelector('.form-section h2');
const ordenarSelect = document.getElementById('ordenarHorario') || document.getElementById('ordenar-horario');
const navegacaoDiasContainer = document.getElementById('navegacaoDiasContainer') || document.querySelector('.navegacaoDias');

if (!form || !pedidosContainer) {
  console.error('Elemento form ou pedidosContainer não encontrados. Verifique os IDs/classes no HTML.');
  // não throw pra evitar quebrar o restante, mas não prossegue com listeners se não tiver form
}

/* referência collection */
const pedidosColRef = collection(db, "pedidos");

let editId = null;

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

/* aceita string 'YYYY-MM-DD', Date, Firestore Timestamp (obj com toDate) */
function toISODateString(dataInput) {
  if (!dataInput) return '';
  // se já é 'YYYY-MM-DD'
  if (typeof dataInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataInput)) return dataInput;
  // firestore Timestamp
  if (dataInput && typeof dataInput.toDate === 'function') {
    const d = dataInput.toDate();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (dataInput instanceof Date) {
    const yyyy = dataInput.getFullYear();
    const mm = String(dataInput.getMonth() + 1).padStart(2, '0');
    const dd = String(dataInput.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // tenta extrair de string qualquer
  const m = String(dataInput).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

function formatarDataParaExibicao(dataInput) {
  const iso = toISODateString(dataInput);
  if (!iso) return "Sem Data";
  const [ano, mes, dia] = iso.split('-');
  const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
  try {
    return dataObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return `${dia}/${mes}/${ano}`;
  }
}

/* Gerenciamento do Formulário */
function resetForm() {
  if (!form) return;
  form.reset();
  if (enderecoContainer) enderecoContainer.style.display = 'none';
  editId = null;
  if (submitBtn) submitBtn.textContent = 'Adicionar Pedido';
  if (formTitle) formTitle.textContent = 'Adicionar Novo Pedido';
  if (cancelBtn) cancelBtn.style.display = 'none';
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja cancelar a edição? As alterações serão perdidas.')) {
      resetForm();
    }
  });
}

/* Se entregaSelect for um <select> ou radio */
if (entregaSelect) {
  // caso seja <select>
  entregaSelect.addEventListener && entregaSelect.addEventListener('change', () => {
    if (enderecoContainer) enderecoContainer.style.display = (entregaSelect.value === 'Sim' || entregaSelect.value === 'sim' || entregaSelect.value === 'true') ? 'block' : 'none';
  });
}

/* Submit (Adicionar / Atualizar) */
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nomeField = document.getElementById('nome');
    const dataField = document.getElementById('data');
    const numeroField = document.getElementById('numero');
    const pagamentoField = document.getElementById('pagamento');
    const entregaField = document.getElementById('entrega');
    const enderecoField = document.getElementById('endereco');
    const itensField = document.getElementById('itens');
    const valorField = document.getElementById('valor');
    const horarioField = document.getElementById('horario');
    const pagoField = document.getElementById('pago');

    const pedido = {
      nome: safeString(nomeField ? nomeField.value : ''),
      data: (dataField && dataField.value) ? dataField.value : '',
      numero: safeString(numeroField ? numeroField.value : ''),
      pagamento: safeString(pagamentoField ? pagamentoField.value : ''),
      entrega: safeString(entregaField ? entregaField.value : (entregaSelect && entregaSelect.checked ? 'Sim' : 'Não')),
      endereco: safeString(enderecoField ? enderecoField.value : ''),
      itens: safeString(itensField ? itensField.value : ''),
      valor: (() => {
        const v = valorField ? parseFloat(valorField.value) : NaN;
        return Number.isFinite(v) ? v : 0;
      })(),
      horario: horarioField ? horarioField.value : '',
      pago: safeString(pagoField ? pagoField.value : '')
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
}

/* impressão (usa formatarDataParaExibicao para mostrar a data bonitinha) */
function printReceipt(docSnap) {
  const raw = (typeof docSnap.data === 'function') ? docSnap.data() : (docSnap || {});
  const p = {
    nome: raw.nome || '',
    data: formatarDataParaExibicao(raw.data),
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
  const raw = (typeof docSnap.data === 'function') ? docSnap.data() : (docSnap || {});
  const p = {
    nome: safeString(raw.nome) || '—',
    data: toISODateString(raw.data) || '—',
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
    try {
      if (document.getElementById('nome')) document.getElementById('nome').value = raw.nome || '';
      if (document.getElementById('data')) document.getElementById('data').value = toISODateString(raw.data) || '';
      if (document.getElementById('numero')) document.getElementById('numero').value = raw.numero || '';
      if (document.getElementById('pagamento')) document.getElementById('pagamento').value = raw.pagamento || '';
      if (document.getElementById('entrega')) document.getElementById('entrega').value = raw.entrega || 'Não';
      if (document.getElementById('endereco')) document.getElementById('endereco').value = raw.endereco || '';
      if (document.getElementById('itens')) document.getElementById('itens').value = raw.itens || '';
      if (document.getElementById('valor')) document.getElementById('valor').value = raw.valor !== undefined ? raw.valor : '';
      if (document.getElementById('horario')) document.getElementById('horario').value = raw.horario || '';
      if (document.getElementById('pago')) document.getElementById('pago').value = raw.pago || '';

      if (enderecoContainer) enderecoContainer.style.display = raw.entrega === 'Sim' ? 'block' : 'none';
      editId = docSnap.id;
      if (submitBtn) submitBtn.textContent = 'Atualizar Pedido';
      if (formTitle) formTitle.textContent = `Editando Pedido de ${raw.nome}`;
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error('Erro ao preencher formulário para edição:', e);
    }
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

/* Lógica de Renderização e Ordenação */
let pedidosCache = [];

function renderPedidos() {
  if (!pedidosContainer) return;
  pedidosContainer.innerHTML = '';
  if (navegacaoDiasContainer) navegacaoDiasContainer.innerHTML = '';

  const pedidosPorData = {};
  pedidosCache.forEach(docSnap => {
    const dRaw = (typeof docSnap.data === 'function') ? docSnap.data().data : docSnap.data && docSnap.data().data;
    // tenta extrair com toISO ou '', se vazio usa 'Sem Data'
    const key = toISODateString(dRaw) || 'Sem Data';
    if (!pedidosPorData[key]) pedidosPorData[key] = [];
    pedidosPorData[key].push(docSnap);
  });

  // ordena datas (mais recentes primeiro)
  const datasOrdenadas = Object.keys(pedidosPorData).sort((a, b) => b.localeCompare(a));

  // navegação por dias (apenas se >1 dia)
  if (navegacaoDiasContainer && datasOrdenadas.length > 1) {
    datasOrdenadas.forEach(data => {
      if (data === 'Sem Data') return;
      const [ano, mes, dia] = data.split('-');
      const dataFormatadaLink = `${dia}/${mes}`;
      const linkId = `header-${data}`;

      const link = document.createElement('a');
      link.className = 'dia-link';
      link.href = `#${linkId}`;
      link.textContent = dataFormatadaLink;
      navegacaoDiasContainer.appendChild(link);
    });
  }

  if (datasOrdenadas.length === 0) {
    pedidosContainer.innerHTML = '<p style="text-align:center; color:#888;">Nenhum pedido registrado ainda.</p>';
    return;
  }

  datasOrdenadas.forEach(data => {
    const listaDocs = pedidosPorData[data];
    if (!listaDocs || listaDocs.length === 0) return;

    const headerId = `header-${data}`;
    const header = document.createElement('h2');
    header.className = 'data-header';
    header.id = headerId;
    header.textContent = (data === 'Sem Data') ? 'Sem Data' : formatarDataParaExibicao(data);
    pedidosContainer.appendChild(header);

    // container dos cards do dia (usa a mesma classe que o CSS espera)
    const diaContainer = document.createElement('div');
    diaContainer.className = 'pedidosContainer';
    pedidosContainer.appendChild(diaContainer);

    const ordem = (ordenarSelect && ordenarSelect.value) ? ordenarSelect.value : 'asc';
    const pedidosDoDiaOrdenados = [...listaDocs].sort((a, b) => {
      const horaA = (typeof a.data === 'function' ? a.data().horario : (a.data && a.data().horario)) || '';
      const horaB = (typeof b.data === 'function' ? b.data().horario : (b.data && b.data().horario)) || '';
      if (!horaA) return 1;
      if (!horaB) return -1;
      return ordem === 'asc' ? horaA.localeCompare(horaB) : horaB.localeCompare(horaA);
    });

    pedidosDoDiaOrdenados.forEach(docSnap => {
      try {
        const card = criarCard(docSnap);
        diaContainer.appendChild(card);
      } catch (e) {
        console.error('Erro ao renderizar doc', docSnap.id, e);
      }
    });
  });
}

if (ordenarSelect) ordenarSelect.addEventListener('change', renderPedidos);

/* snapshot em tempo real */
onSnapshot(pedidosColRef, (snapshot) => {
  pedidosCache = snapshot.docs || [];
  renderPedidos();
}, (err) => {
  logAndAlertError(err, 'carregar pedidos (onSnapshot)');
});
