// Agendamento em passos: clínica → especialidade → profissional → data → horário.
// Só mostra especialidades/profissionais que realmente atendem na clínica escolhida
// e só oferece horários livres (disponibilidade do profissional menos o que já foi marcado).
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { carregando, comCarga } from "../ui.js";
import { addDays, esc, fmtData, fmtDataLonga, isoDate, queryParams } from "../utils.js";

await iniciarPagina();

const $ = (id) => document.getElementById(id);
const params = queryParams();
const triagemId = params.get("triagemId") || "";
const especialidadePedida = params.get("especialidade") || "";

const selClinica = $("clinica"), selEsp = $("especialidade"), selProf = $("profissional"), inData = $("data");
const slotsEl = $("slots"), erroEl = $("erro"), btn = $("btn-confirmar"), resumo = $("resumo"), sugeridas = $("datas-sugeridas");

let clinicas = [], profsDaClinica = [], horarioEscolhido = "";

const opcoes = (lista, vazio) => `<option value="" disabled selected>${esc(vazio)}</option>` + lista.map((o) => `<option value="${esc(o.valor)}">${esc(o.rotulo)}</option>`).join("");
const liberar = (secaoId, ligado) => {
  $(secaoId).classList.toggle("bloqueado", !ligado);
  $(secaoId).querySelectorAll("select, input").forEach((el) => (el.disabled = !ligado));
};
const mostrarErro = (msg) => { erroEl.textContent = msg; erroEl.hidden = !msg; };

function limparHorario() {
  horarioEscolhido = "";
  resumo.hidden = true;
  btn.disabled = true;
}
function resetarAPartirDe(nivel) {
  limparHorario();
  if (nivel <= 1) { selEsp.innerHTML = opcoes([], "Escolha a clínica primeiro"); liberar("passo-esp", false); }
  if (nivel <= 2) { selProf.innerHTML = opcoes([], "Escolha a especialidade primeiro"); liberar("passo-prof", false); }
  if (nivel <= 3) {
    inData.value = "";
    liberar("passo-data", false);
    sugeridas.innerHTML = "";
    slotsEl.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Escolha a data para ver os horários.</p>';
  }
}

// ---------- Passo 1: clínica ----------
try {
  clinicas = await api.get("/clinicas");
  selClinica.innerHTML = opcoes(clinicas.map((c) => ({ valor: c.id, rotulo: `${c.nome} - ${c.bairro}, ${c.cidade}` })), "Selecione a clínica");
  if (clinicas.length === 1) { selClinica.value = clinicas[0].id; selClinica.dispatchEvent(new Event("change")); }
} catch (e) {
  mostrarErro(e.message);
}

