// Componentes de interface reutilizáveis: ícones, avisos (toast), confirmação, formulário em janela,
// campos, selos de status e estados vazios. Nenhuma tela mexe em alert()/confirm() do navegador.
import { esc, fmtTel, onlyDigits, cpfValido } from "./utils.js";

// ---------- Ícones ----------
const ICONES = {
  home: "M3 11l9-8 9 8v10H3z",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  card: "M3 5h18v14H3zM7 10h4M7 14h6",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 5-6 8-6s6.5 2 8 6",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c1-3.5 3.8-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 010 6.5M18 15c2 .6 3.2 2.3 3.5 5",
  building: "M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M4 21h16",
  steth: "M6 3v6a4 4 0 008 0V3M10 13v2a5 5 0 0010 0v-1M20 9a2 2 0 100 4 2 2 0 000-4z",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  logout: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
  back: "M15 18l-6-6 6-6",
  send: "M5 12h14M13 6l6 6-6 6",
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  plus: "M12 5v14M5 12h14",
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  check: "M5 12l5 5 9-10",
  x: "M6 6l12 12M18 6L6 18",
  chat: "M4 5h16v11H9l-5 4zM8 10h8",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  access: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.5 6M12 14.5l3.5 6"/>',
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
};

export function icon(nome, classe = "ico") {
  const d = ICONES[nome] || "";
  const miolo = d.startsWith("<") ? d : `<path d="${d}"/>`;
  return `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${miolo}</svg>`;
}

// Logo (cruz + coração) usada no cabeçalho
export const LOGO_SVG = `<img src="icons/logo.png" alt="" width="64" height="64" decoding="async" />`;

// ---------- Avisos (toast) ----------
export function toast(mensagem, tipo = "info") {
  let regiao = document.getElementById("toasts");
  if (!regiao) {
    regiao = document.createElement("div");
    regiao.id = "toasts";
    regiao.className = "toast-region";
    regiao.setAttribute("role", "status");
    regiao.setAttribute("aria-live", "polite");
    document.body.appendChild(regiao);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem;
  regiao.appendChild(el);
  setTimeout(() => el.classList.add("sair"), tipo === "erro" ? 6000 : 3800);
  setTimeout(() => el.remove(), tipo === "erro" ? 6400 : 4200);
}

// ---------- Janelas (dialog nativo: já prende o foco e fecha com Esc) ----------
function criarDialog(classe, html) {
  const d = document.createElement("dialog");
  d.className = `modal ${classe || ""}`;
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener("close", () => d.remove());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close(); // clique no fundo escuro fecha
  });
  return d;
}

/** Janela de confirmação. Devolve Promise<boolean>. */
export function confirmar({ titulo = "Confirmar", mensagem = "", confirmar: txt = "Confirmar", perigo = false } = {}) {
  return new Promise((resolve) => {
    const d = criarDialog("modal-sm", `
      <form method="dialog" class="modal-form">
        <h2 class="modal-titulo">${esc(titulo)}</h2>
        <p class="modal-texto">${esc(mensagem)}</p>
        <div class="modal-acoes">
          <button type="button" class="btn btn-outline" data-n>Voltar</button>
          <button type="submit" class="btn ${perigo ? "btn-danger" : ""}" data-s>${esc(txt)}</button>
        </div>
      </form>`);
    let resp = false;
    d.querySelector("[data-n]").addEventListener("click", () => d.close());
    d.querySelector("form").addEventListener("submit", () => (resp = true));
    d.addEventListener("close", () => resolve(resp));
    d.showModal();
    d.querySelector(perigo ? "[data-n]" : "[data-s]").focus();
  });
}

// ---------- Campos de formulário ----------
/**
 * def: { name, label, tipo, obrigatorio, opcoes:[{valor,rotulo}], placeholder, ajuda, completo, desabilitado, autocomplete, min, max }
 */
