// Administrador: lista de todos os agendamentos com filtros e cancelamento.
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { carregando, confirmar, erroBloco, icon, seloStatus, toast, vazio } from "../ui.js";
import { debounce, esc, fmtData } from "../utils.js";

await iniciarPagina();
const $ = (id) => document.getElementById(id);
$("f-busca").closest(".search").insertAdjacentHTML("afterbegin", icon("search"));
try {
  (await api.get("/clinicas")).forEach((c) => $("f-clinica").insertAdjacentHTML("beforeend", `<option value="${esc(c.id)}">${esc(c.nome)}</option>`));
} catch { /* filtro fica só com "Todas" */ }

let itens = [];
async function carregar() {
  $("lista").innerHTML = carregando();
  const q = {};
  new FormData($("filtros")).forEach((v, k) => { if (v) q[k] = v; });
  try {
    itens = (await api.get("/agendamentos", q)).reverse();
  } catch (e) {
    $("lista").innerHTML = erroBloco(e.message);
    return;
  }
  $("contagem").textContent = itens.length ? `${itens.length} resultado${itens.length > 1 ? "s" : ""}` : "";
  $("lista").innerHTML = itens.length ? itens.map((a) => `<article class="consulta-card" data-id="${esc(a.id)}">
    <div class="consulta-top"><h3 class="consulta-especialidade">${esc(a.pacienteNome)}</h3>${seloStatus(a.status)}</div>
    <div class="consulta-data">${esc(fmtData(a.data))} às ${esc(a.horario)} · ${esc(a.especialidadeNome)}</div>
    <div class="consulta-linha">${esc(a.profissionalNome)} · ${esc(a.clinicaNome)}</div>
    <div class="consulta-linha">Protocolo ${esc(a.protocolo)}</div>
    <div class="card-acoes"><a class="btn btn-sm btn-outline" href="consulta-profissional.html?id=${esc(a.id)}">Detalhes</a>
      ${a.status === "agendado" ? `<button type="button" class="btn btn-sm btn-danger-outline" data-cancelar>Cancelar</button>` : ""}</div></article>`).join("") : vazio("Nenhum agendamento encontrado.");
}
$("filtros").addEventListener("submit", (e) => { e.preventDefault(); carregar(); });
$("f-busca").addEventListener("input", debounce(carregar, 300));
$("filtros").querySelectorAll("select, input[type=date]").forEach((el) => el.addEventListener("change", carregar));
$("lista").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cancelar]");
  if (!b) return;
  const a = itens.find((x) => x.id === b.closest("[data-id]").dataset.id);
  if (!(await confirmar({ titulo: "Cancelar Consulta", mensagem: `Cancelar a consulta de ${a.pacienteNome}?`, confirmar: "Cancelar Consulta", perigo: true }))) return;
  try {
    await api.patch(`/agendamentos/${encodeURIComponent(a.id)}/cancelar`);
    toast("Consulta cancelada.", "ok");
    carregar();
  } catch (err) {
    toast(err.message, "erro");
  }
});
carregar();
