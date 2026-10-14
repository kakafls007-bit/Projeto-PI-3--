import { criarCrud } from "../components/crud.js";
import { iniciarPagina } from "../layout.js";

await iniciarPagina();
criarCrud({
  raiz: document.getElementById("crud"),
  endpoint: "/especialidades",
  rotulo: { singular: "Especialidade", plural: "Especialidades", genero: "a" },
  buscaPlaceholder: "Buscar especialidade",
  campos: [{ name: "nome", label: "Nome da Especialidade", obrigatorio: true, completo: true }],
  card: (e) => ({ titulo: e.nome }),
  podeExcluir: () => true,
});
