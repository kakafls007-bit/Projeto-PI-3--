import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { toast } from "../ui.js";
import { fmtCpf, fmtData } from "../utils.js";

const user = await iniciarPagina();
try {
  const [p, planos] = await Promise.all([api.get(`/pacientes/${user.id}`), api.get("/planos")]);
  const set = (id, v) => (document.getElementById(id).textContent = v || "—");
  set("info-nome", p.nome); set("info-cpf", fmtCpf(p.cpf)); set("info-nascimento", p.nascimento && fmtData(p.nascimento));
  set("info-telefone", p.telefone); set("info-email", p.email); set("info-cidade", p.cidade);
  set("info-plano", (planos.find((x) => x.id === p.plano) || {}).nome);
} catch (e) {
  toast(e.message, "erro");
}
