// Sessão do usuário (token + dados básicos). O back-end real devolve o token no login;
// aqui ele fica no sessionStorage, então fechar a aba = sair da conta.
const KEY = "caismed.sessao";

export function getSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}
export const getToken = () => (getSessao() || {}).token || null;
export const getUser = () => (getSessao() || {}).usuario || null;
export const setSessao = (token, usuario) => sessionStorage.setItem(KEY, JSON.stringify({ token, usuario }));
export const atualizarUsuario = (usuario) => setSessao(getToken(), { ...getUser(), ...usuario });
export const limparSessao = () => sessionStorage.removeItem(KEY);

export const homeDoPerfil = (perfil) =>
  ({ paciente: "home.html", profissional: "painel-profissional.html", administrador: "admin.html" }[perfil] || "index.html");
export const loginDoPerfil = (perfil) => (perfil === "paciente" ? "index.html" : "login-profissional.html");
