// Service worker do CaisMed (PWA): guarda a "casca" do app para abrir rápido e mostrar tela offline.
// Suba o número da VERSAO sempre que mudar algum arquivo, para os usuários receberem a atualização.
const VERSAO = "caismed-v3";
const ARQUIVOS = [
  "./",
  "admin-agendamentos.html",
  "admin-clinicas.html",
  "admin-especialidades.html",
  "admin-profissionais.html",
  "admin.html",
  "agendamento-confirmado.html",
  "agendamento.html",
  "carteirinha.html",
  "confirmacao.html",
  "consulta-profissional.html",
  "consultas.html",
  "css/style.css",
  "disponibilidade.html",
  "home.html",
  "icons/apple-touch-icon.png",
  "icons/favicon-48.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/logo.png",
  "index.html",
  "js/api.js",
  "js/components/crud.js",
  "js/config.js",
  "js/layout.js",
  "js/mock/hash.js",
  "js/mock/seed.js",
  "js/mock/server.js",
  "js/pages/admin-agendamentos.js",
  "js/pages/admin-clinicas.js",
  "js/pages/admin-especialidades.js",
  "js/pages/admin-profissionais.js",
  "js/pages/admin.js",
  "js/pages/agendamento-confirmado.js",
  "js/pages/agendamento.js",
  "js/pages/auth.js",
  "js/pages/carteirinha.js",
  "js/pages/consulta-profissional.js",
  "js/pages/consultas.js",
  "js/pages/disponibilidade.js",
  "js/pages/home.js",
  "js/pages/pacientes.js",
  "js/pages/pagamento.js",
  "js/pages/painel-profissional.js",
  "js/pages/perfil-editar.js",
  "js/pages/perfil.js",
  "js/pages/triagem.js",
  "js/session.js",
  "js/ui.js",
  "js/utils.js",
  "login-profissional.html",
  "manifest.webmanifest",
  "offline.html",
  "pacientes.html",
  "pagamento.html",
  "painel-profissional.html",
  "perfil-editar.html",
  "perfil.html",
  "primeiro-acesso.html",
  "recuperar-senha.html",
  "triagem.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Só mexe em arquivos do próprio app; chamadas à API real (outra origem) passam direto
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    // Telas: tenta a rede e, sem internet, usa a cópia guardada (ou a tela de offline)
    e.respondWith(
      fetch(req).then((res) => { const c = res.clone(); caches.open(VERSAO).then((cache) => cache.put(req, c)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("offline.html")))
    );
    return;
  }
  // Arquivos estáticos: usa o guardado e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then((guardado) => {
      const rede = fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(VERSAO).then((cache) => cache.put(req, c)); } return res; }).catch(() => guardado);
      return guardado || rede;
    })
  );
});
