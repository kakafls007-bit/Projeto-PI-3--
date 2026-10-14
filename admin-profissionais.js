// Cadastro de profissionais de saúde, associação com clínicas e consulta por nome, clínica ou especialidade.
import { api } from "../api.js";
import { criarCrud } from "../components/crud.js";
import { iniciarPagina } from "../layout.js";
import { icon } from "../ui.js";
import { esc } from "../utils.js";

await iniciarPagina();
const opcoesEsp = async () => (await api.get("/especialidades")).map((e) => ({ valor: e.id, rotulo: e.nome }));
const opcoesClinicas = async () => (await api.get("/clinicas")).map((c) => ({ valor: c.id, rotulo: `${c.nome} - ${c.cidade}` }));

criarCrud({
  raiz: document.getElementById("crud"),
  endpoint: "/profissionais",
  rotulo: { singular: "Profissional", plural: "Profissionais", genero: "o" },
  buscaPlaceholder: "Buscar por nome ou registro",
  filtros: [
    { name: "especialidadeId", label: "Especialidade", opcoes: opcoesEsp },
    { name: "clinicaId", label: "Clínica", opcoes: opcoesClinicas },
  ],
  campos: [
    { name: "nome", label: "Nome Completo", obrigatorio: true, completo: true },
    { name: "registro", label: "Registro Profissional (CRM)", obrigatorio: true, placeholder: "CRM-PE 00000" },
    { name: "especialidadeId", label: "Especialidade", tipo: "select", obrigatorio: true, opcoes: opcoesEsp },
    { name: "clinicaIds", label: "Clínicas Onde Atende", tipo: "multicheck", obrigatorio: true, opcoes: opcoesClinicas, ajuda: "Marque pelo menos uma clínica." },
    { name: "matricula", label: "Matrícula (Login)", obrigatorio: true },
    { name: "senha", label: "Senha", tipo: "password", obrigatorio: true, obrigatorioSoCriacao: true, minlength: 6, autocomplete: "new-password", ajuda: "Mínimo de 6 caracteres.", ajudaEdicao: "Deixe em branco para manter a senha atual." },
  ],
  card: (p) => ({
    titulo: p.nome, selo: p.especialidadeNome, subtitulo: p.registro,
    linhas: [`Clínicas: ${p.clinicas.map((c) => c.nome).join(", ") || "—"}`, `Matrícula: ${p.matricula}`],
  }),
  acoesExtras: (p) => `<a class="btn btn-sm btn-outline" href="disponibilidade.html?profissionalId=${esc(p.id)}">${icon("clock")} Horários</a>`,
  podeExcluir: () => true,
  textoExcluir: (p) => `Excluir ${p.nome}? Os horários cadastrados serão removidos.`,
  paraPayload: (v, item) => ({ ...v, clinicaIds: [].concat(v.clinicaIds || []), senha: v.senha || undefined, ativo: item ? item.ativo : true }),
});
