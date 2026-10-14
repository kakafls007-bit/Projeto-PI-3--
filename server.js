// Servidor simulado: faz o papel do back-end enquanto a outra equipe não entrega a API real.
// Ele roda no navegador, guarda os dados no localStorage ("banco") e segue o MESMO contrato REST
// descrito no README (rotas, perfis de acesso, códigos HTTP e validações).
// Quando o back-end real existir, é só preencher API_BASE_URL em js/config.js e apagar a pasta js/mock.
import { addDays, cpfValido, deMinutos, diaSemana, isoDate, minutos, onlyDigits } from "../utils.js";
import { hashSenha } from "./hash.js";
import { seed } from "./seed.js";

const DB_KEY = "caismed.db.v2";
const FORMAS_PAGAMENTO = ["Pix", "Cartão de Crédito", "Boleto"];
export const PLANOS = [
  { id: "essencial", nome: "Plano Essencial", valor: 89.9, descricao: "Consultas básicas e telemedicina" },
  { id: "conforto", nome: "Plano Conforto", valor: 149.9, descricao: "Essencial + exames simples e especialistas" },
  { id: "premium", nome: "Plano Premium", valor: 249.9, descricao: "Conforto + exames de imagem e check-up anual" },
  { id: "familia", nome: "Plano Família", valor: 399.9, descricao: "Cobertura Premium para até 4 pessoas" },
];

class HttpError extends Error {
  constructor(status, message, detalhes) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}
const erro = (status, message, detalhes) => {
  throw new HttpError(status, message, detalhes);
};

// ---------- "Banco de dados" ----------
function carregar() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* banco corrompido: recria abaixo */
  }
  const db = seed();
  salvar(db);
  return db;
}
const salvar = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const contem = (txt, busca) => norm(txt).includes(norm(busca));
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// ---------- Autenticação (token simulado; o real seria um JWT) ----------
const emitirToken = (sub, perfil) => btoa(JSON.stringify({ sub, perfil, exp: Date.now() + 8 * 3600 * 1000 })) + ".mock";
function usuarioDoToken(db, token) {
  if (!token) return null;
  try {
    const p = JSON.parse(atob(token.replace(/\.mock$/, "")));
    if (p.exp < Date.now()) return null;
    const colecao = { paciente: db.pacientes, profissional: db.profissionais, administrador: db.administradores }[p.perfil];
    const u = colecao && colecao.find((x) => x.id === p.sub);
    return u ? { ...u, perfil: p.perfil } : null;
  } catch {
    return null;
  }
}

// ---------- Validações ----------
function obrigatorios(body, campos) {
  for (const [campo, rotulo] of campos) {
    const v = body[campo];
    if (v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) {
      erro(400, `Preencha o campo "${rotulo}".`);
    }
  }
}
const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ""));
const dataValida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) && !Number.isNaN(Date.parse(d));
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ""));
const quando = (data, horario) => new Date(`${data}T${horario}:00`);

// ---------- Formatação das respostas (nunca devolver hash de senha) ----------
const pubPaciente = ({ senhaHash, ...p }) => ({ ...p, temSenha: !!senhaHash });
function pubProfissional(db, p, mostrarLogin) {
  const esp = db.especialidades.find((e) => e.id === p.especialidadeId);
  return {
    id: p.id,
    nome: p.nome,
    registro: p.registro,
    especialidadeId: p.especialidadeId,
    especialidadeNome: esp ? esp.nome : "—",
    clinicaIds: p.clinicaIds,
    clinicas: p.clinicaIds.map((id) => db.clinicas.find((c) => c.id === id)).filter(Boolean).map((c) => ({ id: c.id, nome: c.nome })),
    ativo: p.ativo,
    ...(mostrarLogin ? { matricula: p.matricula } : {}),
  };
}
function enriquecer(db, a) {
  const prof = db.profissionais.find((p) => p.id === a.profissionalId);
  const cli = db.clinicas.find((c) => c.id === a.clinicaId);
  const esp = db.especialidades.find((e) => e.id === a.especialidadeId);
  const pac = db.pacientes.find((p) => p.id === a.pacienteId);
  return {
    ...a,
    profissionalNome: prof ? prof.nome : "Profissional removido",
    profissionalRegistro: prof ? prof.registro : "",
    clinicaNome: cli ? cli.nome : "Clínica removida",
    clinicaEndereco: cli ? `${cli.endereco} - ${cli.bairro}, ${cli.cidade}` : "",
    clinicaTelefone: cli ? cli.telefone : "",
    especialidadeNome: esp ? esp.nome : "—",
    pacienteNome: pac ? pac.nome : "Paciente removido",
    pacienteTelefone: pac ? pac.telefone : "",
    triagem: a.triagemId ? db.triagens.find((t) => t.id === a.triagemId) || null : null,
  };
}

