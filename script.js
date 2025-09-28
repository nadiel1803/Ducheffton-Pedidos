const form = document.getElementById('pedidoForm');
const pedidosContainer = document.getElementById('pedidosContainer');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');

entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
});

form.addEventListener('submit', (e) => {
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

  adicionarPedidoNaTela(pedido);
  form.reset();
  enderecoContainer.style.display = 'none';
});

function adicionarPedidoNaTela(pedido) {
  const card = document.createElement('div');
  card.className = 'cardPedido';
  card.innerHTML = `
    <h3>${pedido.nome}</h3>
    <p><strong>Data:</strong> ${pedido.data}</p>
    <p><strong>Horário:</strong> ${pedido.horario}</p>
    <p><strong>Itens:</strong> ${pedido.itens}</p>
    <p><strong>Valor:</strong> R$${pedido.valor.toFixed(2)} - <strong>Pago:</strong> ${pedido.pago}</p>
    <p>${pedido.entrega === 'Sim' ? `<strong>Entrega:</strong> ${pedido.endereco}` : '<strong>Retirada</strong>'}</p>
  `;
  pedidosContainer.appendChild(card);
}
