/* ================================================================
   Axisgrid Obras — núcleo
   Camada de dados desacoplada (adaptador Store) + modelo de domínio.
   Esquema versionado "axisgrid.condoworks/1" para acoplamento futuro
   à plataforma Axisgrid: IDs estáveis, documentos JSON normalizados.
   ================================================================ */

const SCHEMA_VERSION = "condoworks/1";
const LS_KEY = "axisgrid-obras-v1";

/* ---------------- utilidades ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function uid(prefix) {
  return (prefix || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function toast(msg) {
  const t = el("div", { class: "toast" }, msg);
  $("#toast-root").append(t);
  setTimeout(() => t.remove(), 3600);
}

function openModal(content, opts) {
  closeModal();
  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === overlay && !(opts && opts.locked)) closeModal(); } });
  const modal = el("div", { class: "modal" + ((opts && opts.wide) ? " modal-wide" : "") });
  modal.append(content);
  overlay.append(modal);
  $("#modal-root").append(overlay);
  return modal;
}
function closeModal() { $("#modal-root").innerHTML = ""; }

/* datas */
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
function parseISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function todayISO() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; }
function addDays(iso, n) {
  const d = parseISO(iso); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addBusinessDays(iso, n) {
  const d = parseISO(iso); let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) left--; }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }

/* ---------------- estado global ---------------- */
const State = {
  config: null,        // documento app/config
  units: {},           // unitId -> dados da unidade
  obras: {},           // obraId -> obra
  mode: "local",       // "db" | "local"
  ready: false,
  dirty: false,        // formulário admin em edição — evita re-render por snapshot
};

function defaultConfig() {
  return {
    schema: SCHEMA_VERSION,
    condominio: { nome: "", cnpj: "", endereco: "", cidade: "", uf: "", cep: "", sindico: "", administradora: "", email: "", telefone: "" },
    torres: [],
    prumadas: [
      { id: "pr-hidr", nome: "Prumada de hidráulica", tipo: "hidraulica" },
      { id: "pr-esg", nome: "Prumada de esgoto", tipo: "esgoto" },
      { id: "pr-ele", nome: "Prumada elétrica", tipo: "eletrica" },
      { id: "pr-dad", nome: "Prumada de dados", tipo: "dados" },
      { id: "pr-aut", nome: "Prumada de automação", tipo: "automacao" },
    ],
    ambientes: { padrao: [], porFinal: [], excecoes: [] },
    prestadores: [],
    concessionarias: [],
    areasComuns: [],
    elevadores: [],
  };
}

/** Garante que configs antigas ganhem os campos novos sem perder nada. */
function upgradeConfig(cfg) {
  if (!cfg) return cfg;
  cfg.prestadores = cfg.prestadores || [];
  cfg.concessionarias = cfg.concessionarias || [];
  cfg.areasComuns = cfg.areasComuns || [];
  cfg.elevadores = cfg.elevadores || [];
  return cfg;
}

/* ---------------- torre mestre (esqueleto replicável) ----------------
   Uma torre pode ser marcada como "mestre" (config.torreMestreId).
   Torres com seguirMestre=true espelham a ESTRUTURA da mestre ao salvar:
   andares, unidades por andar, andares atípicos e a configuração dos
   elevadores (nome, tipo, marca, fornecedor). O que é de cada torre —
   moradores, status das unidades, funcionamento/manutenção de cada
   elevador — nunca é tocado pela replicação. */
function torreSegueMestre(torreId) {
  const mid = State.config && State.config.torreMestreId;
  if (!mid || torreId === mid) return false;
  const t = (State.config.torres || []).find(x => x.id === torreId);
  return !!(t && t.seguirMestre);
}