// ---------- Agenda: horários livres ----------
function horariosLivres(db, profissionalId, data, clinicaId) {
  const hoje = isoDate();
  if (data < hoje) return [];
  const ocupados = new Set(
    db.agendamentos.filter((a) => a.profissionalId === profissionalId && a.data === data && a.status === "agendado").map((a) => a.horario)
  );
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const dia = diaSemana(data);
  const saida = [];
  db.disponibilidades
    .filter((d) => d.profissionalId === profissionalId && d.diaSemana === dia && (!clinicaId || d.clinicaId === clinicaId))
    .forEach((d) => {
      for (let m = minutos(d.inicio); m + d.duracao <= minutos(d.fim); m += d.duracao) {
        const h = deMinutos(m);
        if (data === hoje && m <= agoraMin) continue;
        if (!ocupados.has(h)) saida.push({ horario: h, clinicaId: d.clinicaId });
      }
    });
  return saida.sort((a, b) => a.horario.localeCompare(b.horario));
}

function sugerirEspecialidade(db, r) {
  const t = norm(r.motivo);
  const s = r.sintomas || [];
  let id = "clinico_geral";
  if (/crianc|filh|bebe/.test(t)) id = "pediatria";
  else if (/pele|mancha|alergia|coceira/.test(t)) id = "dermatologia";
  else if (s.includes("falta_ar") || /peito|coracao/.test(t)) id = "cardiologia";
  return db.especialidades.find((e) => e.id === id) || db.especialidades[0];
}

const futuroAberto = (a) => a.status === "agendado" && quando(a.data, a.horario) >= new Date();

// ---------- Rotas ----------
const rotas = [];
// perfis: null = pública | ["*"] = qualquer usuário logado | lista de perfis permitidos
function rota(metodo, padrao, perfis, fn, status = 200) {
  const re = new RegExp("^" + padrao.replace(/:([a-zA-Z]+)/g, "(?<$1>[^/]+)") + "$");
  rotas.push({ metodo, re, perfis, fn, status });
}
const STAFF = ["profissional", "administrador"];

// Autenticação
rota("POST", "/auth/login", null, ({ db, body }) => {
  const cpf = onlyDigits(body.cpf);
  const pac = db.pacientes.find((p) => p.cpf === cpf);
  if (!pac) erro(404, "CPF não encontrado. Procure a recepção da clínica para fazer seu cadastro.");
  if (!pac.senhaHash) erro(403, "Você ainda não criou sua senha. Toque em Primeiro Acesso.");
  if (pac.senhaHash !== hashSenha(body.senha)) erro(401, "CPF ou senha incorretos.");
  return { token: emitirToken(pac.id, "paciente"), usuario: { id: pac.id, nome: pac.nome, perfil: "paciente" } };
});
rota("POST", "/auth/staff/login", null, ({ db, body }) => {
  const mat = String(body.matricula || "").trim();
  const prof = db.profissionais.find((p) => p.matricula === mat && p.ativo);
  const adm = db.administradores.find((a) => a.matricula === mat);
  const u = prof || adm;
  if (!u || u.senhaHash !== hashSenha(body.senha)) erro(401, "Matrícula ou senha incorretas.");
  const perfil = prof ? "profissional" : "administrador";
  return { token: emitirToken(u.id, perfil), usuario: { id: u.id, nome: u.nome, perfil } };
});
rota("POST", "/auth/primeiro-acesso", null, ({ db, body }) => {
  const pac = db.pacientes.find((p) => p.cpf === onlyDigits(body.cpf));
  if (!pac) erro(404, "CPF não encontrado. Procure a recepção da clínica para fazer seu cadastro.");
  if (pac.senhaHash) erro(409, "Este CPF já tem senha. Volte e faça o login.");
  if (String(body.senha || "").length < 6) erro(400, "A senha precisa ter pelo menos 6 caracteres.");
  pac.senhaHash = hashSenha(body.senha);
  return { ok: true };
});
rota("POST", "/auth/recuperar-senha", null, () => ({ ok: true, message: "Se o CPF estiver cadastrado, enviaremos as instruções." }));
rota("GET", "/auth/me", ["*"], ({ user }) => {
  const { senhaHash, ...u } = user;
  return u;
});

