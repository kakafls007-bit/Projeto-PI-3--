// Dados iniciais do servidor simulado (só existem enquanto não há back-end).
import { hashSenha } from "./hash.js";

const disp = (id, profissionalId, clinicaId, dias, inicio, fim) =>
  dias.map((diaSemana) => ({ id: `${id}-${diaSemana}`, profissionalId, clinicaId, diaSemana, inicio, fim, duracao: 30 }));

export function seed() {
  const agora = new Date().toISOString();
  return {
    especialidades: [
      { id: "clinico_geral", nome: "Clínico Geral" },
      { id: "pediatria", nome: "Pediatria" },
      { id: "cardiologia", nome: "Cardiologia" },
      { id: "dermatologia", nome: "Dermatologia" },
    ],
    clinicas: [
      { id: "cl1", nome: "CaisMed Olinda", cidade: "Olinda", bairro: "Carmo", endereco: "Rua do Amparo, 120", telefone: "(81) 3333-1001" },
      { id: "cl2", nome: "CaisMed Recife", cidade: "Recife", bairro: "Boa Viagem", endereco: "Av. Boa Viagem, 2500", telefone: "(81) 3333-2002" },
      { id: "cl3", nome: "CaisMed Jaboatão", cidade: "Jaboatão dos Guararapes", bairro: "Piedade", endereco: "Av. Bernardo Vieira de Melo, 800", telefone: "(81) 3333-3003" },
    ],
    profissionais: [
      { id: "p1", nome: "Dra. Helena Duarte", registro: "CRM-PE 12345", especialidadeId: "clinico_geral", clinicaIds: ["cl1", "cl2"], matricula: "1001", senhaHash: hashSenha("caismed123"), ativo: true },
      { id: "p2", nome: "Dr. Marcos Veloso", registro: "CRM-PE 23456", especialidadeId: "pediatria", clinicaIds: ["cl1", "cl3"], matricula: "1002", senhaHash: hashSenha("caismed123"), ativo: true },
      { id: "p3", nome: "Dra. Beatriz Nogueira", registro: "CRM-PE 34567", especialidadeId: "cardiologia", clinicaIds: ["cl2"], matricula: "1003", senhaHash: hashSenha("caismed123"), ativo: true },
      { id: "p4", nome: "Dr. Rafael Tavares", registro: "CRM-PE 45678", especialidadeId: "dermatologia", clinicaIds: ["cl1", "cl2"], matricula: "1004", senhaHash: hashSenha("caismed123"), ativo: true },
    ],
    administradores: [{ id: "adm1", nome: "Administrador CaisMed", matricula: "9001", senhaHash: hashSenha("admin123") }],
    disponibilidades: [
      ...disp("d1a", "p1", "cl1", [1, 3, 5], "08:00", "12:00"),
      ...disp("d1b", "p1", "cl2", [2, 4], "13:00", "17:00"),
      ...disp("d2a", "p2", "cl1", [1, 2], "09:00", "12:00"),
      ...disp("d2b", "p2", "cl3", [3, 4], "13:00", "17:00"),
      ...disp("d3a", "p3", "cl2", [1, 3, 5], "08:00", "11:00"),
      ...disp("d4a", "p4", "cl1", [2, 4], "08:00", "12:00"),
      ...disp("d4b", "p4", "cl2", [5], "13:00", "17:00"),
    ],
    pacientes: [
      {
        id: "pac1", nome: "Maria Souza", cpf: "52998224725", nascimento: "1990-05-14", telefone: "(81) 99999-1234",
        email: "maria@exemplo.com", cidade: "Olinda", plano: "conforto", pagamento: "Pix",
        senhaHash: hashSenha("senha123"), criadoEm: agora,
      },
    ],
    agendamentos: [],
    triagens: [],
    pagamentos: [],
  };
}
