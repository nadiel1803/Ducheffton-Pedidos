import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const modal = document.getElementById('modal');
const abrirModalBtn = document.getElementById('abrirModal');
const closeModal = document.querySelector('.close');
const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');
const submitBtn = document.getElementById('submitBtn');

let editId = null;

// Abrir e fechar modal
abrirModalBtn.addEventListener('click', () => {
  modal.style.display = 'block';
  form.reset();
  enderecoContainer.style.display = 'none';
  submitBtn.textContent = 'Adicionar Pedido';
});

closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

// Mostrar/ocultar endereço
entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
});

// Adicionar/Atualizar pedido
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pedido = {
    nome: document.getElementById('nome').value,
    data: document.getElementById('data').value,
    numero: document.getElementById('numero').value,
    pagamento: document.getElementById('pagamento').value,
    entrega: document.getElementById('entrega').value,
    endereco: document.getElementById('endereco').value,
    itens: document.getElementById('itens').value,
    valor: parseFloat(document.getElementById('valor').value),
    horario: document.getElementById('horario').value,
    pago: document.getElementById('pago').value
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "pedidos", editId), pedido);
      editId = null;
      submitBtn.textContent = 'Adicionar Pedido';
    } else {
      await addDoc(collection(db, "pedidos"), pedido);
    }
    form.reset();
    enderecoContainer.style.display = 'none';
    modal.style.display = 'none';
    carregarPedidos();
  } catch (err) {
    console.error("Erro ao salvar pedido: ", err);
  }
});

// Carregar pedidos
async function carregarPedidos() {
  pedidosContainer.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, "pedidos"));
  querySnapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const card = document.createElement('div');
    card.className = 'cardPedido';
    card.innerHTML = `
      <h3>${p.nome}</h3>
      <p><strong>Data:</strong> ${p.data} - <strong>Hora:</strong> ${p.horario}</p>
      <p><strong>Itens:</strong> ${p.itens}</p>
      <p><strong>Valor:</strong> R$${p.valor.toFixed(2)} - <strong>Pago:</strong> ${p.pago}</p>
      <p>${p.entrega === 'Sim' ? 'Entrega: ' + p.endereco : 'Retirada'}</p>
    `;

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btnEditar';
    btnEditar.textContent = '✏️ Editar';
    btnEditar.addEventListener('click', () => {
      document.getElementById('nome').value = p.nome;
      document.getElementById('data').value = p.data;
      document.getElementById('numero').value = p.numero;
      document.getElementById('pagamento').value = p.pagamento;
      document.getElementById('entrega').value = p.entrega;
      document.getElementById('endereco').value = p.endereco;
      document.getElementById('itens').value = p.itens;
      document.getElementById('valor').value = p.valor;
      document.getElementById('horario').value = p.horario;
      document.getElementById('pago').value = p.pago;

      enderecoContainer.style.display = p.entrega === 'Sim' ? 'block' : 'none';
      editId = docSnap.id;
      submitBtn.textContent = 'Atualizar Pedido';
      modal.style.display = 'block';
    });

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btnExcluir';
    btnExcluir.textContent = '🗑️ Excluir';
    btnExcluir.addEventListener('click', async () => {
      if (confirm('Tem certeza que quer excluir este pedido?')) {
        await deleteDoc(doc(db, "pedidos", docSnap.id));
        carregarPedidos();
      }
    });

    card.appendChild(btnEditar);
    card.appendChild(btnExcluir);
    pedidosContainer.appendChild(card);
  });
}

// Carregar pedidos na inicialização
carregarPedidos();