// Planos
rota("GET", "/planos", null, () => PLANOS);

// Especialidades
rota("GET", "/especialidades", ["*"], ({ db, query }) =>
  db.especialidades.filter((e) => !query.busca || contem(e.nome, query.busca)).sort((a, b) => a.nome.localeCompare(b.nome))
);
rota("POST", "/especialidades", ["administrador"], ({ db, body }) => {
  obrigatorios(body, [["nome", "Nome"]]);
  if (db.especialidades.some((e) => norm(e.nome) === norm(body.nome))) erro(409, "Já existe uma especialidade com este nome.");
  let id = slug(body.nome);
  if (db.especialidades.some((e) => e.id === id)) id = uid("esp");
  const nova = { id, nome: body.nome.trim() };
  db.especialidades.push(nova);
  return nova;
}, 201);
rota("PUT", "/especialidades/:id", ["administrador"], ({ db, params, body }) => {
  const esp = db.especialidades.find((e) => e.id === params.id) || erro(404, "Especialidade não encontrada.");
  obrigatorios(body, [["nome", "Nome"]]);
  if (db.especialidades.some((e) => e.id !== esp.id && norm(e.nome) === norm(body.nome))) erro(409, "Já existe uma especialidade com este nome.");
  esp.nome = body.nome.trim();
  return esp;
});
rota("DELETE", "/especialidades/:id", ["administrador"], ({ db, params }) => {
  if (!db.especialidades.some((e) => e.id === params.id)) erro(404, "Especialidade não encontrada.");
  if (db.profissionais.some((p) => p.especialidadeId === params.id)) erro(409, "Existem profissionais nesta especialidade. Altere-os antes de excluir.");
  db.especialidades = db.especialidades.filter((e) => e.id !== params.id);
});

