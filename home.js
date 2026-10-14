import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { icon } from "../ui.js";
import { esc, fmtDataLonga, isoDate, primeiroNome } from "../utils.js";

const user = await iniciarPagina();
document.getElementById("saud-nome").textContent = primeiroNome(user.nome) || "Paciente";

document.getElementById("ico-triagem").innerHTML = icon("chat", "");
document.getElementById("ico-agendar").innerHTML = icon("calendar", "");
document.getElementById("ico-minhas").innerHTML = icon("clock", "");
document.getElementById("ico-pagar").innerHTML = icon("card", "");

// Atalhos por especialidade (as 4 primeiras cadastradas)
api.get("/especialidades")
  .then((lista) => {
    document.getElementById("mini-esp").innerHTML = lista
      .slice(0, 4)
      .map((e) => `<a class="mini" href="agendamento.html?especialidade=${encodeURIComponent(e.id)}"><span aria-hidden="true">${esc(e.nome[0])}</span>${esc(e.nome)}</a>`)
      .join("");
  })
  .catch(() => {});

// Próxima consulta marcada
api.get("/agendamentos", { status: "agendado", de: isoDate() })
  .then((lista) => {
    const prox = lista[0];
    if (!prox) return;
    document.getElementById("proxima").innerHTML = `
      <a class="consulta-card proxima" href="consultas.html" style="margin-bottom:1rem">
        <div class="consulta-top"><span class="consulta-especialidade">Próxima Consulta</span><span class="consulta-status agendada">${esc(prox.horario)}</span></div>
        <div class="consulta-data">${esc(fmtDataLonga(prox.data))}</div>
        <div class="consulta-linha">${esc(prox.especialidadeNome)} · ${esc(prox.profissionalNome)} · ${esc(prox.clinicaNome)}</div>
      </a>`;
  })
  .catch(() => {});