function aplicarMestre(cfg) {
  const mid = cfg.torreMestreId;
  if (!mid) return;
  const mestre = (cfg.torres || []).find(t => t.id === mid);
  if (!mestre) { cfg.torreMestreId = null; return; }

  const seguidoras = (cfg.torres || []).filter(t => t.id !== mid && t.seguirMestre);

  // 1) esqueleto: andares e unidades
  for (const t of seguidoras) {
    t.andares = mestre.andares;
    t.unidadesPorAndar = mestre.unidadesPorAndar;
    t.andaresAtipicos = JSON.parse(JSON.stringify(mestre.andaresAtipicos || []));
  }

  // 2) elevadores: a configuração replica; o status é de cada torre
  const elevs = cfg.elevadores = cfg.elevadores || [];
  const doMestre = elevs.filter(e => e.torreId === mid);
  for (const t of seguidoras) {
    for (const me of doMestre) {
      let alvo = elevs.find(e => e.torreId === t.id && e.mestreElevId === me.id);
      if (!alvo) {
        alvo = { id: uid("el"), torreId: t.id, mestreElevId: me.id, status: "operando", ultimaManut: "", proximaManut: "", historico: [] };
        elevs.push(alvo);
      }
      alvo.nome = me.nome;
      alvo.tipo = me.tipo;
      // marca é realidade material da torre: replica só como valor inicial
      if (!alvo.marca) alvo.marca = me.marca || "";
      alvo.manutencaoPrestadorId = me.manutencaoPrestadorId || "";
    }
    // réplica cujo elevador mestre foi removido sai junto
    for (let i = elevs.length - 1; i >= 0; i--) {
      const e = elevs[i];
      if (e.torreId === t.id && e.mestreElevId && !doMestre.some(me => me.id === e.mestreElevId)) elevs.splice(i, 1);
    }
  }
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
function fmtGrade(grade) {
  if (!grade || !grade.length) return "Sem grade definida";
  return grade.map(g =>
    (g.dias || []).map(d => DIAS_SEMANA[d]).join(", ") +
    (g.das ? ` · ${g.das}–${g.ate || "?"}` : "")
  ).join("  |  ");
}

const ILUM_INFO = {
  funcionando: { rotulo: "Funcionando", cor: "var(--st-prop)" },
  parcial: { rotulo: "Falha parcial", cor: "var(--ob-reta)" },
  falha: { rotulo: "Com falha", cor: "var(--ob-inicio)" },
};
const ELEV_STATUS = {
  operando: { rotulo: "Operando", cor: "var(--st-prop)" },
  manutencao: { rotulo: "Em manutenção", cor: "var(--ob-meio)" },
  parado: { rotulo: "Parado", cor: "var(--ob-inicio)" },
};
const ELEV_TIPO = { social: "Social", servico: "Serviço" };

/* ---------------- Store: adaptador de persistência ----------------
   Interface única sobre dois backends:
   - "db": banco compartilhado do artifact (multiusuário, tempo real)
   - "local": localStorage (demonstração num único navegador)
   No acoplamento ao Axisgrid, este adaptador é o ponto de troca. */
const Store = {
  db: null,
  _unsubs: [],
  onRemoteChange: null, // callback(kind)

  async init() {
    try {
      this.db = await (window.claude && window.claude.use ? window.claude.use("db") : Promise.resolve(null));
    } catch (e) { this.db = null; }
    if (this.db) {
      State.mode = "db";
      await this._loadFromDb();
      this._subscribe();
    } else if (await this._probeApi()) {
      State.mode = "api";
      await this._loadFromApi();
      this._pollApi();
    } else {
      State.mode = "local";
      this._loadFromLocal();
    }
    if (!State.config) State.config = defaultConfig();
    upgradeConfig(State.config);
    State.ready = true;
  },

  async _loadFromDb() {
    const [cfgSnap, unitsSnap, obrasSnap] = await Promise.all([
      this.db.doc("app/config").get(),
      this.db.collection("units").limit(1000).get(),
      this.db.collection("obras").limit(500).get(),
    ]);
    State.config = cfgSnap.exists ? cfgSnap.data() : null;
    State.units = {}; unitsSnap.docs.forEach(d => { State.units[d.id] = d.data(); });
    State.obras = {}; obrasSnap.docs.forEach(d => { State.obras[d.id] = d.data(); });
  },

  _subscribe() {
    const notify = (kind) => { if (this.onRemoteChange) this.onRemoteChange(kind); };
    this._unsubs.push(this.db.doc("app/config").onSnapshot(snap => {
      if (snap.exists) { State.config = upgradeConfig(JSON.parse(JSON.stringify(snap.data()))); notify("config"); }
    }, () => {}));
    this._unsubs.push(this.db.collection("units").limit(1000).onSnapshot(snap => {
      State.units = {}; snap.docs.forEach(d => { State.units[d.id] = d.data(); });
      notify("units");
    }, () => {}));
    this._unsubs.push(this.db.collection("obras").limit(500).onSnapshot(snap => {
      State.obras = {}; snap.docs.forEach(d => { State.obras[d.id] = d.data(); });
      notify("obras");
    }, () => {}));
  },

  /* ---- modo "api": servidor local (server.js), banco em data/db.json ---- */
  _rev: 0,
  async _probeApi() {
    if (location.protocol !== "http:" && location.protocol !== "https:") return false;
    try {
      const r = await fetch("api/rev", { cache: "no-store" });
      if (!r.ok) return false;
      const j = await r.json();
      return typeof j.rev === "number";
    } catch (e) { return false; }
  },
  async _loadFromApi() {
    const r = await fetch("api/state", { cache: "no-store" });
    const j = await r.json();
    this._rev = j.rev;
    State.config = j.config;
    State.units = j.units || {};
    State.obras = j.obras || {};
  },
  _pollApi() {
    setInterval(async () => {
      try {
        const r = await fetch("api/rev", { cache: "no-store" });
        const j = await r.json();
        if (j.rev !== this._rev) {
          await this._loadFromApi();
          if (!State.config) State.config = defaultConfig();
          upgradeConfig(State.config);
          if (this.onRemoteChange) this.onRemoteChange("all");
        }
      } catch (e) { /* servidor indisponível no momento: tenta no próximo ciclo */ }
    }, 8000);
  },
  async _apiSend(method, url, body) {
    try {
      const r = await fetch(url, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      if (typeof j.rev === "number") this._rev = j.rev;
    } catch (e) {
      toast("Não foi possível salvar no servidor local — ele está rodando?");
    }
  },

  _loadFromLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        State.config = data.config || null;
        State.units = data.units || {};
        State.obras = data.obras || {};
      }
    } catch (e) { /* armazenamento indisponível: começa vazio */ }
  },
  _saveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ config: State.config, units: State.units, obras: State.obras }));
    } catch (e) { /* sem persistência local */ }
  },

  async saveConfig() {
    State.config.schema = SCHEMA_VERSION;
    aplicarMestre(State.config);
    if (this.db) await this.db.doc("app/config").set(JSON.parse(JSON.stringify(State.config)));
    else if (State.mode === "api") await this._apiSend("PUT", "api/config", State.config);
    else this._saveLocal();
  },
  async saveUnit(unitId) {
    const body = State.units[unitId];
    if (this.db) {
      if (body) await this.db.doc("units/" + unitId).set(JSON.parse(JSON.stringify(body)));
      else await this.db.doc("units/" + unitId).delete();
    } else if (State.mode === "api") {
      if (body) await this._apiSend("PUT", "api/units/" + unitId, body);
      else await this._apiSend("DELETE", "api/units/" + unitId);
    } else this._saveLocal();
  },
  async saveObra(obraId) {
    const body = State.obras[obraId];
    if (this.db) {
      if (body) await this.db.doc("obras/" + obraId).set(JSON.parse(JSON.stringify(body)));
      else await this.db.doc("obras/" + obraId).delete();
    } else if (State.mode === "api") {
      if (body) await this._apiSend("PUT", "api/obras/" + obraId, body);
      else await this._apiSend("DELETE", "api/obras/" + obraId);
    } else this._saveLocal();
  },
  async wipeAll() {
    if (State.mode === "api" && !this.db) {
      await this._apiSend("POST", "api/wipe");
      State.config = defaultConfig(); State.units = {}; State.obras = {};
      return;
    }
    if (this.db) {
      const jobs = [this.db.doc("app/config").delete()];
      for (const id of Object.keys(State.units)) jobs.push(this.db.doc("units/" + id).delete());
      for (const id of Object.keys(State.obras)) jobs.push(this.db.doc("obras/" + id).delete());
      await Promise.all(jobs);
    } else {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
    }
    State.config = defaultConfig(); State.units = {}; State.obras = {};
  },
};

