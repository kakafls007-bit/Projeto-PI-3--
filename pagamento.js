import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { comCarga, erroBloco, toast, vazio } from "../ui.js";
import { brl, esc, fmtData } from "../utils.js";

await iniciarPagina();
const $ = (id) => document.getElementById(id);
let fatura = { plano: null };

function qrSimulado() {
  let x = 7, r = "";
  for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const canto = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
    if (canto ? i % 6 === 0 || j % 6 === 0 || ((i % 6) > 1 && (i % 6) < 5 && (j % 6) > 1 && (j % 6) < 5) : x % 3 === 0) r += `<rect x="${j}" y="${i}" width="1" height="1"/>`;
  }
  return `<svg viewBox="0 0 21 21" width="160" height="160" role="img" aria-label="QR Code Pix (simulado)">${r}</svg>`;
}
$("pix-box").innerHTML = `${qrSimulado()}<p class="aviso">QR Code ilustrativo. A cobrança real virá do back-end.</p><code>00020126CAISMED-PIX-SIMULADO</code>`;
const atualizarPix = () => ($("pix-box").style.display = $("metodo").value === "Pix" ? "block" : "none");
$("metodo").addEventListener("change", atualizarPix);
atualizarPix();

async function carregar() {
  try {
    fatura = await api.get("/faturas/atual");
    const row = (r, v) => `<div class="summary-row"><span class="label">${r}</span><span class="value">${v}</span></div>`;
    $("fatura").innerHTML = fatura.plano
      ? row("Plano", esc(fatura.plano.nome)) + row("Valor", brl(fatura.valor)) + row("Vencimento", fmtData(fatura.vencimento)) +
        row("Status", `<span class="consulta-status ${fatura.pago ? "realizada" : "pendente"}">${fatura.pago ? "Pago" : "Pendente"}</span>`)
      : vazio("Você ainda não tem plano. Procure a recepção da clínica ou escolha um plano em Editar Dados.");
    const hist = await api.get("/pagamentos");
    $("historico-pag").innerHTML = hist.length
      ? hist.map((h) => `<div class="consulta-card"><div class="consulta-top"><span class="consulta-especialidade">${esc(h.plano)}</span><span class="consulta-status realizada">Pago</span></div><div class="consulta-data">${esc(fmtData(h.data))} · ${esc(brl(h.valor))} · ${esc(h.metodo)}</div></div>`).join("")
      : vazio("Nenhum pagamento realizado.");
  } catch (e) {
    $("fatura").innerHTML = erroBloco(e.message);
  }
}

$("btn-pagar").addEventListener("click", async (e) => {
  if (!fatura.plano) return toast("Nenhum plano contratado.", "erro");
  if (fatura.pago) return toast("A fatura deste mês já está paga.", "info");
  try {
    await comCarga(e.currentTarget, () => api.post("/faturas/pagar", { metodo: $("metodo").value }));
    toast("Pagamento confirmado! Obrigado.", "ok");
    carregar();
  } catch (err) {
    toast(err.message, "erro");
  }
});
carregar();