// Clínicas
rota("GET", "/clinicas", ["*"], ({ db, query }) =>
  db.clinicas
    .filter((c) => !query.busca || [c.nome, c.cidade, c.bairro, c.endereco].some((t) => contem(t, query.busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome))
);
rota("GET", "/clinicas/:id", ["*"], ({ db, params }) => db.clinicas.find((c) => c.id === params.id) || erro(404, "Clínica não encontrada."));
function validarClinica(db, body, atualId) {
  obrigatorios(body, [["nome", "Nome"], ["cidade", "Cidade"], ["bairro", "Bairro"], ["endereco", "Endereço"]]);
  if (db.clinicas.some((c) => c.id !== atualId && norm(c.nome) === norm(body.nome))) erro(409, "Já existe uma clínica com este nome.");
  return {
    nome: body.nome.trim(), cidade: body.cidade.trim(), bairro: body.bairro.trim(),
    endereco: body.endereco.trim(), telefone: String(body.telefone || "").trim(),
  };
}
rota("POST", "/clinicas", ["administrador"], ({ db, body }) => {
  const c = { id: uid("cl"), ...validarClinica(db, body) };
  db.clinicas.push(c);
  return c;
}, 201);
rota("PUT", "/clinicas/:id", ["administrador"], ({ db, params, body }) => {
  const c = db.clinicas.find((x) => x.id === params.id) || erro(404, "Clínica não encontrada.");
  Object.assign(c, validarClinica(db, body, c.id));
  return c;
});
rota("DELETE", "/clinicas/:id", ["administrador"], ({ db, params }) => {
  if (!db.clinicas.some((c) => c.id === params.id)) erro(404, "Clínica não encontrada.");
  if (db.profissionais.some((p) => p.clinicaIds.includes(params.id))) erro(409, "Há profissionais associados a esta clínica. Remova a associação antes de excluir.");
  if (db.agendamentos.some((a) => a.clinicaId === params.id && futuroAberto(a))) erro(409, "Há consultas futuras agendadas nesta clínica.");
  db.clinicas = db.clinicas.filter((c) => c.id !== params.id);
  db.disponibilidades = db.disponibilidades.filter((d) => d.clinicaId !== params.id);
});

// Profissionais de saúde
rota("GET", "/profissionais", ["*"], ({ db, user, query }) =>
  db.profissionais
    .filter((p) => user.perfil === "administrador" || p.ativo)
    .filter((p) => !query.busca || contem(p.nome, query.busca) || contem(p.registro, query.busca))
    .filter((p) => !query.clinicaId || p.clinicaIds.includes(query.clinicaId))
    .filter((p) => !query.especialidadeId || p.especialidadeId === query.especialidadeId)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => pubProfissional(db, p, user.perfil === "administrador"))
);
rota("GET", "/profissionais/:id", ["*"], ({ db, user, params }) => {
  const p = db.profissionais.find((x) => x.id === params.id) || erro(404, "Profissional não encontrado.");
  return pubProfissional(db, p, user.perfil === "administrador");
});
function validarProfissional(db, body, atual) {
  obrigatorios(body, [["nome", "Nome"], ["registro", "Registro Profissional"], ["especialidadeId", "Especialidade"], ["clinicaIds", "Clínicas"], ["matricula", "Matrícula"]]);
  if (!db.especialidades.some((e) => e.id === body.especialidadeId)) erro(400, "Especialidade inválida.");
  if (!Array.isArray(body.clinicaIds) || body.clinicaIds.some((id) => !db.clinicas.some((c) => c.id === id))) erro(400, "Clínica inválida.");
  const mat = String(body.matricula).trim();
  const dono = [...db.profissionais, ...db.administradores].find((u) => u.matricula === mat);
  if (dono && (!atual || dono.id !== atual.id)) erro(409, "Esta matrícula já está em uso.");
  if (!atual && String(body.senha || "").length < 6) erro(400, "A senha precisa ter pelo menos 6 caracteres.");
  if (atual && body.senha && String(body.senha).length < 6) erro(400, "A senha precisa ter pelo menos 6 caracteres.");
  return {
    nome: body.nome.trim(), registro: body.registro.trim(), especialidadeId: body.especialidadeId,
    clinicaIds: [...new Set(body.clinicaIds)], matricula: mat, ativo: body.ativo !== false,
  };
}
rota("POST", "/profissionais", ["administrador"], ({ db, body }) => {
  const dados = validarProfissional(db, body);
  const p = { id: uid("p"), ...dados, senhaHash: hashSenha(body.senha) };
  db.profissionais.push(p);
  return pubProfissional(db, p, true);
}, 201);
rota("PUT", "/profissionais/:id", ["administrador"], ({ db, params, body }) => {
  const p = db.profissionais.find((x) => x.id === params.id) || erro(404, "Profissional não encontrado.");
  const dados = validarProfissional(db, body, p);
  const removidas = p.clinicaIds.filter((id) => !dados.clinicaIds.includes(id));
  if (db.agendamentos.some((a) => a.profissionalId === p.id && removidas.includes(a.clinicaId) && futuroAberto(a))) {
    erro(409, "Há consultas futuras deste profissional em uma clínica que você está removendo.");
  }
  db.disponibilidades = db.disponibilidades.filter((d) => !(d.profissionalId === p.id && removidas.includes(d.clinicaId)));
  Object.assign(p, dados);
  if (body.senha) p.senhaHash = hashSenha(body.senha);
  return pubProfissional(db, p, true);
});
rota("DELETE", "/profissionais/:id", ["administrador"], ({ db, params }) => {
  if (!db.profissionais.some((p) => p.id === params.id)) erro(404, "Profissional não encontrado.");
  if (db.agendamentos.some((a) => a.profissionalId === params.id && futuroAberto(a))) erro(409, "Há consultas futuras agendadas com este profissional. Cancele-as antes de excluir.");
  db.profissionais = db.profissionais.filter((p) => p.id !== params.id);
  db.disponibilidades = db.disponibilidades.filter((d) => d.profissionalId !== params.id);
});