selClinica.addEventListener("change", async () => {
  mostrarErro("");
  resetarAPartirDe(1);
  const clinica = clinicas.find((c) => c.id === selClinica.value);
  $("info-clinica").textContent = clinica ? `${clinica.endereco} · ${clinica.telefone || "sem telefone"}` : "";
  try {
    profsDaClinica = await api.get("/profissionais", { clinicaId: selClinica.value });
  } catch (e) {
    return mostrarErro(e.message);
  }
  const especialidades = [...new Map(profsDaClinica.map((p) => [p.especialidadeId, p.especialidadeNome])).entries()]
    .map(([valor, rotulo]) => ({ valor, rotulo }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  if (!especialidades.length) {
    selEsp.innerHTML = opcoes([], "Nenhuma especialidade nesta clínica");
    return mostrarErro("Esta clínica ainda não tem profissionais cadastrados. Escolha outra clínica.");
  }
  selEsp.innerHTML = opcoes(especialidades, "Selecione a especialidade");
  liberar("passo-esp", true);
  if (especialidades.some((e) => e.valor === especialidadePedida)) {
    selEsp.value = especialidadePedida;
    selEsp.dispatchEvent(new Event("change"));
  }
});

// ---------- Passo 2: especialidade ----------
selEsp.addEventListener("change", () => {
  mostrarErro("");
  resetarAPartirDe(2);
  const doTipo = profsDaClinica.filter((p) => p.especialidadeId === selEsp.value);
  selProf.innerHTML = opcoes(doTipo.map((p) => ({ valor: p.id, rotulo: `${p.nome} (${p.registro})` })), "Selecione o profissional");
  liberar("passo-prof", true);
  if (doTipo.length === 1) { selProf.value = doTipo[0].id; selProf.dispatchEvent(new Event("change")); }
});

// ---------- Passo 3: profissional ----------
selProf.addEventListener("change", async () => {
  mostrarErro("");
  resetarAPartirDe(3);
  liberar("passo-data", true);
  inData.min = isoDate();
  inData.max = addDays(isoDate(), 180);
  sugeridas.innerHTML = "";
  try {
    const datas = await api.get(`/profissionais/${selProf.value}/proximas-datas`, { clinicaId: selClinica.value, limite: 6 });
    sugeridas.innerHTML = datas.length
      ? `<span class="label" style="width:100%">Próximas datas com horário:</span>` + datas.map((d) => `<button type="button" class="btn btn-sm btn-outline" data-data="${d}">${esc(fmtData(d).slice(0, 5))}</button>`).join("")
      : '<span class="consulta-linha">Este profissional ainda não tem horários livres nesta clínica.</span>';
  } catch (e) {
    mostrarErro(e.message);
  }
});
sugeridas.addEventListener("click", (e) => {
  const b = e.target.closest("[data-data]");
  if (!b) return;
  inData.value = b.dataset.data;
  carregarHorarios();
});

// ---------- Passo 4: data e horário ----------
inData.addEventListener("change", carregarHorarios);

async function carregarHorarios() {
  limparHorario();
  mostrarErro("");
  if (!inData.value) return;
  slotsEl.innerHTML = carregando("Buscando horários...");
  try {
    const livres = await api.get(`/profissionais/${selProf.value}/horarios`, { data: inData.value, clinicaId: selClinica.value });
    if (!livres.length) {
      slotsEl.innerHTML = `<p class="empty-state" style="grid-column:1/-1">Sem horários livres em ${esc(fmtDataLonga(inData.value))}. Tente outra data.</p>`;
      return;
    }
    slotsEl.innerHTML = livres
      .map((h) => `<label class="slot"><input type="radio" name="horario" value="${esc(h.horario)}" /><span>${esc(h.horario)}</span></label>`)
      .join("");
  } catch (e) {
    slotsEl.innerHTML = "";
    mostrarErro(e.message);
  }
}

slotsEl.addEventListener("change", (e) => {
  if (e.target.name !== "horario") return;
  horarioEscolhido = e.target.value;
  const clinica = clinicas.find((c) => c.id === selClinica.value);
  const prof = profsDaClinica.find((p) => p.id === selProf.value);
  resumo.hidden = false;
  resumo.innerHTML = `<b>Resumo da Consulta</b><br>${esc(prof.especialidadeNome)} com ${esc(prof.nome)}<br>${esc(fmtDataLonga(inData.value))} às ${esc(horarioEscolhido)}<br>${esc(clinica.nome)} - ${esc(clinica.endereco)}`;
  btn.disabled = false;
});

// ---------- Confirmar ----------
$("agendamento-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarErro("");
  if (!horarioEscolhido) return mostrarErro("Escolha um horário disponível.");
  try {
    const ag = await comCarga(btn, () =>
      api.post("/agendamentos", { clinicaId: selClinica.value, profissionalId: selProf.value, data: inData.value, horario: horarioEscolhido, triagemId })
    );
    location.href = `agendamento-confirmado.html?id=${encodeURIComponent(ag.id)}`;
  } catch (err) {
    mostrarErro(err.message);
    if (err.status === 409) carregarHorarios(); // horário foi ocupado por outra pessoa: atualiza a lista
  }
});
