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
const navegacaoDiasContainer = document.getElementById('navegacaoDiasContainer');

let editId = null;
const pedidosColRef = collection(db, "pedidos");

/* Helpers */
function safeString(value) { return (value === undefined || value === null) ? '' : String(value); }
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatarDataParaExibicao(dataString) {
    if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) return "Sem Data";
    const [ano, mes, dia] = dataString.split('-');
    const dataObj = new Date(ano, mes-1, dia);
    return dataObj.toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC' });
}

/* Gerenciamento do Formulário */
function resetForm() {
    form.reset();
    enderecoContainer.style.display = 'none';
    editId = null;
    submitBtn.textContent = 'Adicionar Pedido';
    formTitle.textContent = 'Adicionar Novo Pedido';
    cancelBtn.style.display = 'none';
}
cancelBtn.addEventListener('click', () => { if(confirm('Cancelar edição?')) resetForm(); });
entregaSelect.addEventListener('change', () => { enderecoContainer.style.display = entregaSelect.value==='Sim'?'block':'none'; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pedido = {
    nome: safeString(document.getElementById('nome').value).trim(),
    data: document.getElementById('data').value||'',
    numero: safeString(document.getElementById('numero').value).trim(),
    pagamento: safeString(document.getElementById('pagamento').value),
    entrega: safeString(document.getElementById('entrega').value),
    endereco: safeString(document.getElementById('endereco').value).trim(),
    itens: safeString(document.getElementById('itens').value).trim(),
    valor: (()=>{ const v=parseFloat(document.getElementById('valor').value); return Number.isFinite(v)?v:0; })(),
    horario: document.getElementById('horario').value||'',
    pago: safeString(document.getElementById('pago').value)
  };
  try { if(editId) await updateDoc(doc(db,"pedidos",editId),pedido); else await addDoc(pedidosColRef,pedido); resetForm(); }
  catch(err){ console.error(err); alert('Erro ao salvar pedido'); }
});

/* Criação de cards */
function criarCard(docSnap){
  const raw = docSnap.data()||{};
  const p = { nome:safeString(raw.nome)||'—', horario:safeString(raw.horario)||'—', itens:safeString(raw.itens)||'—', valor:(Number(raw.valor)||0), pago:safeString(raw.pago)||'—', entrega:safeString(raw.entrega)||'Não', endereco:safeString(raw.endereco)||'' };
  const card = document.createElement('div'); card.className='cardPedido';
  card.innerHTML = `<h3>${escapeHtml(p.nome)}</h3>
    <p><strong>Hora:</strong> ${escapeHtml(p.horario)}</p>
    <p><strong>Itens:</strong> ${escapeHtml(p.itens)}</p>
    <p><strong>Valor:</strong> R$${p.valor.toFixed(2)} - <strong>Pago:</strong> ${escapeHtml(p.pago)}</p>
    <p>${p.entrega==='Sim'?'<strong>Entrega:</strong> '+escapeHtml(p.endereco):'<strong>Retirada</strong>'}</p>`;
  return card;
}

/* Renderização e ordenação */
let pedidosCache=[];
function renderPedidos(){
  pedidosContainer.innerHTML=''; navegacaoDiasContainer.innerHTML='';
  const pedidosPorData={};
  pedidosCache.forEach(docSnap=>{ const data=docSnap.data().data||'Sem Data'; if(!pedidosPorData[data]) pedidosPorData[data]=[]; pedidosPorData[data].push(docSnap); });
  const datasOrdenadas=Object.keys(pedidosPorData).sort((a,b)=>b.localeCompare(a));
  if(datasOrdenadas.length>1){ datasOrdenadas.forEach(data=>{
    const [ano,mes,dia]=data.split('-'); const linkId=`header-${data}`;
    const link=document.createElement('a'); link.className='dia-link'; link.href=`#${linkId}`; link.textContent=`${dia}/${mes}`; navegacaoDiasContainer.appendChild(link);
  }); }
  if(datasOrdenadas.length===0){ pedidosContainer.innerHTML='<p style="text-align:center; color:#888;">Nenhum pedido registrado ainda.</p>'; return; }
  datasOrdenadas.forEach(data=>{
    if(pedidosPorData[data] && pedidosPorData[data].length>0){
      const headerId=`header-${data}`;
      const header=document.createElement('h2'); header.className='data-header'; header.id=headerId; header.textContent=formatarDataParaExibicao(data); pedidosContainer.appendChild(header);
      const diaContainer=document.createElement('div'); diaContainer.className='pedidosContainer'; pedidosContainer.appendChild(diaContainer);
      const ordem = ordenarSelect.value;
      const pedidosDoDiaOrdenados = [...pedidosPorData[data]].sort((a,b)=>{
        const horaA=a.data().horario||''; const horaB=b.data().horario||'';
        if(!horaA) return 1; if(!horaB) return -1; return ordem==='asc'?horaA.localeCompare(horaB):horaB.localeCompare(horaA);
      });
      pedidosDoDiaOrdenados.forEach(docSnap=>{ try{ const card=criarCard(docSnap); diaContainer.appendChild(card); } catch(e){ console.error('Erro render doc',docSnap.id,e); }});
    }
  });
}

ordenarSelect.addEventListener('change', renderPedidos);

/* Snapshot em tempo real */
onSnapshot(pedidosColRef, snapshot=>{ pedidosCache=snapshot.docs; renderPedidos(); }, err=>{ console.error(err); });

export { renderPedidos };
