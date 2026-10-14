import { criarCrud } from "../components/crud.js";
import { iniciarPagina } from "../layout.js";

await iniciarPagina();
criarCrud({
  raiz: document.getElementById("crud"),
  endpoint: "/clinicas",
  rotulo: { singular: "Clínica", plural: "Clínicas", genero: "a" },
  buscaPlaceholder: "Buscar por nome, cidade ou bairro",
  campos: [
    { name: "nome", label: "Nome da Clínica", obrigatorio: true, completo: true },
    { name: "cidade", label: "Cidade", obrigatorio: true },
    { name: "bairro", label: "Bairro", obrigatorio: true },
    { name: "endereco", label: "Endereço", obrigatorio: true, completo: true },
    { name: "telefone", label: "Telefone", tipo: "tel" },
  ],
  card: (c) => ({ titulo: c.nome, subtitulo: `${c.bairro}, ${c.cidade}`, linhas: [c.endereco, c.telefone] }),
  podeExcluir: () => true,
});
