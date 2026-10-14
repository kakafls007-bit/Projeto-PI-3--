// Triagem por chatbot (texto, opções e áudio). No final envia as respostas para POST /triagens,
// que devolve a especialidade sugerida, e leva o paciente direto para o agendamento.
import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { icon, toast } from "../ui.js";
import { esc } from "../utils.js";

await iniciarPagina();

const msgs = document.getElementById("chat-messages");
const area = document.getElementById("chat-input-area");

const PERGUNTAS = [
  { id: "motivo", tipo: "texto", pergunta: "Oi! Antes da sua consulta, vou te fazer algumas perguntas rápidas. Qual o motivo que te trouxe até aqui?", placeholder: "Ex.: dor de cabeça, retorno, exame..." },
  {
    id: "sintomas", tipo: "multipla", pergunta: "Você está sentindo algum desses sintomas? Pode marcar mais de um.",
    opcoes: [["febre", "Febre"], ["tosse", "Tosse"], ["dor_cabeca", "Dor de Cabeça"], ["dor_corpo", "Dor no Corpo"], ["falta_ar", "Falta de Ar"], ["nausea", "Náusea"]],
  },
  { id: "urgencia", tipo: "unica", pergunta: "Como você classificaria a urgência disso?", opcoes: [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]] },
  { id: "observacoes", tipo: "texto-opcional", pergunta: "Quer contar mais algum detalhe? Se não tiver nada, é só pular.", placeholder: "Observações (opcional)" },
];
const respostas = {};
let passo = 0;

function addMensagem(texto, autor) {
  const el = document.createElement("div");
  el.className = `msg msg-${autor}`;
  el.textContent = texto;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function addAudio(url) {
  const el = document.createElement("div");
  el.className = "msg msg-user";
  el.innerHTML = `<audio controls src="${url}" aria-label="Seu áudio enviado"></audio>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

// Gravação de áudio: toque para gravar e toque de novo para enviar
function criarMic(onAudio) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chat-mic";
  b.title = "Enviar Áudio";
  b.setAttribute("aria-label", "Gravar áudio");
  b.innerHTML = icon("mic");
  let rec, chunks = [], t0, timer;
  b.addEventListener("click", async () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast("Este navegador não permite gravar áudio.", "erro");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rec = new MediaRecorder(stream);
      chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        b.classList.remove("rec");
        b.innerHTML = icon("mic");
        b.setAttribute("aria-label", "Gravar áudio");
        onAudio(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
      };
      rec.start();
      t0 = Date.now();
      b.classList.add("rec");
      b.setAttribute("aria-label", "Parar e enviar áudio");
      timer = setInterval(() => { b.textContent = Math.floor((Date.now() - t0) / 1000) + "s"; }, 500);
    } catch {
      toast("Não foi possível acessar o microfone. Libere a permissão no navegador.", "erro");
    }
  });
  return b;
}

function avancar() {
  passo++;
  renderPasso();
}

async function finalizar() {
  area.innerHTML = "";
  addMensagem("Só um instante, estou analisando suas respostas...", "bot");
  try {
    const r = await api.post("/triagens", respostas);
    addMensagem(`Com base no que você me contou, o mais indicado é uma consulta de ${r.especialidadeSugerida.nome}. Toque no botão abaixo para escolher a clínica, o profissional e o horário.`, "bot");
    const agendar = document.createElement("a");
    agendar.className = "btn";
    agendar.href = `agendamento.html?especialidade=${encodeURIComponent(r.especialidadeSugerida.id)}&triagemId=${encodeURIComponent(r.id)}`;
    agendar.textContent = `Agendar ${r.especialidadeSugerida.nome}`;
    const ver = document.createElement("a");
    ver.className = "secondary-link";
    ver.href = "consultas.html";
    ver.textContent = "Ver Minhas Consultas";
    area.append(agendar, ver);
  } catch (e) {
    addMensagem("Não consegui concluir a triagem agora. Tente de novo em instantes.", "bot");
    toast(e.message, "erro");
    const tentar = document.createElement("button");
    tentar.type = "button";
    tentar.className = "btn";
    tentar.textContent = "Tentar de Novo";
    tentar.addEventListener("click", finalizar);
    area.appendChild(tentar);
  }
}

function renderPasso() {
  area.innerHTML = "";
  if (passo >= PERGUNTAS.length) return finalizar();
  const p = PERGUNTAS[passo];
  addMensagem(p.pergunta, "bot");

  if (p.tipo === "texto" || p.tipo === "texto-opcional") {
    const row = document.createElement("div");
    row.className = "chat-send-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "chat-text-input";
    input.placeholder = p.placeholder || "";
    input.setAttribute("aria-label", p.pergunta);
    const enviar = () => {
      const valor = input.value.trim();
      if (!valor && p.tipo === "texto") return input.focus();
      respostas[p.id] = valor;
      addMensagem(valor || "Pular", "user");
      avancar();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } });
    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "chat-send-btn";
    sendBtn.setAttribute("aria-label", "Enviar mensagem");
    sendBtn.innerHTML = icon("send");
    sendBtn.addEventListener("click", enviar);
    row.append(input, criarMic((url) => { respostas[p.id] = p.tipo === "texto" ? "[Áudio enviado]" : "[Áudio enviado]"; addAudio(url); avancar(); }), sendBtn);
    area.appendChild(row);
    if (p.tipo === "texto-opcional") {
      const pular = document.createElement("button");
      pular.type = "button";
      pular.className = "secondary-link";
      pular.textContent = "Pular";
      pular.addEventListener("click", () => { respostas[p.id] = ""; addMensagem("Pular", "user"); avancar(); });
      area.appendChild(pular);
    }
    input.focus();
  }

  if (p.tipo === "multipla") {
    const sel = new Set();
    const chips = document.createElement("div");
    chips.className = "chat-chips";
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", p.pergunta);
    p.opcoes.forEach(([valor, rotulo]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-chip";
      chip.textContent = rotulo;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        const ligado = !sel.has(valor);
        ligado ? sel.add(valor) : sel.delete(valor);
        chip.classList.toggle("selected", ligado);
        chip.setAttribute("aria-pressed", String(ligado));
      });
      chips.appendChild(chip);
    });
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "btn";
    ok.textContent = "Confirmar";
    ok.addEventListener("click", () => {
      const valores = [...sel];
      respostas[p.id] = valores;
      const nomes = Object.fromEntries(p.opcoes);
      addMensagem(valores.length ? valores.map((v) => nomes[v]).join(", ") : "Nenhum sintoma informado", "user");
      avancar();
    });
    area.append(chips, ok);
  }

  if (p.tipo === "unica") {
    const chips = document.createElement("div");
    chips.className = "chat-chips";
    p.opcoes.forEach(([valor, rotulo]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-chip";
      chip.textContent = rotulo;
      chip.addEventListener("click", () => { respostas[p.id] = valor; addMensagem(rotulo, "user"); avancar(); });
      chips.appendChild(chip);
    });
    area.appendChild(chips);
  }
}

renderPasso();
