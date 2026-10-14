// Configuração central do front-end.
// Para ligar o back-end real, basta preencher API_BASE_URL (ex.: "https://api.caismed.com.br").
// Enquanto estiver vazio, o app usa o servidor simulado (js/mock), que guarda tudo no localStorage
// e responde exatamente nas mesmas rotas REST descritas no README.
export const CONFIG = Object.freeze({
  API_BASE_URL: "",
  MOCK_LATENCY_MS: 120,
});

export const USANDO_MOCK = !CONFIG.API_BASE_URL;
