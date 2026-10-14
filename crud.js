// Componente genérico de cadastro: busca + filtros + lista de cartões + janela de criar/editar + excluir.
// É reaproveitado nas telas de Clínicas, Especialidades, Profissionais e Pacientes.
import { api } from "../api.js";
import { abrirFormulario, carregando, confirmar, erroBloco, icon, toast, vazio } from "../ui.js";
import { debounce, esc } from "../utils.js";

/**
 * cfg:
 *  raiz            elemento onde o componente é desenhado
 *  endpoint        ex.: "/clinicas"
 *  rotulo          { singular: "Clínica", plural: "Clínicas", genero: "a" | "o" }
 *  campos          lista de definições de campo (ver ui.campoHtml); `opcoes` pode ser função async
 *  filtros         [{ name, label, opcoes: [{valor,rotulo}] | async fn }]  (além da busca por texto)
 *  buscaPlaceholder
 *  card(item)      => { titulo, subtitulo, selo?, linhas?: [texto] }
 *  acoesExtras(item) => html extra nos botões do cartão
 *  podeCriar, podeEditar, podeExcluir(item)
 *  paraPayload(valores, item) => objeto enviado à API
 *  valoresIniciais(item) => objeto com valores do formulário (padrão: o próprio item)
 *  textoExcluir(item) => mensagem da confirmação
 */
export async function criarCrud(cfg) {
  const { raiz, endpoint, rotulo } = cfg;
  const podeCriar = cfg.podeCriar !== false;
  const podeEditar = cfg.podeEditar !== false;
  const artigo = rotulo.genero === "a" ? "a" : "o";
  const novo = rotulo.genero === "a" ? "Nova" : "Novo";
  let itens = [];

  // Opções dos filtros/campos podem vir da API
  const resolverOpcoes = async (lista) =>
    Promise.all(lista.map(async (c) => ({ ...c, opcoes: typeof c.opcoes === "function" ? await c.opcoes() : c.opcoes })));
  const filtros = await resolverOpcoes(cfg.filtros || []);

  raiz.innerHTML = `
    <div class="toolbar">
      <form class="filtros" role="search" aria-label="Buscar ${esc(rotulo.plural)}">
        <div class="search">${icon("search")}
          <label class="sr-only" for="busca-${endpoint.slice(1)}">Buscar</label>
          <input type="search" id="busca-${endpoint.slice(1)}" name="busca" placeholder="${esc(cfg.buscaPlaceholder || "Buscar")}" autocomplete="off" />
        </div>
        ${filtros.map((f) => `<div class="filtro"><label class="sr-only" for="fil-${f.name}">${esc(f.label)}</label>
          <select id="fil-${f.name}" name="${f.name}"><option value="">${esc(f.label)}: Todos</option>${f.opcoes.map((o) => `<option value="${esc(o.valor)}">${esc(o.rotulo)}</option>`).join("")}</select></div>`).join("")}
      </form>
      ${podeCriar ? `<button type="button" class="btn btn-sm" data-novo>${icon("plus")} ${novo} ${esc(rotulo.singular)}</button>` : ""}
    </div>
    <p class="contagem" aria-live="polite"></p>
    <div class="card-list" data-lista></div>`;

  const form = raiz.querySelector("form.filtros");
  const lista = raiz.querySelector("[data-lista]");
  const contagem = raiz.querySelector(".contagem");

  async function carregar() {
    lista.innerHTML = carregando();
    const query = {};
    new FormData(form).forEach((v, k) => { if (v) query[k] = v; });
    try {
      itens = await api.get(endpoint, query);
    } catch (e) {
      lista.innerHTML = erroBloco(e.message);
      contagem.textContent = "";
      return;
    }
    contagem.textContent = itens.length ? `${itens.length} resultado${itens.length > 1 ? "s" : ""}` : "";
    lista.innerHTML = itens.length ? itens.map(desenharCard).join("") : vazio(`Nenhum${rotulo.genero === "a" ? "a" : ""} ${rotulo.singular.toLowerCase()} encontrad${artigo}.`);
  }

  function desenharCard(item) {
    const c = cfg.card(item);
    const excluir = cfg.podeExcluir ? cfg.podeExcluir(item) : false;
    return `<article class="consulta-card" data-id="${esc(item.id)}">
      <div class="consulta-top"><h3 class="consulta-especialidade">${esc(c.titulo)}</h3>${c.selo ? `<span class="consulta-status">${esc(c.selo)}</span>` : ""}</div>
      ${c.subtitulo ? `<div class="consulta-data">${esc(c.subtitulo)}</div>` : ""}
      ${(c.linhas || []).map((l) => `<div class="consulta-linha">${esc(l)}</div>`).join("")}
      <div class="card-acoes">
        ${podeEditar ? `<button type="button" class="btn btn-sm btn-outline" data-editar>${icon("edit")} Editar</button>` : ""}
        ${cfg.acoesExtras ? cfg.acoesExtras(item) : ""}
        ${excluir ? `<button type="button" class="btn btn-sm btn-danger-outline" data-excluir>${icon("trash")} Excluir</button>` : ""}
      </div></article>`;
  }

  async function abrir(item) {
    const camposResolvidos = await resolverOpcoes(cfg.campos);
    const campos = camposResolvidos.map((c) => ({
      ...c,
      desabilitado: c.desabilitado || (item && c.somenteCriacao),
      obrigatorio: item && c.obrigatorioSoCriacao ? false : c.obrigatorio,
      ajuda: item && c.ajudaEdicao ? c.ajudaEdicao : c.ajuda,
    }));
    const valores = item ? (cfg.valoresIniciais ? cfg.valoresIniciais(item) : item) : cfg.valoresNovo || {};
    const ok = await abrirFormulario({
      titulo: item ? `Editar ${rotulo.singular}` : `${novo} ${rotulo.singular}`,
      campos,
      valores,
      onSubmit: async (v) => {
        // campos desabilitados não vêm no FormData: completa com o valor atual
        campos.filter((c) => c.desabilitado && item).forEach((c) => (v[c.name] = item[c.name]));
        const payload = cfg.paraPayload ? cfg.paraPayload(v, item) : v;
        if (item) await api.put(`${endpoint}/${item.id}`, payload);
        else await api.post(endpoint, payload);
      },
    });
    if (ok) {
      toast(item ? `${rotulo.singular} atualizad${artigo} com sucesso!` : `${rotulo.singular} cadastrad${artigo} com sucesso!`, "ok");
      carregar();
    }
  }

  async function excluir(item) {
    const c = cfg.card(item);
    const sim = await confirmar({
      titulo: `Excluir ${rotulo.singular}`,
      mensagem: cfg.textoExcluir ? cfg.textoExcluir(item) : `Tem certeza que deseja excluir "${c.titulo}"? Essa ação não pode ser desfeita.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!sim) return;
    try {
      await api.del(`${endpoint}/${item.id}`);
      toast(`${rotulo.singular} excluíd${artigo}.`, "ok");
      carregar();
    } catch (e) {
      toast(e.message, "erro");
    }
  }

  raiz.querySelector("[data-novo]")?.addEventListener("click", () => abrir(null));
  lista.addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (!card) return;
    const item = itens.find((i) => String(i.id) === card.dataset.id);
    if (!item) return;
    if (e.target.closest("[data-editar]")) abrir(item);
    if (e.target.closest("[data-excluir]")) excluir(item);
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); carregar(); });
  form.querySelector('input[type="search"]').addEventListener("input", debounce(carregar, 300));
  form.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", carregar));

  await carregar();
  return { recarregar: carregar };
}
