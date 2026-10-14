// Funções utilitárias puras (sem acesso ao DOM), usadas por todas as telas.

/** Escapa texto antes de colocar em innerHTML (evita XSS). */
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const onlyDigits = (v) => String(v ?? "").replace(/\D/g, "");
export const brl = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pad = (n) => String(n).padStart(2, "0");
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
export const DIAS = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const diaSemana = (iso) => parseISO(iso).getDay();
export const fmtDataLonga = (iso) => (iso ? `${DIAS[diaSemana(iso)]}, ${fmtData(iso)}` : "—");

export const minutos = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const deMinutos = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const fmtCpf = (c) => onlyDigits(c).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
export function fmtTel(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

export function cpfValido(c) {
  c = onlyDigits(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +c[i] * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === +c[9] && dv(10) === +c[10];
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const queryParams = () => new URLSearchParams(location.search);
export const primeiroNome = (nome) => String(nome || "").trim().split(/\s+/)[0] || "";
