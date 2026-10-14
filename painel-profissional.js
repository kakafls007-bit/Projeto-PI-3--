// Agenda do profissional de saúde: resumo e lista de consultas (hoje, próximas e histórico).
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { ativarAbas, carregando, erroBloco, seloStatus, vazio } from "../ui.js";
import { esc, fmtData, isoDate } from "../utils.js";

await iniciarPagina();
ativarAbas(document.querySelector(".app-body"));
const $ = (id) => document.getElementById(id);

const card = (a) => `<a class="consulta-card" href="consulta-profissional.html?id=${encodeURIComponent(a.id)}">
  <div class="consulta-top"><span class="consulta-especialidade">${esc(a.pacienteNome)}</span>${seloStatus(a.status)}</div>
  <div class="consulta-data">${esc(fmtData(a.data))} às ${esc(a.horario)}</div>
  <div class="consulta-linha">${esc(a.clinicaNome)}${a.triagem ? " · com triagem" : ""}</div></a>`;
const lista = (el, itens, msg) => (el.innerHTML = itens.length ? itens.map(card).join("") : vazio(msg));

async function carregar() {
  ["lista-hoje", "lista-proximas", "lista-historico"].forEach((id) => ($(id).innerHTML = carregando()));
  try {
    const [resumo, todas] = await Promise.all([api.get("/resumo"), api.get("/agendamentos")]);
    $("resumo-painel").innerHTML = [["Hoje", resumo.hoje], ["Próximas", resumo.proximos], ["Concluídas", resumo.concluidos], ["Pacientes", resumo.pacientes]]
      .map(([t, v]) => `<div class="stat"><b>${v}</b>${t}</div>`).join("");
    const hoje = isoDate();
    lista($("lista-hoje"), todas.filter((a) => a.status === "agendado" && a.data <= hoje), "Nenhuma consulta para hoje.");
    lista($("lista-proximas"), todas.filter((a) => a.status === "agendado" && a.data > hoje), "Nenhuma consulta futura.");
    lista($("lista-historico"), todas.filter((a) => a.status !== "agendado").reverse(), "Nenhum atendimento no histórico.");
  } catch (e) {
    ["lista-hoje", "lista-proximas", "lista-historico"].forEach((id) => ($(id).innerHTML = erroBloco(e.message)));
  }
}
carregar();
