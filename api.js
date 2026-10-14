// Cliente da API REST. Todas as telas falam SOMENTE com este módulo.
// - Com API_BASE_URL preenchida: usa fetch() no back-end real (Authorization: Bearer <token>).
// - Sem API_BASE_URL: usa o servidor simulado local (js/mock/server.js), que obedece o mesmo contrato.
import { CONFIG, USANDO_MOCK } from "./config.js";
import { getToken, getUser, limparSessao, loginDoPerfil } from "./session.js";

export class ApiError extends Error {
  constructor(status, message, detalhes) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detalhes = detalhes;
  }
}

let mockHandle = null;
async function mock() {
  if (!mockHandle) mockHandle = (await import("./mock/server.js")).handle;
  return mockHandle;
}

function comQuery(path, query) {
  const qs = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

async function request(method, path, { query, body } = {}) {
  const url = comQuery(path, query);
  const token = getToken();
  let status, dados;

  if (USANDO_MOCK) {
    const handle = await mock();
    await new Promise((r) => setTimeout(r, CONFIG.MOCK_LATENCY_MS));
    ({ status, data: dados } = handle(method, url, body, token));
  } else {
    let res;
    try {
      res = await fetch(CONFIG.API_BASE_URL + url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "Sem conexão com o servidor. Confira sua internet e tente de novo.");
    }
    status = res.status;
    dados = res.status === 204 ? null : await res.json().catch(() => null);
  }

  if (status >= 200 && status < 300) return dados;

  // Sessão vencida: volta para o login certo (as rotas de login não entram nessa regra)
  if (status === 401 && !path.startsWith("/auth/") && token) {
    const perfil = (getUser() || {}).perfil;
    limparSessao();
    location.replace(`${loginDoPerfil(perfil)}?expirou=1`);
  }
  throw new ApiError(status, (dados && dados.message) || "Não foi possível concluir a ação.", dados && dados.detalhes);
}

export const api = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body) => request("POST", path, { body: body ?? {} }),
  put: (path, body) => request("PUT", path, { body: body ?? {} }),
  patch: (path, body) => request("PATCH", path, { body: body ?? {} }),
  del: (path) => request("DELETE", path),
};