// Disponibilidade dos profissionais
function podeGerirAgenda(user, profissionalId) {
  if (user.perfil === "administrador") return true;
  if (user.perfil === "profissional" && user.id === profissionalId) return true;
  erro(403, "Você só pode gerenciar a sua própria disponibilidade.");
}
rota("GET", "/profissionais/:id/disponibilidades", ["*"], ({ db, params }) => {
  if (!db.profissionais.some((p) => p.id === params.id)) erro(404, "Profissional não encontrado.");
  return db.disponibilidades
    .filter((d) => d.profissionalId === params.id)
    .map((d) => ({ ...d, clinicaNome: (db.clinicas.find((c) => c.id === d.clinicaId) || {}).nome || "—" }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio));
});
rota("POST", "/profissionais/:id/disponibilidades", STAFF, ({ db, user, params, body }) => {
  podeGerirAgenda(user, params.id);
  const prof = db.profissionais.find((p) => p.id === params.id) || erro(404, "Profissional não encontrado.");
  obrigatorios(body, [["clinicaId", "Clínica"], ["inicio", "Início"], ["fim", "Fim"]]);
  const dia = Number(body.diaSemana);
  const duracao = Number(body.duracao || 30);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) erro(400, "Dia da semana inválido.");
  if (!prof.clinicaIds.includes(body.clinicaId)) erro(400, "O profissional não está associado a esta clínica.");
  if (!horaValida(body.inicio) || !horaValida(body.fim)) erro(400, "Informe horários válidos (HH:MM).");
  if (![15, 20, 30, 40, 45, 60].includes(duracao)) erro(400, "Duração da consulta inválida.");
  const ini = minutos(body.inicio), fim = minutos(body.fim);
  if (fim - ini < duracao) erro(400, "O horário final precisa ser depois do inicial e caber pelo menos uma consulta.");
  const choque = db.disponibilidades.find((d) => d.profissionalId === prof.id && d.diaSemana === dia && ini < minutos(d.fim) && fim > minutos(d.inicio));
  if (choque) erro(409, `Este período se sobrepõe a outro já cadastrado (${choque.inicio} às ${choque.fim}).`);
  const nova = { id: uid("d"), profissionalId: prof.id, clinicaId: body.clinicaId, diaSemana: dia, inicio: body.inicio, fim: body.fim, duracao };
  db.disponibilidades.push(nova);
  return nova;
}, 201);
rota("DELETE", "/disponibilidades/:id", STAFF, ({ db, user, params }) => {
  const d = db.disponibilidades.find((x) => x.id === params.id) || erro(404, "Disponibilidade não encontrada.");
  podeGerirAgenda(user, d.profissionalId);
  db.disponibilidades = db.disponibilidades.filter((x) => x.id !== d.id);
});
rota("GET", "/profissionais/:id/horarios", ["*"], ({ db, params, query }) => {
  if (!db.profissionais.some((p) => p.id === params.id)) erro(404, "Profissional não encontrado.");
  if (!dataValida(query.data)) erro(400, "Informe a data no formato AAAA-MM-DD.");
  return horariosLivres(db, params.id, query.data, query.clinicaId);
});
rota("GET", "/profissionais/:id/proximas-datas", ["*"], ({ db, params, query }) => {
  if (!db.profissionais.some((p) => p.id === params.id)) erro(404, "Profissional não encontrado.");
  const limite = Math.min(Number(query.limite) || 6, 12);
  const datas = [];
  for (let i = 0; i < 90 && datas.length < limite; i++) {
    const d = addDays(isoDate(), i);
    if (horariosLivres(db, params.id, d, query.clinicaId).length) datas.push(d);
  }
  return datas;
});

