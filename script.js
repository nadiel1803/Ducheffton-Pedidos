import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const form = document.getElementById("formPedido");
const listaPedidos = document.getElementById("listaPedidos");
const btnAdicionar = document.getElementById("btnAdicionar");
const modal = document.getElementById("modalAdicionar");
const fecharModal = document.getElementById("fecharModal");

let pedidoEmEdicao = null;

// Abrir modal
btnAdicionar.addEventListener("click", () => {
  modal.style.display = "flex";
});

// Fechar modal
fecharModal.addEventListener("click", () => {
  modal.style.display = "none";
  form.reset();
  pedidoEmEdicao = null;
});

// Fechar modal ao clicar fora
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    form.reset();
    pedidoEmEdicao = null;
  }
});

// Enviar formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pedido = {
    nome: form.nome.value,
    data: form.data.value,
    numeroCliente: form.numeroCliente.value || null,
    pagamento: form.pagamento.value,
    entrega: form.entrega.checked,
    endereco: form.endereco.value || null,
    itens: form.itens.value,
    valorFinal: parseFloat(form.valorFinal.value) || 0,
    horario: form.horario.value,
    pago: form.pago.checked,
  };

  try {
    if (pedidoEmEdicao) {
      await updateDoc(doc(db, "pedidos", pedidoEmEdicao), pedido);
      pedidoEmEdicao = null;
    } else {
      await addDoc(collection(db, "pedidos"), pedido);
    }
    form.reset();
    modal.style.display = "none";
  } catch (error) {
    console.error("Erro ao salvar pedido:", error);
  }
});

// Carregar pedidos em tempo real
function carregarPedidos() {
  onSnapshot(collection(db, "pedidos"), (snapshot) => {
    listaPedidos.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const pedido = docSnap.data();
      const id = docSnap.id;

      const card = document.createElement("div");
      card.className = "pedido-card";
      card.innerHTML = `
        <h3>${pedido.nome}</h3>
        <p><strong>Data:</strong> ${pedido.data}</p>
        <p><strong>Itens:</strong> ${pedido.itens}</p>
        <p><strong>Valor:</strong> R$ ${pedido.valorFinal ? pedido.valorFinal.toFixed(2) : "0,00"}</p>
        <p><strong>Pago:</strong> ${pedido.pago ? "Sim" : "Não"}</p>
        <button onclick="editarPedido('${id}')">Editar</button>
        <button onclick="excluirPedido('${id}')">Excluir</button>
        <button onclick="imprimirPedido('${id}')">🖨 Imprimir</button>
      `;
      listaPedidos.appendChild(card);
    });
  });
}
carregarPedidos();

// Editar pedido
window.editarPedido = async (id) => {
  const docSnap = await getDocs(collection(db, "pedidos"));
  docSnap.forEach((d) => {
    if (d.id === id) {
      const pedido = d.data();
      form.nome.value = pedido.nome;
      form.data.value = pedido.data;
      form.numeroCliente.value = pedido.numeroCliente || "";
      form.pagamento.value = pedido.pagamento;
      form.entrega.checked = pedido.entrega;
      form.endereco.value = pedido.endereco || "";
      form.itens.value = pedido.itens;
      form.valorFinal.value = pedido.valorFinal;
      form.horario.value = pedido.horario;
      form.pago.checked = pedido.pago;
      pedidoEmEdicao = id;
      modal.style.display = "flex";
    }
  });
};

// Excluir pedido
window.excluirPedido = async (id) => {
  if (confirm("Tem certeza que deseja excluir este pedido?")) {
    await deleteDoc(doc(db, "pedidos", id));
  }
};

// Imprimir pedido
window.imprimirPedido = async (id) => {
  const docSnap = await getDocs(collection(db, "pedidos"));
  docSnap.forEach((d) => {
    if (d.id === id) {
      const pedido = d.data();
      const conteudo = `
        <div class="pedido-impressao">
          <h2>Pedido #${id}</h2>
          <p><strong>Nome:</strong> ${pedido.nome}</p>
          <p><strong>Data:</strong> ${pedido.data}</p>
          <p><strong>Horário:</strong> ${pedido.horario}</p>
          <p><strong>Número Cliente:</strong> ${pedido.numeroCliente || "-"}</p>
          <p><strong>Pagamento:</strong> ${pedido.pagamento}</p>
          <p><strong>Entrega:</strong> ${pedido.entrega ? "Sim" : "Retirada"}</p>
          ${pedido.entrega ? `<p><strong>Endereço:</strong> ${pedido.endereco}</p>` : ""}
          <p><strong>Itens:</strong> ${pedido.itens}</p>
          <p><strong>Valor Final:</strong> R$ ${pedido.valorFinal ? pedido.valorFinal.toFixed(2) : "0,00"}</p>
          <p><strong>Pago:</strong> ${pedido.pago ? "Sim" : "Não"}</p>
        </div>
      `;

      const janela = window.open("", "_blank", "width=400,height=600");
      janela.document.write(`
        <html>
          <head>
            <title>Imprimir Pedido</title>
            <link rel="stylesheet" href="style.css">
          </head>
          <body onload="window.print(); window.close();">
            ${conteudo}
          </body>
        </html>
      `);
      janela.document.close();
    }
  });
};