/* ---------------- modelo de domínio ---------------- */

/** Deriva a lista de unidades a partir da configuração de torres.
    ID estável: "<torreId>-<numero>", numero = andar*100 + final. */
function buildUnits(config) {
  const list = [];
  for (const t of (config.torres || [])) {
    const atip = {};
    for (const a of (t.andaresAtipicos || [])) atip[a.andar] = a.unidades;
    for (let andar = 1; andar <= (t.andares || 0); andar++) {
      const qtd = atip[andar] != null ? atip[andar] : (t.unidadesPorAndar || 0);
      for (let f = 1; f <= qtd; f++) {
        const numero = andar * 100 + f;
        list.push({
          id: `${t.id}-${numero}`,
          torreId: t.id, torreNome: t.nome,
          andar, final: f, numero,
          atipico: atip[andar] != null,
        });
      }
    }
  }
  return list;
}

function unitById(id) {
  return buildUnits(State.config).find(u => u.id === id) || null;
}
function unitLabel(u) {
  return `${u.torreNome || u.torreId} · Unid. ${u.numero}`;
}

/** Ambientes de uma unidade: exceção tipológica > regra por final > padrão. */
function ambientesDaUnidade(u) {
  const cfg = State.config.ambientes || {};
  const exc = (cfg.excecoes || []).find(e => e.unidade === u.id);
  if (exc) return { lista: exc.ambientes || [], origem: exc.rotulo || "Exceção tipológica" };
  const regra = (cfg.porFinal || []).find(r => (r.finais || []).includes(u.final));
  if (regra) return { lista: regra.ambientes || [], origem: `Tipologia final ${regra.finais.join(" e ")}` };
  return { lista: cfg.padrao || [], origem: "Tipologia padrão" };
}

