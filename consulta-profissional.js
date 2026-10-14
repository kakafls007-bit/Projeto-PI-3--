// Detalhe de uma consulta (profissional ou administrador): dados do paciente, triagem, concluir e cancelar.
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { comCarga, confirmar, erroBloco, seloStatus, toast } from "../ui.js";
import { esc, fmtCpf, fmtDataLonga, isoDate, queryParams } from "../utils.js";

const user = await iniciarPagina();
const box = document.getElementById("consulta-detalhe");
const volta = user.perfil === "administrador" ? "admin-agendamentos.html" : "painel-profissional.html";
document.querySelector(".back-btn")?.setAttribute("href", volta);
const SINT = { febre: "Febre", tosse: "Tosse", dor_cabeca: "Dor de Cabeça", dor_corpo: "Dor no Corpo", falta_ar: "Falta de Ar", nausea: "Náusea" };
const URG = { baixa: "Baixa", media: "Média", alta: "Alta" };
const row = (r, v) => `<div class="summary-row"><span class="label">${r}</span><span class="value">${esc(v || "—")}</span></div>`;

async function carregar() {
  let a;
  try {
    a = await api.get(`/agendamentos/${encodeURIComponent(queryParams().get("id") || "")}`);
  } catch (e) {
    box.innerHTML = erroBloco(e.message);
    return;
  }
  const t = a.triagem;
  box.innerHTML = `
    <div class="summary-box">
      <div class="summary-row"><span class="label">Situação</span>${seloStatus(a.status)}</div>
      ${row("Protocolo", a.protocolo)}${row("Paciente", a.pacienteNome)}${row("Telefone", a.pacienteTelefone)}
      ${row("Profissional", a.profissionalNome)}${row("Especialidade", a.especialidadeNome)}
      ${row("Clínica", a.clinicaNome)}${row("Data", fmtDataLonga(a.data))}${row("Horário", a.horario)}
      ${a.observacoes ? row("Observações do atendimento", a.observacoes) : ""}
    </div>
    <h2 class="sec-title">Triagem do Paciente</h2>
    ${t ? `<div class="summary-box">${row("Motivo", t.motivo)}${row("Sintomas", (t.sintomas || []).map((s) => SINT[s] || s).join(", ") || "Nenhum informado")}${row("Urgência", URG[t.urgencia])}${row("Observações", t.observacoes)}</div>`
        : '<p class="empty-state">Esta consulta não veio de uma triagem pelo chatbot.</p>'}
    ${a.status === "agendado" ? `
      <form id="form-concluir" class="bottom-area">
        ${user.perfil === "profissional" && a.data <= isoDate() ? `<div class="field"><label for="obs">Observações do Atendimento (opcional)</label><textarea id="obs" rows="3"></textarea></div>
          <button type="submit" class="btn">Concluir Atendimento</button>` : user.perfil === "profissional" ? '<p class="aviso">O atendimento poderá ser concluído a partir do dia da consulta.</p>' : ""}
        <button type="button" class="btn btn-danger-outline" id="btn-cancelar">Cancelar Consulta</button>
      </form>` : ""}`;

  document.getElementById("form-concluir")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await comCarga(e.submitter, () => api.patch(`/agendamentos/${encodeURIComponent(a.id)}/concluir`, { observacoes: document.getElementById("obs")?.value || "" }));
      toast("Atendimento concluído.", "ok");
      carregar();
    } catch (err) {
      toast(err.message, "erro");
    }
  });
  document.getElementById("btn-cancelar")?.addEventListener("click", async () => {
    const sim = await confirmar({ titulo: "Cancelar Consulta", mensagem: `Cancelar a consulta de ${a.pacienteNome}? O horário voltará a ficar livre.`, confirmar: "Cancelar Consulta", perigo: true });
    if (!sim) return;
    try {
      await api.patch(`/agendamentos/${encodeURIComponent(a.id)}/cancelar`);
      toast("Consulta cancelada.", "ok");
      carregar();
    } catch (err) {
      toast(err.message, "erro");
    }
  });
}
carregar();
