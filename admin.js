import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { erroBloco, icon } from "../ui.js";

await iniciarPagina();
try {
  const r = await api.get("/resumo");
  document.getElementById("resumo-admin").innerHTML = [
    ["Clínicas", r.clinicas], ["Profissionais", r.profissionais], ["Especialidades", r.especialidades], ["Pacientes", r.pacientes],
    ["Novos Pacientes no Mês", r.novosPacientesMes], ["Consultas Agendadas", r.agendados], ["Consultas Concluídas", r.concluidos], ["Consultas Canceladas", r.cancelados],
  ].map(([t, v]) => `<div class="stat"><b>${v}</b>${t}</div>`).join("");
} catch (e) {
  document.getElementById("resumo-admin").innerHTML = erroBloco(e.message);
}
const atalhos = [
  ["admin-clinicas.html", "Gerenciar", "Clínicas", "building", "t-main"],
  ["admin-profissionais.html", "Gerenciar", "Profissionais", "steth", "t-pale"],
  ["admin-especialidades.html", "Gerenciar", "Especialidades", "list", "t-pale"],
  ["pacientes.html", "Gerenciar", "Pacientes", "users", "t-ice"],
  ["admin-agendamentos.html", "Acompanhar", "Agendamentos", "calendar", "t-pale"],
];
document.getElementById("atalhos").innerHTML = atalhos
  .map(([href, peq, tit, ico, cls]) => `<a class="tile ${cls}" href="${href}"><span class="tile-ico">${icon(ico, "")}</span><span class="tile-small">${peq}</span><span class="tile-title">${tit}</span></a>`).join("");