/** Todos os moradores/status preenchidos? Habilita "Informar obra". */
function cadastroCompleto() {
  const units = buildUnits(State.config);
  if (!units.length) return { ok: false, total: 0, feitos: 0 };
  let feitos = 0;
  for (const u of units) {
    const d = State.units[u.id];
    if (d && d.status) {
      const precisaMorador = d.status === "proprietario" || d.status === "inquilino";
      if (!precisaMorador || (d.morador && d.morador.nome)) feitos++;
    }
  }
  return { ok: feitos === units.length, total: units.length, feitos };
}

/** Obra ativa (submetida e não encerrada) de uma unidade. */
function obraAtivaDaUnidade(unitId) {
  return Object.entries(State.obras)
    .map(([id, o]) => ({ id, ...o }))
    .find(o => o.unidade === unitId && o.status === "submetida" && !o.encerrada) || null;
}

/** Etapa da obra -> cor do martelo.
    Automática pelo avanço do prazo, com possibilidade de ajuste manual. */
function etapaDaObra(obra) {
  if (obra.progresso && obra.progresso !== "auto") return obra.progresso;
  const ini = obra.dataInicio, fim = obra.dataFim;
  if (!ini || !fim) return "inicio";
  const total = Math.max(1, diffDays(ini, fim));
  const pct = diffDays(ini, todayISO()) / total;
  if (pct < 0.35) return "inicio";
  if (pct < 0.65) return "meio";
  if (pct < 0.9) return "reta_final";
  return "fim";
}
const ETAPA_INFO = {
  inicio: { rotulo: "Início de obras", cor: "var(--ob-inicio)" },
  meio: { rotulo: "Rumo à metade da obra", cor: "var(--ob-meio)" },
  reta_final: { rotulo: "Reta final de obra", cor: "var(--ob-reta)" },
  fim: { rotulo: "Final da obra", cor: "var(--ob-fim)" },
};
function hammerSVG(cor) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${cor}" d="M13.6 4.1c1.9-1.9 4.6-2 6.1-.5l.7.7c.4.4.4 1 0 1.4l-3.6 3.6c-.4.4-1 .4-1.4 0l-.2-.2-1.2 1.2 6.3 6.3c.5.5.5 1.3 0 1.8l-1 1c-.5.5-1.3.5-1.8 0l-6.3-6.3-6.6 6.6c-.5.5-1.3.5-1.8 0l-.9-.9c-.5-.5-.5-1.3 0-1.8l8.9-8.9-.2-.2c-.4-.4-.4-1 0-1.4l3-2.4z"/></svg>`;
}