// Pacientes
function validarPaciente(db, body, atual, ehProprio) {
  obrigatorios(body, [["nome", "Nome Completo"], ["telefone", "Telefone"], ["email", "E-mail"], ["cidade", "Cidade"]]);
  if (!emailValido(body.email)) erro(400, "Informe um e-mail válido.");
  const cpf = ehProprio ? atual.cpf : onlyDigits(body.cpf);
  if (!cpfValido(cpf)) erro(400, "CPF inválido. Confira os 11 números.");
  if (db.pacientes.some((p) => p.cpf === cpf && (!atual || p.id !== atual.id))) erro(409, "Já existe um cliente cadastrado com este CPF.");
  if (!atual) obrigatorios(body, [["nascimento", "Data de Nascimento"]]);
  if (body.plano && !PLANOS.some((p) => p.id === body.plano)) erro(400, "Plano inválido.");
  if (body.pagamento && !FORMAS_PAGAMENTO.includes(body.pagamento)) erro(400, "Forma de pagamento inválida.");
  return {
    nome: body.nome.trim(), cpf, nascimento: body.nascimento || (atual && atual.nascimento) || "",
    telefone: body.telefone.trim(), email: body.email.trim(), cidade: body.cidade.trim(),
    plano: body.plano || "", pagamento: body.pagamento || "Pix",
  };
}
function acessoPaciente(user, id) {
  if (STAFF.includes(user.perfil) || user.id === id) return;
  erro(403, "Você não tem permissão para acessar este cadastro.");
}
rota("GET", "/pacientes", STAFF, ({ db, query }) =>
  db.pacientes
    .filter((p) => !query.busca || contem(p.nome, query.busca) || (onlyDigits(query.busca) && p.cpf.includes(onlyDigits(query.busca))))
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(pubPaciente)
);
rota("POST", "/pacientes", STAFF, ({ db, body }) => {
  const p = { id: uid("pac"), ...validarPaciente(db, body), senhaHash: "", criadoEm: new Date().toISOString() };
  db.pacientes.push(p);
  return pubPaciente(p);
}, 201);
rota("GET", "/pacientes/:id", ["*"], ({ db, user, params }) => {
  acessoPaciente(user, params.id);
  return pubPaciente(db.pacientes.find((p) => p.id === params.id) || erro(404, "Paciente não encontrado."));
});
rota("PUT", "/pacientes/:id", ["*"], ({ db, user, params, body }) => {
  acessoPaciente(user, params.id);
  const p = db.pacientes.find((x) => x.id === params.id) || erro(404, "Paciente não encontrado.");
  Object.assign(p, validarPaciente(db, body, p, user.perfil === "paciente"));
  return pubPaciente(p);
});
rota("DELETE", "/pacientes/:id", ["paciente", "administrador"], ({ db, user, params }) => {
  acessoPaciente(user, params.id);
  if (!db.pacientes.some((p) => p.id === params.id)) erro(404, "Paciente não encontrado.");
  db.agendamentos.forEach((a) => {
    if (a.pacienteId === params.id && a.status === "agendado") Object.assign(a, { status: "cancelado", canceladoEm: new Date().toISOString(), canceladoPor: "sistema" });
  });
  db.pacientes = db.pacientes.filter((p) => p.id !== params.id);
});

