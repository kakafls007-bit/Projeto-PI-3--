import { api } from "../api.js";
import { iniciarPagina } from "../layout.js";
import { atualizarUsuario, limparSessao } from "../session.js";
import { ativarMascaras, comCarga, confirmar, toast } from "../ui.js";
import { esc, fmtTel } from "../utils.js";

const user = await iniciarPagina();
const $ = (id) => document.getElementById(id);
ativarMascaras();
let atual;
try {
  const [p, planos] = await Promise.all([api.get(`/pacientes/${user.id}`), api.get("/planos")]);
  atual = p;
  $("plano").innerHTML = '<option value="">Sem plano</option>' + planos.map((x) => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join("");
  ["nome", "cpf", "nascimento", "email", "cidade", "plano"].forEach((k) => ($(k).value = p[k] || ""));
  $("telefone").value = fmtTel(p.telefone);
} catch (e) {
  toast(e.message, "erro");
}

$("perfil-editar-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("erro");
  erro.hidden = true;
  const v = Object.fromEntries(new FormData(e.target));
  try {
    const salvo = await comCarga(e.target.querySelector('button[type="submit"]'), () => api.put(`/pacientes/${user.id}`, { ...atual, ...v, cpf: atual.cpf }));
    atualizarUsuario({ nome: salvo.nome });
    location.href = "perfil.html";
  } catch (err) {
    erro.textContent = err.message;
    erro.hidden = false;
  }
});

$("btn-excluir").addEventListener("click", async () => {
  const sim = await confirmar({ titulo: "Excluir Conta", mensagem: "Tem certeza que deseja excluir seu cadastro? Suas consultas futuras serão canceladas e essa ação não pode ser desfeita.", confirmar: "Excluir Conta", perigo: true });
  if (!sim) return;
  try {
    await api.del(`/pacientes/${user.id}`);
    limparSessao();
    location.href = "index.html";
  } catch (err) {
    toast(err.message, "erro");
  }
});
