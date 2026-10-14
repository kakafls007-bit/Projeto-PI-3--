# CaisMed - Front-end (PWA)

Aplicação web responsiva (celular, tablet e computador) instalável como PWA. HTML/CSS/JS puro com módulos ES.

## Como rodar

Use um servidor local (Live Server, porta 5502, ou `python -m http.server`) e abra `index.html`.
Não abra o arquivo direto do disco: módulos ES e service worker precisam de `http://localhost` ou HTTPS.

## Estrutura

| Pasta/arquivo | Função |
|---|---|
| `*.html` | Telas (casca simples; cabeçalho, menu e acessibilidade são montados por `js/layout.js`) |
| `css/style.css` | Estilos, temas claro/escuro, texto grande, layout responsivo |
| `js/api.js` | **Único** ponto de contato com a API REST |
| `js/config.js` | `API_BASE_URL` (vazio = servidor simulado) |
| `js/mock/` | Servidor simulado (localStorage) com o mesmo contrato da API. Apagar quando o back-end real entrar |
| `js/layout.js`, `js/ui.js`, `js/components/crud.js` | Componentes reutilizáveis |
| `js/pages/*.js` | Um script por tela |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA (instalável e com tela offline) |

## Ligar o back-end real

1. Em `js/config.js`, preencha `API_BASE_URL` (ex.: `https://api.caismed.com.br`) e habilite CORS no servidor.
2. Apague `js/mock/` (opcional).
3. Se mudar algum arquivo, suba `VERSAO` em `sw.js`.

Todas as chamadas enviam `Authorization: Bearer <token>`. Erros devem vir como `{ "message": "texto para o usuário" }` com o status HTTP correto.

## Perfis

`paciente`, `profissional` (profissional de saúde) e `administrador`. O paciente **não** cria conta sozinho: a clínica cadastra e ele usa "Primeiro Acesso" com o CPF.

## Contrato da API

| Rota | Perfis | Descrição |
|---|---|---|
| `POST /auth/login` `{cpf, senha}` | público | Login do paciente → `{token, usuario}` |
| `POST /auth/staff/login` `{matricula, senha}` | público | Login de profissional/administrador |
| `POST /auth/primeiro-acesso` `{cpf, senha}` | público | Paciente cria a senha (409 se já tem) |
| `POST /auth/recuperar-senha` `{cpf}` | público | Sempre 200 |
| `GET /auth/me` | todos | Usuário logado |
| `GET /planos` | público | Planos e valores |
| `GET/POST /especialidades`, `PUT/DELETE /especialidades/:id` | leitura: todos; escrita: admin | `?busca=`; DELETE dá 409 se houver profissionais |
| `GET/POST /clinicas`, `GET/PUT/DELETE /clinicas/:id` | leitura: todos; escrita: admin | `?busca=` (nome, cidade, bairro) |
| `GET/POST /profissionais`, `GET/PUT/DELETE /profissionais/:id` | leitura: todos; escrita: admin | `?busca=&clinicaId=&especialidadeId=`; corpo: `nome, registro, especialidadeId, clinicaIds[], matricula, senha` |
| `GET/POST /profissionais/:id/disponibilidades` | leitura: todos; escrita: o próprio profissional ou admin | `{clinicaId, diaSemana(0-6), inicio, fim, duracao}`; 409 se sobrepor |
| `DELETE /disponibilidades/:id` | o próprio profissional ou admin | |
| `GET /profissionais/:id/horarios?data=AAAA-MM-DD&clinicaId=` | todos | Horários livres `[{horario, clinicaId}]` |
| `GET /profissionais/:id/proximas-datas?clinicaId=&limite=` | todos | Próximas datas com horário livre |
| `GET/POST /pacientes`, `GET/PUT/DELETE /pacientes/:id` | profissional/admin (o paciente acessa só o próprio) | `?busca=` (nome/CPF); CPF único e válido; DELETE: admin ou o próprio |
| `GET /agendamentos` | todos (cada perfil vê o seu escopo) | `?status=&de=&ate=&busca=&clinicaId=&profissionalId=` |
| `GET /agendamentos/:id` | dono/profissional/admin | |
| `POST /agendamentos` `{clinicaId, profissionalId, data, horario, triagemId?}` | paciente | 409 se o horário já foi ocupado |
| `PATCH /agendamentos/:id/cancelar` | dono/profissional/admin | Só status `agendado` |
| `PATCH /agendamentos/:id/concluir` `{observacoes}` | profissional/admin | |
| `POST /triagens` `{motivo, sintomas[], urgencia, observacoes}` | paciente | → `{id, especialidadeSugerida}` (aqui entra a IA do chatbot) |
| `GET /faturas/atual`, `POST /faturas/pagar` `{metodo}`, `GET /pagamentos` | paciente | |
| `GET /resumo` | profissional/admin | Números dos painéis |

Status de agendamento: `agendado`, `concluido`, `cancelado`.

## Acessos de demonstração (só com o servidor simulado)

- Paciente: CPF `52998224725`, senha `senha123`
- Profissional de saúde: matrícula `1001`, senha `caismed123`
- Administrador: matrícula `9001`, senha `admin123`

Para zerar os dados de teste: limpe o localStorage do site.