export function campoHtml(def, valor = "", prefixo = "f") {
  const id = `${prefixo}-${def.name}`;
  const obrig = def.obrigatorio ? " required" : "";
  const ajuda = def.ajuda ? `<small class="ajuda" id="${id}-ajuda">${esc(def.ajuda)}</small>` : "";
  const desc = def.ajuda ? ` aria-describedby="${id}-ajuda"` : "";
  const dis = def.desabilitado ? " disabled" : "";
  const classe = `field${def.completo ? " full" : ""}`;
  const rotulo = `<label for="${id}">${esc(def.label)}${def.obrigatorio ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>`;

  if (def.tipo === "multicheck") {
    const marcados = new Set(Array.isArray(valor) ? valor : []);
    return `<fieldset class="field full checks"><legend>${esc(def.label)}${def.obrigatorio ? ' <span class="req" aria-hidden="true">*</span>' : ""}</legend>
      ${(def.opcoes || []).map((o, i) => `<label class="check"><input type="checkbox" name="${def.name}" value="${esc(o.valor)}" ${marcados.has(o.valor) ? "checked" : ""}/><span>${esc(o.rotulo)}</span></label>`).join("") || '<p class="aviso">Nenhuma opção cadastrada.</p>'}
      ${ajuda}</fieldset>`;
  }
  if (def.tipo === "select") {
    const ops = (def.opcoes || []).map((o) => `<option value="${esc(o.valor)}" ${String(o.valor) === String(valor) ? "selected" : ""}>${esc(o.rotulo)}</option>`).join("");
    return `<div class="${classe}">${rotulo}<select id="${id}" name="${def.name}"${obrig}${dis}${desc}><option value="" ${valor ? "" : "selected"} disabled>${esc(def.placeholder || "Selecione")}</option>${ops}</select>${ajuda}</div>`;
  }
  if (def.tipo === "textarea") {
    return `<div class="${classe}">${rotulo}<textarea id="${id}" name="${def.name}" rows="3"${obrig}${dis}${desc} placeholder="${esc(def.placeholder || "")}">${esc(valor)}</textarea>${ajuda}</div>`;
  }
  const tipoInput = { cpf: "text", tel: "tel", password: "password", email: "email", date: "date", time: "time", number: "number" }[def.tipo] || "text";
  const extra = [
    def.tipo === "cpf" ? 'inputmode="numeric" maxlength="11" pattern="[0-9]{11}" data-mascara="cpf"' : "",
    def.tipo === "tel" ? 'inputmode="tel" data-mascara="tel"' : "",
    def.autocomplete ? `autocomplete="${def.autocomplete}"` : "",
    def.min !== undefined ? `min="${def.min}"` : "",
    def.max !== undefined ? `max="${def.max}"` : "",
    def.minlength ? `minlength="${def.minlength}"` : "",
  ].join(" ");
  return `<div class="${classe}">${rotulo}<input id="${id}" name="${def.name}" type="${tipoInput}" value="${esc(valor)}" placeholder="${esc(def.placeholder || "")}" ${extra}${obrig}${dis}${desc} />${ajuda}</div>`;
}

/** Liga máscaras e validações (CPF/telefone) dentro de um container. */
export function ativarMascaras(raiz = document) {
  raiz.querySelectorAll('[data-mascara="cpf"], input[name="cpf"]').forEach((el) => {
    el.addEventListener("input", () => {
      el.value = onlyDigits(el.value).slice(0, 11);
      el.setCustomValidity(el.value.length === 11 && !cpfValido(el.value) ? "CPF inválido. Confira os 11 números." : "");
    });
  });
  raiz.querySelectorAll('[data-mascara="tel"], input[type="tel"]').forEach((el) => {
    if (!el.placeholder) el.placeholder = "(81) 99999-9999";
    el.addEventListener("input", () => (el.value = fmtTel(el.value)));
  });
}