// Agendamentos
function escopoAgendamento(user, a) {
  if (user.perfil === "administrador") return;
  if (user.perfil === "paciente" && a.pacienteId === user.id) return;
  if (user.perfil === "profissional" && a.profissionalId === user.id) return;
  erro(403, "Você não tem permissão para acessar este agendamento.");
}
rota("GET", "/agendamentos", ["*"], ({ db, user, query }) =>
  db.agendamentos
    .filter((a) => (user.perfil === "paciente" ? a.pacienteId === user.id : user.perfil === "profissional" ? a.profissionalId === user.id : true))
    .filter((a) => !query.status || a.status === query.status)
    .filter((a) => !query.de || a.data >= query.de)
    .filter((a) => !query.ate || a.data <= query.ate)
    .filter((a) => !query.clinicaId || a.clinicaId === query.clinicaId)
    .filter((a) => !query.profissionalId || a.profissionalId === query.profissionalId)
    .map((a) => enriquecer(db, a))
    .filter((a) => !query.busca || [a.pacienteNome, a.profissionalNome, a.clinicaNome, a.protocolo].some((t) => contem(t, query.busca)))
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))
);
rota("GET", "/agendamentos/:id", ["*"], ({ db, user, params }) => {
  const a = db.agendamentos.find((x) => x.id === params.id) || erro(404, "Agendamento não encontrado.");
  escopoAgendamento(user, a);
  return enriquecer(db, a);
});
rota("POST", "/agendamentos", ["paciente", "administrador"], ({ db, user, body }) => {
  obrigatorios(body, [["clinicaId", "Clínica"], ["profissionalId", "Profissional"], ["data", "Data"], ["horario", "Horário"]]);
  const pacienteId = user.perfil === "paciente" ? user.id : body.pacienteId;
  if (!db.pacientes.some((p) => p.id === pacienteId)) erro(400, "Paciente inválido.");
  const prof = db.profissionais.find((p) => p.id === body.profissionalId && p.ativo) || erro(404, "Profissional não encontrado.");
  if (!db.clinicas.some((c) => c.id === body.clinicaId)) erro(404, "Clínica não encontrada.");
  if (!prof.clinicaIds.includes(body.clinicaId)) erro(400, "O profissional não atende nesta clínica.");
  if (!dataValida(body.data) || !horaValida(body.horario)) erro(400, "Data ou horário inválido.");
  if (quando(body.data, body.horario) <= new Date()) erro(400, "Escolha uma data e um horário futuros.");
  if (body.data > addDays(isoDate(), 180)) erro(400, "O agendamento só pode ser feito com até 180 dias de antecedência.");
  const livres = horariosLivres(db, prof.id, body.data, body.clinicaId);
  if (!livres.some((h) => h.horario === body.horario)) erro(409, "Este horário não está mais disponível. Escolha outro.");
  if (db.agendamentos.some((a) => a.pacienteId === pacienteId && a.status === "agendado" && a.data === body.data && a.horario === body.horario)) {
    erro(409, "Você já tem uma consulta marcada neste mesmo dia e horário.");
  }
  const nova = {
    id: uid("ag"), protocolo: "CM" + String(Date.now()).slice(-7), pacienteId, profissionalId: prof.id, clinicaId: body.clinicaId,
    especialidadeId: prof.especialidadeId, data: body.data, horario: body.horario, status: "agendado",
    triagemId: body.triagemId || "", criadoEm: new Date().toISOString(),
  };
  db.agendamentos.push(nova);
  return enriquecer(db, nova);
}, 201);
rota("PATCH", "/agendamentos/:id/cancelar", ["*"], ({ db, user, params, body }) => {
  const a = db.agendamentos.find((x) => x.id === params.id) || erro(404, "Agendamento não encontrado.");
  escopoAgendamento(user, a);
  if (a.status !== "agendado") erro(409, "Este agendamento não pode mais ser cancelado.");
  if (user.perfil === "paciente" && quando(a.data, a.horario) <= new Date()) erro(400, "Não é possível cancelar uma consulta que já passou.");
  Object.assign(a, { status: "cancelado", canceladoEm: new Date().toISOString(), canceladoPor: user.perfil, motivoCancelamento: String(body.motivo || "").trim() });
  return enriquecer(db, a);
});
rota("PATCH", "/agendamentos/:id/concluir", ["profissional", "administrador"], ({ db, user, params, body }) => {
  const a = db.agendamentos.find((x) => x.id === params.id) || erro(404, "Agendamento não encontrado.");
  escopoAgendamento(user, a);
  if (a.status !== "agendado") erro(409, "Este atendimento já foi encerrado.");
  if (a.data > isoDate()) erro(400, "Só é possível concluir consultas de hoje ou de dias anteriores.");
  Object.assign(a, { status: "concluido", concluidoEm: new Date().toISOString(), observacoes: String(body.observacoes || "").trim() });
  return enriquecer(db, a);
});

