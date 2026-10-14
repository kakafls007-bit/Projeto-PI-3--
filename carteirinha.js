import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { toast } from "../ui.js";

const user = await iniciarPagina();
try {
  const [p, planos] = await Promise.all([api.get(`/pacientes/${user.id}`), api.get("/planos")]);
  document.getElementById("cart-nome").textContent = p.nome;
  document.getElementById("cart-plano").textContent = (planos.find((x) => x.id === p.plano) || {}).nome || "Sem Plano";
  document.getElementById("cart-num").textContent = ("0000" + p.cpf.slice(-9)).replace(/(\d{4})(\d{4})(\d{5})/, "$1 $2 $3");
} catch (e) {
  toast(e.message, "erro");
}
