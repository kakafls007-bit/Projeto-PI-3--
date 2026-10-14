// Cadastro e manutenção das informações básicas dos pacientes (profissional e administrador).
import { api } from "../api.js";
import { criarCrud } from "../components/crud.js";
import { iniciarPagina } from "../layout.js";
import { fmtCpf, fmtData } from "../utils.js";

const user = await iniciarPagina();
const planos = await api.get("/planos");
const nomePlano = (id) => (planos.find((p) => p.id === id) || {}).nome || "Sem Plano";

criarCrud({
  raiz: document.getElementById("crud"),
  endpoint: "/pacientes",
  rotulo: { singular: "Paciente", plural: "Pacientes", genero: "o" },
  buscaPlaceholder: "Buscar por nome ou CPF",
  campos: [
    { name: "nome", label: "Nome Completo", obrigatorio: true, completo: true, autocomplete: "off" },
    { name: "cpf", label: "CPF", tipo: "cpf", obrigatorio: true, placeholder: "Somente números" },
    { name: "nascimento", label: "Data de Nascimento", tipo: "date", obrigatorio: true, max: new Date().toISOString().slice(0, 10) },
    { name: "telefone", label: "Telefone", tipo: "tel", obrigatorio: true },
    { name: "email", label: "E-mail", tipo: "email", obrigatorio: true },
    { name: "cidade", label: "Cidade", obrigatorio: true },
    { name: "plano", label: "Plano", tipo: "select", obrigatorio: true, opcoes: planos.map((p) => ({ valor: p.id, rotulo: `${p.nome} - R$ ${p.valor.toFixed(2).replace(".", ",")}/mês` })) },
    { name: "pagamento", label: "Forma de Pagamento", tipo: "select", obrigatorio: true, opcoes: ["Pix", "Cartão de Crédito", "Boleto"].map((v) => ({ valor: v, rotulo: v })) },
  ],
  valoresNovo: { pagamento: "Pix" },
  card: (p) => ({
    titulo: p.nome, selo: nomePlano(p.plano),
    subtitulo: `CPF ${fmtCpf(p.cpf)} · ${p.telefone}`,
    linhas: [`${p.cidade} · nascimento ${fmtData(p.nascimento)}`, p.temSenha ? "Acesso ao app: ativo" : "Acesso ao app: aguardando primeiro acesso"],
  }),
  podeExcluir: () => user.perfil === "administrador",
  textoExcluir: (p) => `Excluir ${p.nome}? As consultas futuras dele(a) serão canceladas e essa ação não pode ser desfeita.`,
});
