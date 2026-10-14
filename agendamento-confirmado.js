import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { erroBloco } from "../ui.js";
import { esc, fmtDataLonga, queryParams } from "../utils.js";

await iniciarPagina();
const box = document.getElementById("resumo-agendamento");
try {
  const a = await api.get(`/agendamentos/${encodeURIComponent(queryParams().get("id") || "")}`);
  const linha = (r, v) => `<div class="summary-row"><span class="label">${r}</span><span class="value">${esc(v)}</span></div>`;
  box.innerHTML = linha("Protocolo", a.protocolo) + linha("Especialidade", a.especialidadeNome) + linha("Profissional", a.profissionalNome) +
    linha("Clínica", a.clinicaNome) + linha("Endereço", a.clinicaEndereco) + linha("Data", fmtDataLonga(a.data)) + linha("Horário", a.horario);
} catch (e) {
  box.innerHTML = erroBloco(e.message);
}
