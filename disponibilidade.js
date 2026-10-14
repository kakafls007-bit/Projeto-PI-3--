// Cadastro e consulta dos dias e horários disponíveis. O profissional gerencia os próprios;
// o administrador escolhe de qual profissional quer editar.
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { carregando, comCarga, confirmar, erroBloco, toast, vazio } from "../ui.js";
import { DIAS, esc, queryParams } from "../utils.js";

const user = await iniciarPagina();
const $ = (id) => document.getElementById(id);
let profId = user.perfil === "profissional" ? user.id : queryParams().get("profissionalId") || "";
let prof = null;

const erro = (m) => { $("erro").textContent = m || ""; $("erro").hidden = !m; };
$("d-dia").innerHTML = DIAS.map((d, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${d}</option>`).join("");

async function escolherProfissional() {
  if (user.perfil === "administrador") {
    const todos = await api.get("/profissionais");
    $("campo-prof").hidden = false;
    $("prof-sel").innerHTML = '<option value="" disabled>Selecione</option>' + todos.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)} - ${esc(p.especialidadeNome)}</option>`).join("");
    if (!profId && todos[0]) profId = todos[0].id;
    $("prof-sel").value = profId;
    $("prof-sel").addEventListener("change", () => { profId = $("prof-sel").value; iniciar(); });
  }
}

async function iniciar() {
  if (!profId) return;
  prof = await api.get(`/profissionais/${encodeURIComponent(profId)}`);
  $("sub-prof").textContent = `${prof.nome} · ${prof.especialidadeNome}`;
  $("d-clinica").innerHTML = prof.clinicas.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("");
  listar();
}

async function listar() {
  const el = $("lista-disp");
  el.innerHTML = carregando();
  try {
    const itens = await api.get(`/profissionais/${encodeURIComponent(profId)}/disponibilidades`);
    if (!itens.length) { el.innerHTML = vazio("Nenhum horário cadastrado. Sem horários, os pacientes não conseguem agendar."); return; }
    el.innerHTML = DIAS.map((nome, dia) => {
      const doDia = itens.filter((i) => i.diaSemana === dia);
      if (!doDia.length) return "";
      return `<div class="dia-bloco"><h3>${nome}</h3>${doDia.map((i) => `<div class="faixa"><span><b>${esc(i.inicio)} às ${esc(i.fim)}</b> · ${esc(i.clinicaNome)} · consultas de ${i.duracao} min</span>
        <button type="button" class="btn btn-sm btn-danger-outline" data-del="${esc(i.id)}" aria-label="Remover horário de ${nome} das ${esc(i.inicio)} às ${esc(i.fim)}">Remover</button></div>`).join("")}</div>`;
    }).join("");
  } catch (e) {
    el.innerHTML = erroBloco(e.message);
  }
}

$("disp-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  erro("");
  try {
    await comCarga(e.submitter, () => api.post(`/profissionais/${encodeURIComponent(profId)}/disponibilidades`, {
      clinicaId: $("d-clinica").value, diaSemana: Number($("d-dia").value), inicio: $("d-inicio").value, fim: $("d-fim").value, duracao: Number($("d-duracao").value),
    }));
    toast("Horário adicionado.", "ok");
    listar();
  } catch (err) {
    erro(err.message);
  }
});

$("lista-disp").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  if (!(await confirmar({ titulo: "Remover Horário", mensagem: "Remover este período de atendimento? Consultas já marcadas continuam valendo.", confirmar: "Remover", perigo: true }))) return;
  try {
    await api.del(`/disponibilidades/${encodeURIComponent(b.dataset.del)}`);
    toast("Horário removido.", "ok");
    listar();
  } catch (err) {
    toast(err.message, "erro");
  }
});

try {
  await escolherProfissional();
  await iniciar();
} catch (e) {
  $("lista-disp").innerHTML = erroBloco(e.message);
}