const STATUS_INFO = {
  proprietario: { rotulo: "Em uso pelo proprietário", classe: "st-proprietario", swatch: "var(--st-prop)" },
  inquilino: { rotulo: "Em uso por inquilino", classe: "st-inquilino", swatch: "var(--st-inq)" },
  vago: { rotulo: "Vago (desocupado)", classe: "st-vago", swatch: "var(--st-vago)" },
  comercializacao: { rotulo: "Vago — em comercialização", classe: "st-comercializacao", swatch: "var(--st-comerc)" },
  disputa: { rotulo: "Vago — disputa judicial", classe: "st-disputa", swatch: "var(--st-disputa)" },
};

/* ---------------- adaptador Axisgrid ----------------
   Snapshot completo e normalizado do estado, pronto para ingestão. */
const AxisgridAdapter = {
  exportSnapshot() {
    const units = buildUnits(State.config).map(u => ({
      ...u,
      ambientes: ambientesDaUnidade(u).lista,
      ocupacao: State.units[u.id] || null,
      obraAtiva: (obraAtivaDaUnidade(u.id) || {}).id || null,
    }));
    return {
      schema: SCHEMA_VERSION,
      exportadoEm: new Date().toISOString(),
      origem: "domnex-prototipo",
      condominio: State.config.condominio,
      torres: State.config.torres,
      prumadas: State.config.prumadas,
      regrasAmbientes: State.config.ambientes,
      prestadores: State.config.prestadores,
      concessionarias: State.config.concessionarias,
      areasComuns: State.config.areasComuns,
      elevadores: State.config.elevadores,
      unidades: units,
      obras: Object.entries(State.obras).map(([id, o]) => ({ id, ...o })),
    };
  },
};