// Triagem (o back-end real pode trocar a regra simples por IA de chatbot)
rota("POST", "/triagens", ["paciente"], ({ db, user, body }) => {
  obrigatorios(body, [["motivo", "Motivo"]]);
  const esp = sugerirEspecialidade(db, body);
  const t = {
    id: uid("tr"), pacienteId: user.id, motivo: String(body.motivo).trim(), sintomas: body.sintomas || [],
    urgencia: body.urgencia || "", observacoes: String(body.observacoes || "").trim(),
    especialidadeSugeridaId: esp.id, criadoEm: new Date().toISOString(),
  };
  db.triagens.push(t);
  return { id: t.id, especialidadeSugerida: esp };
}, 201);

// Financeiro do paciente
rota("GET", "/faturas/atual", ["paciente"], ({ db, user }) => {
  const plano = PLANOS.find((p) => p.id === (db.pacientes.find((x) => x.id === user.id) || {}).plano);
  if (!plano) return { plano: null };
  const mes = isoDate().slice(0, 7);
  return { plano, valor: plano.valor, vencimento: addDays(isoDate(), 7), pago: db.pagamentos.some((p) => p.pacienteId === user.id && p.mes === mes) };
});
rota("POST", "/faturas/pagar", ["paciente"], ({ db, user, body }) => {
  const pac = db.pacientes.find((x) => x.id === user.id);
  const plano = PLANOS.find((p) => p.id === pac.plano);
  if (!plano) erro(400, "Você ainda não tem plano contratado.");
  if (!FORMAS_PAGAMENTO.includes(body.metodo)) erro(400, "Forma de pagamento inválida.");
  const mes = isoDate().slice(0, 7);
  if (db.pagamentos.some((p) => p.pacienteId === user.id && p.mes === mes)) erro(409, "A fatura deste mês já está paga.");
  const pg = { id: uid("pg"), pacienteId: user.id, mes, plano: plano.nome, valor: plano.valor, metodo: body.metodo, data: isoDate() };
  db.pagamentos.push(pg);
  return pg;
}, 201);
rota("GET", "/pagamentos", ["paciente"], ({ db, user }) =>
  db.pagamentos.filter((p) => p.pacienteId === user.id).sort((a, b) => b.data.localeCompare(a.data))
);

// Resumos dos painéis
rota("GET", "/resumo", STAFF, ({ db, user }) => {
  const mes = isoDate().slice(0, 7);
  if (user.perfil === "administrador") {
    return {
      clinicas: db.clinicas.length, profissionais: db.profissionais.length, especialidades: db.especialidades.length,
      pacientes: db.pacientes.length, novosPacientesMes: db.pacientes.filter((p) => String(p.criadoEm).startsWith(mes)).length,
      agendados: db.agendamentos.filter((a) => a.status === "agendado").length,
      concluidos: db.agendamentos.filter((a) => a.status === "concluido").length,
      cancelados: db.agendamentos.filter((a) => a.status === "cancelado").length,
    };
  }
  const meus = db.agendamentos.filter((a) => a.profissionalId === user.id);
  const hoje = isoDate();
  return {
    hoje: meus.filter((a) => a.status === "agendado" && a.data === hoje).length,
    proximos: meus.filter((a) => a.status === "agendado" && a.data > hoje).length,
    concluidos: meus.filter((a) => a.status === "concluido").length,
    pacientes: db.pacientes.length,
  };
});

// ---------- Ponto de entrada do servidor simulado ----------
export function handle(method, url, body, token) {
  const u = new URL(url, "http://mock.local");
  const query = Object.fromEntries(u.searchParams);
  const db = carregar();
  try {
    const r = rotas.find((x) => x.metodo === method && x.re.test(u.pathname));
    if (!r) erro(404, "Rota não encontrada.");
    const user = usuarioDoToken(db, token);
    if (r.perfis) {
      if (!user) erro(401, "Faça login para continuar.");
      if (!r.perfis.includes("*") && !r.perfis.includes(user.perfil)) erro(403, "Você não tem permissão para esta ação.");
    }
    const params = (r.re.exec(u.pathname).groups) || {};
    const data = r.fn({ db, user, params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, decodeURIComponent(v)])), query, body: body || {} });
    salvar(db);
    return data === undefined ? { status: 204, data: null } : { status: r.status, data };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, data: { message: e.message, detalhes: e.detalhes } };
    console.error("[mock]", e);
    return { status: 500, data: { message: "Erro interno no servidor simulado." } };
  }
}
