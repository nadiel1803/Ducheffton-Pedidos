import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const form = document.getElementById('pedidoForm');
const pedidosList = document.getElementById('pedidosList');
const entregaSelect = document.getElementById('entrega');
const enderecoContainer = document.getElementById('enderecoContainer');

let editId = null; // Armazena o ID do pedido sendo editado

entregaSelect.addEventListener('change', () => {
  enderecoContainer.style.display = entregaSelect.value === 'Sim' ? 'block' : 'none';
  });

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
                                                            const pedidoRef = doc(db, "pedidos", editId);
                                                                  await updateDoc(pedidoRef, pedido);
                                                                        editId = null;
                                                                              form.querySelector('button').textContent = "Adicionar/Atualizar Pedido";
                                                                                  } else {
                                                                                        await addDoc(collection(db, "pedidos"), pedido);
                                                                                            }
                                                                                                form.reset();
                                                                                                    enderecoContainer.style.display = 'none';
                                                                                                        carregarPedidos();
                                                                                                          } catch (error) {
                                                                                                              console.error("Erro ao salvar pedido: ", error);
                                                                                                                }
                                                                                                                });

                                                                                                                async function carregarPedidos() {
                                                                                                                  pedidosList.innerHTML = '';
                                                                                                                    const querySnapshot = await getDocs(collection(db, "pedidos"));

                                                                                                                      querySnapshot.forEach((docSnap) => {
                                                                                                                          const p = docSnap.data();
                                                                                                                              const li = document.createElement('li');
                                                                                                                                  li.innerHTML = `
                                                                                                                                        <strong>${p.nome}</strong> - ${p.data} - ${p.horario} <br>
                                                                                                                                              Itens: ${p.itens} <br>
                                                                                                                                                    Valor: R$${p.valor.toFixed(2)} - Pago: ${p.pago} <br>
                                                                                                                                                          ${p.entrega === 'Sim' ? 'Entrega em: ' + p.endereco : 'Retirada'} <br>
                                                                                                                                                              `;

                                                                                                                                                                  // Botão editar
                                                                                                                                                                      const btnEditar = document.createElement('button');
                                                                                                                                                                          btnEditar.textContent = '✏️ Editar';
                                                                                                                                                                              btnEditar.style.backgroundColor = '#ffd700';
                                                                                                                                                                                  btnEditar.style.color = '#000';
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
                                                                                                                                                                                                                                                                    form.querySelector('button').textContent = "Atualizar Pedido";
                                                                                                                                                                                                                                                                        });

                                                                                                                                                                                                                                                                            // Botão excluir
                                                                                                                                                                                                                                                                                const btnExcluir = document.createElement('button');
                                                                                                                                                                                                                                                                                    btnExcluir.textContent = '🗑️ Excluir';
                                                                                                                                                                                                                                                                                        btnExcluir.style.backgroundColor = '#ff4d4d';
                                                                                                                                                                                                                                                                                            btnExcluir.style.color = '#fff';
                                                                                                                                                                                                                                                                                                btnExcluir.addEventListener('click', async () => {
                                                                                                                                                                                                                                                                                                      if (confirm('Tem certeza que quer excluir esse pedido?')) {
                                                                                                                                                                                                                                                                                                              await deleteDoc(doc(db, "pedidos", docSnap.id));
                                                                                                                                                                                                                                                                                                                      carregarPedidos();
                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                                                    li.appendChild(btnEditar);
                                                                                                                                                                                                                                                                                                                                        li.appendChild(btnExcluir);
                                                                                                                                                                                                                                                                                                                                            pedidosList.appendChild(li);
                                                                                                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                                                                                                              // Carrega pedidos ao abrir a página
                                                                                                                                                                                                                                                                                                                                              carregarPedidos();