/** Lê os valores de um <form> (checkboxes do mesmo nome viram array). */
export function lerFormulario(form) {
  const dados = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    if (dados[k] === undefined) dados[k] = v;
    else dados[k] = [].concat(dados[k], v);
  }
  form.querySelectorAll('input[type="checkbox"]').forEach((c) => {
    if (dados[c.name] === undefined) dados[c.name] = [];
    else if (!Array.isArray(dados[c.name])) dados[c.name] = [dados[c.name]];
  });
  return dados;
}

/**
 * Abre um formulário dentro de uma janela.
 * onSubmit(valores) deve lançar erro (ApiError) para mostrar a mensagem sem fechar a janela.
 */
export function abrirFormulario({ titulo, campos, valores = {}, textoSalvar = "Salvar", onSubmit }) {
  return new Promise((resolve) => {
    const d = criarDialog("modal-form-wrap", `
      <form class="modal-form">
        <div class="modal-topo">
          <h2 class="modal-titulo">${esc(titulo)}</h2>
          <button type="button" class="icon-btn" data-fechar aria-label="Fechar">${icon("x")}</button>
        </div>
        <div class="form-grid">${campos.map((c) => campoHtml(c, valores[c.name] ?? "", "m")).join("")}</div>
        <p class="erro-form" role="alert" hidden></p>
        <div class="modal-acoes">
          <button type="button" class="btn btn-outline" data-fechar>Cancelar</button>
          <button type="submit" class="btn">${esc(textoSalvar)}</button>
        </div>
      </form>`);
    const form = d.querySelector("form");
    const erroEl = d.querySelector(".erro-form");
    let salvo = false;
    ativarMascaras(d);
    d.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", () => d.close()));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroEl.hidden = true;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await onSubmit(lerFormulario(form));
        salvo = true;
        d.close();
      } catch (err) {
        erroEl.textContent = err.message || "Não foi possível salvar.";
        erroEl.hidden = false;
        btn.disabled = false;
      }
    });
    d.addEventListener("close", () => resolve(salvo));
    d.showModal();
    const primeiro = form.querySelector("input:not([disabled]), select:not([disabled]), textarea");
    if (primeiro) primeiro.focus();
  });
}

// ---------- Pequenos blocos ----------
export const STATUS = {
  agendado: { rotulo: "Agendada", classe: "agendada" },
  concluido: { rotulo: "Concluída", classe: "realizada" },
  cancelado: { rotulo: "Cancelada", classe: "cancelada" },
};
export const seloStatus = (status, rotuloExtra) => {
  const s = STATUS[status] || { rotulo: status, classe: "" };
  return `<span class="consulta-status ${s.classe}">${esc(rotuloExtra || s.rotulo)}</span>`;
};
export const vazio = (msg) => `<p class="empty-state">${esc(msg)}</p>`;
export const carregando = (msg = "Carregando...") => `<p class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span> ${esc(msg)}</p>`;
export const erroBloco = (msg) => `<p class="empty-state erro" role="alert">${esc(msg)}</p>`;

/** Desabilita o botão enquanto roda uma ação assíncrona. */
export async function comCarga(botao, fn) {
  if (botao) botao.disabled = true;
  try {
    return await fn();
  } finally {
    if (botao) botao.disabled = false;
  }
}

/** Liga um conjunto de abas (role=tablist) */
export function ativarAbas(raiz) {
  const botoes = [...raiz.querySelectorAll('[role="tab"]')];
  const mostrar = (alvo) => {
    botoes.forEach((b) => {
      const ativo = b === alvo;
      b.classList.toggle("active", ativo);
      b.setAttribute("aria-selected", String(ativo));
      b.tabIndex = ativo ? 0 : -1;
      document.getElementById(b.getAttribute("aria-controls")).classList.toggle("active", ativo);
    });
  };
  botoes.forEach((b, i) => {
    b.addEventListener("click", () => mostrar(b));
    b.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      const prox = botoes[(i + dir + botoes.length) % botoes.length];
      mostrar(prox);
      prox.focus();
    });
  });
}
