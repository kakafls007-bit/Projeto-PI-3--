// Estrutura comum de todas as telas: controle de acesso por perfil, cabeçalho azul (logo, acessibilidade
// e sino), navegação (barra embaixo no celular, menu lateral no computador), painel de acessibilidade,
// aviso de offline e registro do PWA.
import { api } from "./api.js";
import { getUser, limparSessao, homeDoPerfil, loginDoPerfil } from "./session.js";
import { LOGO_SVG, icon, toast } from "./ui.js";
import { addDays, isoDate } from "./utils.js";

// Itens do menu por perfil. "extra" = só aparece no menu lateral do computador
// (no celular o administrador chega neles pelos atalhos da tela Resumo).
const MENUS = {
  paciente: [
    { href: "home.html", rotulo: "Início", icone: "home", telas: ["home", "triagem", "pagamento"] },
    { href: "consultas.html", rotulo: "Consultas", icone: "calendar", telas: ["consultas", "agendamento", "agendamento-confirmado"] },
    { href: "carteirinha.html", rotulo: "Carteirinha", icone: "card", telas: ["carteirinha"] },
    { href: "perfil.html", rotulo: "Perfil", icone: "user", telas: ["perfil", "perfil-editar"] },
  ],
  profissional: [
    { href: "painel-profissional.html", rotulo: "Agenda", icone: "calendar", telas: ["painel-profissional", "consulta-profissional"] },
    { href: "pacientes.html", rotulo: "Pacientes", icone: "users", telas: ["pacientes"] },
    { href: "disponibilidade.html", rotulo: "Horários", icone: "clock", telas: ["disponibilidade"] },
    { sair: true, rotulo: "Sair", icone: "logout" },
  ],
  administrador: [
    { href: "admin.html", rotulo: "Resumo", icone: "chart", telas: ["admin"] },
    { href: "admin-clinicas.html", rotulo: "Clínicas", icone: "building", telas: ["admin-clinicas"], extra: true },
    { href: "admin-profissionais.html", rotulo: "Profissionais", icone: "steth", telas: ["admin-profissionais", "disponibilidade"], extra: true },
    { href: "admin-especialidades.html", rotulo: "Especialidades", icone: "list", telas: ["admin-especialidades"], extra: true },
    { href: "pacientes.html", rotulo: "Pacientes", icone: "users", telas: ["pacientes"] },
    { href: "admin-agendamentos.html", rotulo: "Agendamentos", icone: "calendar", telas: ["admin-agendamentos", "consulta-profissional"] },
    { sair: true, rotulo: "Sair", icone: "logout" },
  ],
};
const SINO = { paciente: "consultas.html", profissional: "painel-profissional.html", administrador: "admin-agendamentos.html" };