/* ---------------- dados de exemplo (modo demonstração) ---------------- */
function sampleDataset() {
  const cfg = defaultConfig();
  cfg.condominio = {
    nome: "Residencial Vale das Araucárias (exemplo)",
    cnpj: "12.345.678/0001-90", endereco: "Rua das Prumadas, 120",
    cidade: "Curitiba", uf: "PR", cep: "80000-000",
    sindico: "Marta Nogueira", administradora: "Gestora Alfa Condomínios",
    email: "sindico@valedasaraucarias.com.br", telefone: "(41) 3333-1200",
  };
  cfg.torres = [
    { id: "T1", nome: "Torre Ipê", andares: 8, unidadesPorAndar: 4, andaresAtipicos: [{ andar: 8, unidades: 2 }] },
    { id: "T2", nome: "Torre Jacarandá", andares: 6, unidadesPorAndar: 2, andaresAtipicos: [] },
  ];
  cfg.prumadas.push({ id: "pr-gas", nome: "Prumada de gás", tipo: "outra" });
  cfg.ambientes = {
    padrao: ["Sala", "Cozinha", "Área de serviço", "Banheiro social", "Quarto 1", "Quarto 2"],
    porFinal: [
      { id: "rg-1", finais: [1, 4], ambientes: ["Sala", "Cozinha", "Área de serviço", "Banheiro social", "Suíte", "Quarto 1", "Quarto 2", "Varanda gourmet"] },
      { id: "rg-2", finais: [2, 3], ambientes: ["Sala", "Cozinha", "Área de serviço", "Banheiro social", "Quarto 1", "Quarto 2"] },
    ],
    excecoes: [
      { id: "ex-1", unidade: "T1-801", rotulo: "Cobertura duplex", ambientes: ["Sala", "Cozinha", "Área de serviço", "Banheiro social", "Suíte master", "Quarto 1", "Quarto 2", "Terraço", "Piscina privativa", "Churrasqueira"] },
      { id: "ex-2", unidade: "T2-101", rotulo: "Unidade jardim (térreo)", ambientes: ["Sala", "Cozinha", "Área de serviço", "Banheiro social", "Quarto 1", "Quarto 2", "Jardim privativo"] },
    ],
  };

  const hojeRef = todayISO();
  cfg.prestadores = [
    { id: "pv-limp", nome: "Limpar+ Conservação", servico: "Limpeza das áreas comuns", tipo: "fixo", telefone: "(00) 0000-0001", grade: [{ dias: [1, 2, 3, 4, 5], das: "07:00", ate: "16:00" }], obs: "" },
    { id: "pv-pisc", nome: "Água Clara Piscinas", servico: "Tratamento da piscina", tipo: "fixo", telefone: "(00) 0000-0002", grade: [{ dias: [2, 5], das: "08:00", ate: "10:00" }], obs: "" },
    { id: "pv-jard", nome: "Verde Vivo Jardinagem", servico: "Jardinagem", tipo: "fixo", telefone: "(00) 0000-0003", grade: [{ dias: [1], das: "08:00", ate: "12:00" }], obs: "" },
    { id: "pv-dedet", nome: "ProTeto Dedetização", servico: "Dedetização semestral", tipo: "esporadico", telefone: "(00) 0000-0004", grade: [], obs: "Última visita em agosto; próxima prevista para fevereiro." },
  ];
  cfg.concessionarias = [
    { id: "cs-1", nome: "FibraNet", tipo: "internet", telefone: "(00) 0000-0010", obs: "Fibra até o DG de cada torre" },
    { id: "cs-2", nome: "MegaCabo", tipo: "internet_tv", telefone: "(00) 0000-0011", obs: "Internet + TV por assinatura" },
    { id: "cs-3", nome: "TVSat Assinaturas", tipo: "tv", telefone: "(00) 0000-0012", obs: "Antena coletiva no topo da Torre Ipê" },
  ];
  cfg.areasComuns = [
    { id: "ac-1", nome: "Hall social — Torre Ipê", status: "funcionando", verificadoEm: addDays(hojeRef, -3), obs: "" },
    { id: "ac-2", nome: "Garagem G1", status: "parcial", verificadoEm: addDays(hojeRef, -1), obs: "Duas luminárias queimadas perto das vagas 31–34" },
    { id: "ac-3", nome: "Playground", status: "falha", verificadoEm: hojeRef, obs: "Refletor principal não acende" },
    { id: "ac-4", nome: "Salão de festas", status: "funcionando", verificadoEm: addDays(hojeRef, -10), obs: "" },
  ];
  cfg.elevadores = [
    { id: "el-1", torreId: "T1", nome: "Social 1", tipo: "social", status: "operando", ultimaManut: addDays(hojeRef, -20), proximaManut: addDays(hojeRef, 40), historico: [{ data: addDays(hojeRef, -20), descricao: "Preventiva mensal — tudo em ordem" }] },
    { id: "el-2", torreId: "T1", nome: "Serviço 1", tipo: "servico", status: "manutencao", ultimaManut: hojeRef, proximaManut: "", historico: [{ data: hojeRef, descricao: "Troca do cabo de tração — previsão de 3 dias parado" }] },
    { id: "el-3", torreId: "T2", nome: "Social Único", tipo: "social", status: "operando", ultimaManut: addDays(hojeRef, -35), proximaManut: addDays(hojeRef, 25), historico: [] },
    { id: "el-4", torreId: "T2", nome: "Serviço Único", tipo: "servico", status: "operando", ultimaManut: addDays(hojeRef, -35), proximaManut: addDays(hojeRef, 25), historico: [] },
  ];

  const units = {};
  const nomes = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Elisa Prado", "Fábio Nunes", "Gabriela Reis", "Heitor Alves", "Iara Campos", "João Pedro Dias", "Karen Melo", "Luís Otávio", "Marina Costa", "Nelson Freitas", "Olívia Ramos", "Paulo Sérgio", "Quésia Barros", "Rafael Torres", "Sofia Duarte", "Tiago Moraes"];
  let ni = 0;
  const all = buildUnits(cfg);
  all.forEach((u, i) => {
    const nome = nomes[ni++ % nomes.length];
    const tel = `(41) 9${String(8100 + i).padStart(4, "0")}-${String(1000 + i * 7).slice(0, 4)}`;
    const email = nome.toLowerCase().replace(/[^a-z]+/g, ".") + "@email.com";
    if (i % 9 === 4) units[u.id] = { status: "vago" };
    else if (i % 11 === 6) units[u.id] = { status: "comercializacao", comercializacao: i % 2 ? "alugar" : "vender" };
    else if (i % 17 === 9) units[u.id] = { status: "disputa" };
    else if (i % 4 === 1) {
      const prop = nomes[ni++ % nomes.length];
      units[u.id] = {
        status: "inquilino",
        morador: { nome, telefone: tel, email },
        proprietario: { nome: prop, telefone: `(41) 3${String(200 + i)}-0000`, email: prop.toLowerCase().replace(/[^a-z]+/g, ".") + "@email.com" },
        contrato: { inicio: addDays(hojeRef, -200 - i * 3), fim: addDays(hojeRef, 400 - i * 2) },
        moradoresFixos: [nome, nomes[(ni + 3) % nomes.length]],
      };
    } else {
      units[u.id] = { status: "proprietario", morador: { nome, telefone: tel, email }, moradoresFixos: [nome] };
    }
    if (units[u.id] && units[u.id].status !== "vago" && i % 5 === 2) {
      units[u.id].prumadasAtualizadas = {
        "pr-hidr": { data: addDays(hojeRef, -(40 + i)) },
        "pr-ele": { data: addDays(hojeRef, -(40 + i)) },
      };
    }
  });

  const hoje = todayISO();
  const obras = {};
  obras["ob-exemplo1"] = {
    criadaEm: addDays(hoje, -20), status: "submetida", encerrada: false, progresso: "auto",
    morador: "Ana Souza", unidade: "T1-402",
    ambientes: ["Cozinha", "Área de serviço", "Sala"],
    escopo: [
      { id: "sc-1", servico: "Demolição", ambientes: ["Cozinha", "Área de serviço"], descricao: "Remoção de bancadas e parede não estrutural entre cozinha e sala." },
      { id: "sc-2", servico: "Remoção do piso", ambientes: ["Sala", "Cozinha"], descricao: "Retirada do porcelanato existente." },
      { id: "sc-3", servico: "Troca de rejunte", ambientes: ["Área de serviço"], descricao: "" },
    ],
    estrutural: { possui: false, descricao: "" },
    dataInicio: addDays(hoje, -15), dataFim: addDays(hoje, 18),
    ruido: [
      { id: "rd-1", etapa: "Demolição — Cozinha", inicio: addDays(hoje, -15), fim: addDays(hoje, -12) },
      { id: "rd-2", etapa: "Demolição — Área de serviço", inicio: addDays(hoje, -14), fim: addDays(hoje, -11) },
      { id: "rd-3", etapa: "Remoção do piso — Sala e cozinha", inicio: addDays(hoje, -10), fim: addDays(hoje, -4) },
    ],
    folgaDias: 2, ruidoConfirmado: true,
    prestadores: [
      { id: "pv-1", servicos: "Demolição e remoção do piso", empresa: "Empreiteira XPTO", responsavel: "Eng. Célio Martins", documentoResp: "CREA-PR 45.678", equipe: [{ nome: "José Carlos Silva", doc: "CPF 111.222.333-44" }, { nome: "Ademir Rocha", doc: "RG 9.876.543-2" }] },
      { id: "pv-2", servicos: "Troca de rejunte e acabamentos", empresa: "Miro Acabamentos", responsavel: "Miro Tavares", documentoResp: "CPF 555.666.777-88", equipe: [{ nome: "Miro Tavares", doc: "CPF 555.666.777-88" }] },
    ],
    assinatura: { token: "482913", assinadoEm: addDays(hoje, -20), nome: "Ana Souza" },
    protocolo: "OBR-2026-0001",
  };
  return { config: cfg, units, obras };
}

async function loadSample() {
  const data = sampleDataset();
  State.config = data.config; State.units = data.units; State.obras = data.obras;
  await Store.saveConfig();
  await Promise.all(Object.keys(State.units).map(id => Store.saveUnit(id)));
  await Promise.all(Object.keys(State.obras).map(id => Store.saveObra(id)));
}
