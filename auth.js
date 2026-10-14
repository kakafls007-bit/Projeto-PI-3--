// Telas públicas: login do paciente, login da equipe, primeiro acesso e recuperação de senha.
import { api } from "../api.js";
import { USANDO_MOCK } from "../config.js";
import { iniciarPagina } from "../layout.js";
import { homeDoPerfil, setSessao } from "../session.js";
import { ativarMascaras, comCarga } from "../ui.js";

await iniciarPagina();
ativarMascaras();

const erroEl = document.getElementById("erro");
const mostrarErro = (msg) => {
  erroEl.textContent = msg;
  erroEl.hidden = false;
  erroEl.scrollIntoView({ block: "nearest" });
};
const limparErro = () => erroEl && (erroEl.hidden = true);

// Botão "Mostrar" senha
document.querySelectorAll("[data-mostrar]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const campo = btn.parentElement.querySelector("input");
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    btn.textContent = mostrar ? "Ocultar" : "Mostrar";
    btn.setAttribute("aria-pressed", String(mostrar));
    btn.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });
});

// Dicas para a demonstração (só aparecem enquanto o servidor é o simulado)
const demo = document.getElementById("demo");
if (demo && USANDO_MOCK) {
  demo.hidden = false;
  demo.textContent = document.getElementById("login-form")
    ? "Demonstração: CPF 52998224725 e senha senha123."
    : "Demonstração: profissional 1001 / caismed123 · administrador 9001 / admin123.";
}

function ligar(id, fn) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparErro();
    const btn = form.querySelector('button[type="submit"]');
    try {
      await comCarga(btn, () => fn(Object.fromEntries(new FormData(form))));
    } catch (err) {
      mostrarErro(err.message);
    }
  });
}

ligar("login-form", async (v) => {
  const r = await api.post("/auth/login", { cpf: v.cpf, senha: v.senha });
  setSessao(r.token, r.usuario);
  location.href = homeDoPerfil(r.usuario.perfil);
});

ligar("login-equipe-form", async (v) => {
  const r = await api.post("/auth/staff/login", { matricula: v.matricula, senha: v.senha });
  setSessao(r.token, r.usuario);
  location.href = homeDoPerfil(r.usuario.perfil);
});

ligar("primeiro-form", async (v) => {
  if (v.senha !== v.senha2) throw new Error("As senhas não são iguais.");
  await api.post("/auth/primeiro-acesso", { cpf: v.cpf, senha: v.senha });
  location.href = "index.html?senha=criada";
});

ligar("recuperar-form", async (v) => {
  await api.post("/auth/recuperar-senha", { cpf: v.cpf });
  location.href = "confirmacao.html";
});

// Mensagem depois de criar a senha
if (new URLSearchParams(location.search).get("senha") === "criada" && erroEl) {
  const { toast } = await import("../ui.js");
  toast("Senha criada com sucesso! Agora é só entrar.", "ok");
}