const nuncaResolve = () => new Promise(() => {});
const telaAtual = () => (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";

export function sair() {
  const perfil = (getUser() || {}).perfil;
  limparSessao();
  location.href = loginDoPerfil(perfil);
}

/**
 * Chamada no início de toda tela. Confere se o perfil pode ver a página (data-perfil no <body>),
 * monta o layout e devolve o usuário logado (ou null nas telas públicas).
 */
export async function iniciarPagina() {
  const perfis = (document.body.dataset.perfil || "publico").split(",");
  const user = getUser();
  if (!perfis.includes("publico")) {
    if (!user) {
      location.replace(perfis.includes("paciente") ? "index.html" : "login-profissional.html");
      return nuncaResolve();
    }
    if (!perfis.includes(user.perfil)) {
      location.replace(homeDoPerfil(user.perfil));
      return nuncaResolve();
    }
  }
  montar(user, perfis);
  registrarPWA();
  return user;
}

function montar(user, perfis) {
  const app = document.getElementById("app");
  const main = document.getElementById("main");
  const publico = perfis.includes("publico");
  const voltar = document.body.dataset.voltar;
  const heroi = document.body.dataset.layout === "hero";

  // Link "pular para o conteúdo" (teclado e leitores de tela)
  const skip = document.createElement("a");
  skip.className = "skip-link";
  skip.href = "#main";
  skip.textContent = "Pular Para o Conteúdo";
  document.body.prepend(skip);

  // Cabeçalho azul padrão do site
  const logoLink = user ? homeDoPerfil(user.perfil) : "index.html";
  const btnVoltar = voltar ? `<a href="${voltar}" class="back-btn" aria-label="Voltar">${icon("back")}</a>` : "";
  const btnAcess = `<button type="button" class="a11y-btn" id="btn-a11y" aria-label="Acessibilidade" title="Acessibilidade">${icon("access")}</button>`;
  const header = document.createElement("header");
  if (heroi) {
    header.className = "app-header";
    header.innerHTML = `${btnVoltar}<div class="logo"><span class="logo-icon">${LOGO_SVG}</span><span>CaisMed</span></div>${btnAcess}`;
  } else {
    header.className = "app-header header-compact";
    const sino = user
      ? `<a class="bell" id="sino" href="${SINO[user.perfil]}" aria-label="Notificações">${icon("bell")}<i hidden></i></a>`
      : "";
    header.innerHTML = `${btnVoltar}<a class="logo logo-inline" href="${logoLink}" aria-label="CaisMed - Página inicial"><span class="logo-icon">${LOGO_SVG}</span><span>CaisMed</span></a><div class="header-acoes">${btnAcess}${sino}</div>`;
  }
  app.prepend(header);

  // Navegação
  const itens = user && !publico ? MENUS[user.perfil] : null;
  if (itens && document.body.dataset.nav !== "off") {
    const tela = telaAtual();
    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Menu Principal");
    nav.innerHTML = itens
      .map((i) => {
        const cls = [i.extra ? "nav-extra" : "", !i.sair && i.telas.includes(tela) ? "on" : ""].join(" ").trim();
        const miolo = `<span>${icon(i.icone)}</span>${i.rotulo}`;
        return i.sair
          ? `<button type="button" class="nav-sair" data-sair>${miolo}</button>`
          : `<a href="${i.href}" class="${cls}" ${i.telas.includes(tela) ? 'aria-current="page"' : ""}>${miolo}</a>`;
      })
      .join("");
    nav.querySelector("[data-sair]")?.addEventListener("click", sair);
    app.appendChild(nav);
    app.classList.add("has-nav");
    document.documentElement.style.setProperty("--n-itens", itens.filter((i) => !i.extra).length);
  } else if (publico) {
    app.classList.add("app--public");
  }

  // Sair da conta (botões com data-sair dentro da tela)
  document.querySelectorAll("[data-sair]").forEach((b) => b.addEventListener("click", sair));

  painelAcessibilidade();
  avisoOffline();
  if (user) marcarSino(user);
  if (new URLSearchParams(location.search).get("expirou")) toast("Sua sessão expirou. Entre de novo para continuar.", "info");
  main.focus({ preventScroll: true });
}

// Bolinha vermelha no sino quando há consulta hoje ou amanhã (melhor esforço: se falhar, só não aparece)
async function marcarSino(user) {
  try {
    const hoje = isoDate();
    const lista = await api.get("/agendamentos", { status: "agendado", de: hoje, ate: addDays(hoje, 1) });
    const sino = document.getElementById("sino");
    if (sino && lista.length) {
      sino.querySelector("i").hidden = false;
      sino.setAttribute("aria-label", `Notificações: ${lista.length} consulta${lista.length > 1 ? "s" : ""} hoje ou amanhã`);
    }
  } catch {
    /* ignora */
  }
}

// ---------- Acessibilidade: tema claro/escuro (mesmas cores) e tamanho do texto ----------
const TEMAS = [
  { id: "claro", nome: "Claro", desc: "Fundo claro, como o app é por padrão" },
  { id: "escuro", nome: "Escuro", desc: "Fundo escuro, mais confortável à noite" },
];
const FONTES = [
  { id: "normal", nome: "Texto Normal", desc: "Tamanho padrão" },
  { id: "grande", nome: "Texto Grande", desc: "Letras maiores em todo o app" },
];
let instalador = null;

function painelAcessibilidade() {
  const aplicar = (chave, atributo, id) => {
    document.documentElement.setAttribute(atributo, id);
    try { localStorage.setItem(chave, id); } catch { /* modo privado */ }
    dlg.querySelectorAll(`[data-${chave}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[chave] === id)));
  };
  const dlg = document.createElement("dialog");
  dlg.className = "modal a11y-dialog";
  dlg.setAttribute("aria-labelledby", "a11y-titulo");
  dlg.innerHTML = `
    <div class="modal-form">
      <div class="modal-topo"><h2 class="modal-titulo" id="a11y-titulo">Acessibilidade</h2>
        <button type="button" class="icon-btn" data-fechar aria-label="Fechar">${icon("x")}</button></div>
      <p class="a11y-sub">Escolha o tema e o tamanho do texto. As cores do app continuam as mesmas.</p>
      <div class="a11y-grupo" role="group" aria-label="Tema">
        ${TEMAS.map((t) => `<button type="button" class="a11y-opt" data-tema="${t.id}" aria-pressed="false"><span class="a11y-swatch sw-${t.id}"></span><span><b>${t.nome}</b><small>${t.desc}</small></span></button>`).join("")}
      </div>
      <div class="a11y-grupo" role="group" aria-label="Tamanho do texto">
        ${FONTES.map((t) => `<button type="button" class="a11y-opt" data-fonte="${t.id}" aria-pressed="false"><span class="a11y-swatch sw-fonte">A</span><span><b>${t.nome}</b><small>${t.desc}</small></span></button>`).join("")}
      </div>
      <button type="button" class="btn" id="btn-instalar" hidden>${icon("download")} Instalar o App</button>
    </div>`;
  document.body.appendChild(dlg);
  dlg.querySelector("[data-fechar]").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll("[data-tema]").forEach((b) => b.addEventListener("click", () => aplicar("tema", "data-tema", b.dataset.tema)));
  dlg.querySelectorAll("[data-fonte]").forEach((b) => b.addEventListener("click", () => aplicar("fonte", "data-fonte", b.dataset.fonte)));
  aplicar("tema", "data-tema", document.documentElement.getAttribute("data-tema") || "claro");
  aplicar("fonte", "data-fonte", document.documentElement.getAttribute("data-fonte") || "normal");
  document.getElementById("btn-a11y").addEventListener("click", () => dlg.showModal());

  const btnInstalar = dlg.querySelector("#btn-instalar");
  const mostrarInstalar = () => { btnInstalar.hidden = !instalador; };
  btnInstalar.addEventListener("click", async () => {
    if (!instalador) return;
    instalador.prompt();
    await instalador.userChoice;
    instalador = null;
    mostrarInstalar();
  });
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); instalador = e; mostrarInstalar(); });
  window.addEventListener("appinstalled", () => { instalador = null; mostrarInstalar(); toast("App instalado com sucesso!", "ok"); });
  mostrarInstalar();
}

function avisoOffline() {
  const faixa = document.createElement("div");
  faixa.className = "offline-banner";
  faixa.setAttribute("role", "status");
  faixa.hidden = navigator.onLine;
  faixa.textContent = "Você está sem internet. Algumas ações podem não funcionar.";
  document.body.appendChild(faixa);
  window.addEventListener("online", () => { faixa.hidden = true; toast("Conexão restabelecida.", "ok"); });
  window.addEventListener("offline", () => { faixa.hidden = false; });
}

function registrarPWA() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
