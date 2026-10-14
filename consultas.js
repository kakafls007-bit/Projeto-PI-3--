// Gerenciamento dos agendamentos do paciente: lista, detalhes e cancelamento.
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { ativarAbas, carregando, confirmar, erroBloco, seloStatus, toast, vazio } from "../ui.js";
import { esc, fmtDataLonga } from "../utils.js";

await iniciarPagina();
ativarAbas(document.getElementById("tabs").parentElement);
const proximas = document.getElementById("lista-proximas");
const historico = document.getElementById("lista-historico");

const passou = (a) => new Date(`${a.data}T${a.horario}:00`) < new Date();
const linha = (r, v) => (v ? `<div class="summary-row"><span class="label">${r}</span><span class="value">${esc(v)}</span></div>` : "");

function card(a) {
  const futura = a.status === "agendado" && !passou(a);
  const t = a.triagem;
  return `<details class="consulta-card" data-id="${esc(a.id)}">
    <summary>
      <div class="consulta-top"><span class="consulta-especialidade">${esc(a.especialidadeNome)}</span>${seloStatus(a.status)}</div>
      <div class="consulta-data">${esc(fmtDataLonga(a.data))} às ${esc(a.horario)}</div>
      <div class="consulta-linha">${esc(a.profissionalNome)} · ${esc(a.clinicaNome)}</div>
      <span class="ver-mais">Ver detalhes</span>
    </summary>
    <div class="detalhes">
      ${linha("Protocolo", a.protocolo)}${linha("Profissional", `${a.profissionalNome} (${a.profissionalRegistro})`)}
      ${linha("Clínica", a.clinicaNome)}${linha("Endereço", a.clinicaEndereco)}${linha("Telefone", a.clinicaTelefone)}
      ${t ? linha("Motivo da triagem", t.motivo) : ""}
      ${a.status === "cancelado" ? linha("Cancelada por", { paciente: "Você", profissional: "Profissional", administrador: "Clínica", sistema: "Sistema" }[a.canceladoPor] || "") : ""}
      ${futura ? `<div class="card-acoes"><button type="button" class="btn btn-sm btn-danger-outline" data-cancelar>Cancelar Consulta</button></div>` : ""}
    </div></details>`;
}

async function carregar() {
  proximas.innerHTML = historico.innerHTML = carregando();
  try {
    const todas = await api.get("/agendamentos");
    const prox = todas.filter((a) => a.status === "agendado" && !passou(a));
    const hist = todas.filter((a) => !prox.includes(a)).reverse();
    proximas.innerHTML = prox.length ? prox.map(card).join("") : vazio("Você não tem consultas marcadas.");
    historico.innerHTML = hist.length ? hist.map(card).join("") : vazio("Ainda não há consultas no histórico.");
  } catch (e) {
    proximas.innerHTML = historico.innerHTML = erroBloco(e.message);
  }
}

document.querySelector(".app-body").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cancelar]");
  if (!b) return;
  const id = b.closest("[data-id]").dataset.id;
  const sim = await confirmar({ titulo: "Cancelar Consulta", mensagem: "Tem certeza que deseja cancelar esta consulta? O horário voltará a ficar livre para outras pessoas.", confirmar: "Cancelar Consulta", perigo: true });
  if (!sim) return;
  try {
    await api.patch(`/agendamentos/${encodeURIComponent(id)}/cancelar`);
    toast("Consulta cancelada.", "ok");
    carregar();
  } catch (err) {
    toast(err.message, "erro");
  }
});
carregar();
