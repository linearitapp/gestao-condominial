/* ================================================================
   Axisgrid Obras — painel do administrador
   ================================================================ */

const TAB_ICONS = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  condominio: '<path d="M4 21V5l8-3 8 3v16"/><path d="M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15"/><path d="M2 21h20"/>',
  estrutura: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 8h14M5 13h14M5 18h14M12 3v18"/>',
  prumadas: '<path d="M7 3v18M12 3v18M17 3v18"/><circle cx="7" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="6" r="1.6" fill="currentColor" stroke="none"/>',
  ambientes: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v9M7.5 12v9"/>',
  stacking: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.3h18M3 14.6h18M9 4v16M15 4v16"/>',
  obras: '<path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 1 5-5l2.6-2.6-2.3-2.3z"/>',
  integracao: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1.2"/>',
  prestadores: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/><path d="M17 3.5l3.5 3.5-2.5 2.5L14.5 6z"/><path d="M16 8l-2 2"/>',
  concessionarias: '<path d="M2 9a14 14 0 0 1 20 0"/><path d="M5.5 12.5a9 9 0 0 1 13 0"/><path d="M9 16a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none"/>',
  areascomuns: '<path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2V17h-5v-1.1c0-.8-.4-1.5-1-2A6 6 0 0 1 12 3z"/><path d="M10 20h4"/>',
  elevadores: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18"/><path d="M7.5 10l1.5-2 1.5 2M7.5 14l1.5 2 1.5-2"/><path d="M15 8h2.5M15 12h2.5M15 16h2.5"/>',
};
function tabIcon(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_ICONS[id] || ""}</svg>`;
}

const ADMIN_TABS = [
  { id: "inicio", nome: "Início" },
  { id: "condominio", nome: "Condomínio" },
  { id: "estrutura", nome: "Torres e andares" },
  { id: "prumadas", nome: "Prumadas verticais" },
  { id: "ambientes", nome: "Ambientes das unidades" },
  { id: "prestadores", nome: "Prestadores de serviço" },
  { id: "concessionarias", nome: "Concessionárias" },
  { id: "areascomuns", nome: "Áreas comuns" },
  { id: "elevadores", nome: "Elevadores" },
  { id: "stacking", nome: "Stacking plan" },
  { id: "obras", nome: "Obras" },
  { id: "integracao", nome: "Dados e exportação" },
];

function field(labelText, value, opts) {
  opts = opts || {};
  const input = opts.type === "select"
    ? el("select", {}, (opts.options || []).map(o => el("option", { value: o.value, selected: o.value === value }, o.nome)))
    : opts.type === "textarea"
      ? el("textarea", { placeholder: opts.placeholder || "" }, value || "")
      : el("input", { type: opts.type || "text", value: value == null ? "" : value, placeholder: opts.placeholder || "", min: opts.min, max: opts.max });
  const wrap = el("div", { class: "field" },
    el("label", {}, labelText),
    input,
    opts.hint ? el("span", { class: "hint" }, opts.hint) : null);
  return { wrap, input };
}

function pageHead(eyebrow, title, lead) {
  return el("div", { class: "page-head" },
    el("div", { class: "eyebrow" }, eyebrow),
    el("h1", {}, title),
    lead ? el("p", { class: "lead" }, lead) : null);
}

function renderRail(active) {
  const rail = $("#rail");
  rail.innerHTML = "";
  const doneMap = adminTabDone();
  for (const t of ADMIN_TABS) {
    if (t.id === "condominio") rail.append(el("div", { class: "rail-label" }, "Cadastro"));
    if (t.id === "prestadores") rail.append(el("div", { class: "rail-label" }, "Prédio e serviços"));
    if (t.id === "stacking") rail.append(el("div", { class: "rail-label" }, "Dia a dia"));
    rail.append(el("button", {
      class: (active === t.id ? "active " : "") + (doneMap[t.id] ? "done" : ""),
      onclick: () => { location.hash = "#/admin/" + t.id; },
    }, el("span", { html: tabIcon(t.id) }), t.nome,
      doneMap[t.id] ? el("span", { class: "rail-check", title: "Etapa concluída" }, "✓") : null));
  }
}

function adminTabDone() {
  const c = State.config || defaultConfig();
  const comp = cadastroCompleto();
  return {
    inicio: false,
    condominio: !!(c.condominio && c.condominio.nome),
    estrutura: (c.torres || []).length > 0,
    prumadas: (c.prumadas || []).length > 0,
    ambientes: !!((c.ambientes.padrao || []).length || (c.ambientes.porFinal || []).length),
    prestadores: (c.prestadores || []).length > 0,
    concessionarias: (c.concessionarias || []).length > 0,
    areascomuns: (c.areasComuns || []).length > 0,
    elevadores: (c.elevadores || []).length > 0,
    stacking: comp.ok,
    obras: Object.values(State.obras).some(o => o.status === "submetida"),
    integracao: false,
  };
}

function markDirtyOn(container) {
  container.addEventListener("input", () => { State.dirty = true; });
}

function renderAdmin(tab) {
  $("#admin-shell").hidden = false;
  $("#obra-shell").hidden = true;
  $("#doc-shell").hidden = true;
  State.dirty = false;
  renderRail(tab);
  updateTopbar();
  const content = $("#admin-content");
  content.innerHTML = "";
  const inner = el("div", { class: "content-inner" });
  content.append(inner);
  markDirtyOn(inner);
  const fns = {
    inicio: viewInicio, condominio: viewCondominio, estrutura: viewEstrutura, prumadas: viewPrumadas,
    ambientes: viewAmbientes, prestadores: viewPrestadores, concessionarias: viewConcessionarias,
    areascomuns: viewAreasComuns, elevadores: viewElevadores,
    stacking: viewStacking, obras: viewObras, integracao: viewIntegracao,
  };
  (fns[tab] || viewInicio)(inner);
}

function updateTopbar() {
  const c = State.config && State.config.condominio;
  $("#brand-sub").textContent = (c && c.nome) ? c.nome : "Gestão predial completa";
  const pill = $("#sync-pill");
  if (State.mode === "db") { pill.textContent = "Dados compartilhados"; pill.className = "pill pill-accent"; pill.title = "Salvo no banco do artifact: quem abrir esta página vê os mesmos dados."; }
  else if (State.mode === "api") { pill.textContent = "Servidor local"; pill.className = "pill pill-accent"; pill.title = "Salvo no servidor desta máquina (data/db.json): todos os navegadores que abrirem este endereço veem os mesmos dados."; }
  else { pill.textContent = "Demonstração local"; pill.className = "pill pill-muted"; pill.title = "Sem banco compartilhado nesta visualização: os dados ficam apenas neste navegador."; }
  const comp = cadastroCompleto();
  $("#btn-informar-obra").hidden = !comp.ok;
}

/* ---------------- 0. Início (boas-vindas) ---------------- */
function viewInicio(root) {
  const c = State.config.condominio || {};
  const comp = cadastroCompleto();
  const temTorres = State.config.torres.length > 0;
  const obrasAtivas = Object.values(State.obras).filter(o => o.status === "submetida" && !o.encerrada).length;
  const done = adminTabDone();

  root.append(el("div", { class: "hello" },
    el("h1", {}, c.nome ? `Olá! Este é o painel do ${c.nome}` : "Boas-vindas!"),
    el("p", {}, temTorres
      ? "Acompanhe o condomínio num só lugar: quem mora em cada unidade, o que está vago e quais obras estão acontecendo."
      : "Este é o painel de gestão de obras do seu condomínio. Em três passos simples, você monta o mapa do prédio e passa a receber as comunicações de obra dos moradores.")));

  if (!temTorres) {
    root.append(el("div", { class: "welcome-hero" },
      el("h2", {}, "Como funciona"),
      el("div", { class: "welcome-steps" },
        el("div", { class: "welcome-step" },
          el("div", { class: "wnum" }, "1"),
          el("h3", {}, "Cadastre o prédio"),
          el("p", {}, "Dados do condomínio, torres, andares, prumadas e os ambientes de cada tipo de apartamento.")),
        el("div", { class: "welcome-step" },
          el("div", { class: "wnum" }, "2"),
          el("h3", {}, "Preencha os moradores"),
          el("p", {}, "Clique em cada unidade do mapa e diga quem mora lá — proprietário, inquilino ou vago. As cores mostram tudo de relance.")),
        el("div", { class: "welcome-step" },
          el("div", { class: "wnum" }, "3"),
          el("h3", {}, "Receba as obras"),
          el("p", {}, "Com o mapa completo, você gera um link para o morador comunicar a obra — com cronograma, prestadores e assinatura digital."))),
      el("div", { style: "margin-top:20px;display:flex;gap:10px;flex-wrap:wrap" },
        el("button", { class: "btn btn-accent", onclick: () => { location.hash = "#/admin/condominio"; } }, "Começar pelo condomínio →"),
        el("button", {
          class: "btn", onclick: async () => { await loadSample(); renderAdmin("inicio"); toast("Condomínio de exemplo carregado — explore à vontade!"); }
        }, "Ver um exemplo pronto"))));
    return;
  }

  const unidades = buildUnits(State.config).length;

  /* avisos do prédio: iluminação com falha e elevadores fora de operação */
  const avisos = [];
  for (const a of (State.config.areasComuns || [])) {
    if (a.status === "falha") avisos.push(`Iluminação com falha: ${a.nome}`);
    else if (a.status === "parcial") avisos.push(`Iluminação com falha parcial: ${a.nome}`);
  }
  for (const ev of (State.config.elevadores || [])) {
    if (ev.status && ev.status !== "operando") {
      const t = (State.config.torres.find(x => x.id === ev.torreId) || {}).nome || ev.torreId || "";
      avisos.push(`Elevador ${ev.nome || ""} (${t}): ${(ELEV_STATUS[ev.status] || {}).rotulo || ev.status}`);
    }
  }
  if (avisos.length) {
    root.append(el("div", { class: "banner banner-warn", style: "margin-bottom:14px;flex-direction:column;gap:4px" },
      el("strong", {}, "Atenção no prédio hoje:"),
      avisos.map(a => el("span", { class: "small" }, "• " + a))));
  }

  root.append(el("div", { class: "home-stats" },
    el("div", { class: "stat-tile" }, el("div", { class: "num" }, String(unidades)), el("div", { class: "lbl" }, "unidades no condomínio")),
    el("div", { class: "stat-tile" }, el("div", { class: "num" }, `${comp.feitos}/${comp.total}`), el("div", { class: "lbl" }, "unidades com morador/status preenchido")),
    el("div", { class: "stat-tile" }, el("div", { class: "num" }, String(obrasAtivas)), el("div", { class: "lbl" }, obrasAtivas === 1 ? "obra em andamento" : "obras em andamento"))));

  const cards = [
    ["condominio", "Dados do condomínio", done.condominio ? "Preenchidos — clique para revisar" : "Nome, endereço e contatos da administração"],
    ["estrutura", "Torres e andares", done.estrutura ? "Estrutura montada — clique para ajustar" : "Quantas torres, andares e apartamentos"],
    ["prumadas", "Prumadas verticais", "Hidráulica, esgoto, elétrica, dados e outras"],
    ["ambientes", "Ambientes das unidades", done.ambientes ? "Cadastrados — clique para revisar" : "Quais cômodos existem em cada tipo de apartamento"],
    ["stacking", "Stacking plan", comp.ok ? "Mapa completo! Clique para ver e atualizar" : `Faltam ${comp.total - comp.feitos} unidades para completar o mapa`],
    ["obras", "Obras", comp.ok ? "Gere links de obra e acompanhe cada reforma" : "Libera quando o mapa estiver completo"],
    ["prestadores", "Prestadores de serviço", (State.config.prestadores || []).length ? `${State.config.prestadores.length} equipe(s) cadastrada(s), com grade semanal` : "Equipes fixas e esporádicas que cuidam do prédio"],
    ["concessionarias", "Concessionárias", (State.config.concessionarias || []).length ? `${State.config.concessionarias.length} operadora(s) de internet e TV` : "Operadoras de internet e TV que atendem o prédio"],
    ["areascomuns", "Iluminação das áreas comuns", (State.config.areasComuns || []).length ? `${State.config.areasComuns.filter(a => a.status === "funcionando").length} de ${State.config.areasComuns.length} áreas com iluminação ok` : "Registre as áreas comuns e o estado da iluminação"],
    ["elevadores", "Elevadores", (State.config.elevadores || []).length ? `${State.config.elevadores.filter(e => (e.status || "operando") === "operando").length} de ${State.config.elevadores.length} em operação` : "Sociais e de serviço, por torre, com manutenção"],
  ];
  root.append(el("div", { class: "home-grid" }, cards.map(([id, titulo, sub]) =>
    el("button", { class: "home-card" + (done[id] ? " done" : ""), onclick: () => { location.hash = "#/admin/" + id; } },
      el("span", { class: "hicon", html: tabIcon(id) }),
      el("span", { class: "htext" }, el("strong", {}, titulo), el("span", {}, sub)),
      el("span", { class: "harrow" }, "›")))));

  if (comp.ok) {
    root.append(el("div", { class: "banner banner-info", style: "margin-top:14px;align-items:center" },
      el("span", { style: "flex:1" }, el("strong", {}, "Tudo pronto! "), "Quando um morador avisar que vai reformar, gere o link de comunicação de obra e envie para ele."),
      el("button", { class: "btn btn-accent btn-sm", onclick: criarLinkObra }, "Informar obra")));
  }
}

/* ---------------- 1. Condomínio ---------------- */
function viewCondominio(root) {
  const c = State.config.condominio;
  root.append(pageHead("Passo 1 de 4", "Dados do condomínio",
    "Conte quem é o condomínio: nome, endereço e os contatos da administração. Esses dados aparecem no topo de todos os documentos de obra."));

  const f = {};
  const defs = [
    ["nome", "Nome do condomínio"], ["cnpj", "CNPJ"], ["endereco", "Endereço"],
    ["cidade", "Cidade"], ["uf", "UF"], ["cep", "CEP"],
    ["sindico", "Síndico(a)"], ["administradora", "Administradora"],
    ["email", "E-mail da administração"], ["telefone", "Telefone"],
  ];
  const grid = el("div", { class: "grid-2" });
  for (const [k, label] of defs) { f[k] = field(label, c[k]); grid.append(f[k].wrap); }

  root.append(el("div", { class: "card" }, grid,
    el("div", { class: "modal-actions" },
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          for (const k of Object.keys(f)) c[k] = f[k].input.value.trim();
          await Store.saveConfig(); State.dirty = false;
          toast("Dados do condomínio salvos.");
          renderRail("condominio"); updateTopbar();
        }
      }, "Salvar dados"))));
}

/* ---------------- 2. Torres e andares ---------------- */
function viewEstrutura(root) {
  root.append(pageHead("Passo 2 de 4", "Torres e andares",
    "Diga quantas torres o condomínio tem e, em cada uma, quantos andares e apartamentos por andar. Se algum andar for diferente dos demais — uma cobertura com 2 unidades, por exemplo — adicione-o como andar fora da tipologia comum."));

  const torres = State.config.torres;
  const listWrap = el("div", { class: "stack" });

  const renderTorre = (t, idx) => {
    const nome = field("Nome da torre", t.nome, { placeholder: "Torre A" });
    const andares = field("Nº de andares", t.andares, { type: "number", min: 1 });
    const upa = field("Unidades por andar (tipologia comum)", t.unidadesPorAndar, { type: "number", min: 1 });
    const atipList = el("div", {});
    const renderAtip = () => {
      atipList.innerHTML = "";
      (t.andaresAtipicos || []).forEach((a, i) => {
        const fa = field("Nº do andar", a.andar, { type: "number", min: 1 });
        const fq = field("Qtde. de apartamentos neste andar", a.unidades, { type: "number", min: 1 });
        fa.input.addEventListener("change", () => { a.andar = +fa.input.value || 0; });
        fq.input.addEventListener("change", () => { a.unidades = +fq.input.value || 0; });
        atipList.append(el("div", { class: "atipico-item" },
          el("div", { class: "item-head" },
            el("strong", { class: "small" }, "Andar fora da tipologia comum"),
            el("button", { class: "btn btn-sm btn-danger", onclick: () => { t.andaresAtipicos.splice(i, 1); renderAtip(); } }, "Remover")),
          el("div", { class: "grid-2" }, fa.wrap, fq.wrap)));
      });
    };
    renderAtip();
    nome.input.addEventListener("change", () => { t.nome = nome.input.value.trim(); });
    andares.input.addEventListener("change", () => { t.andares = +andares.input.value || 0; });
    upa.input.addEventListener("change", () => { t.unidadesPorAndar = +upa.input.value || 0; });

    return el("div", { class: "card" },
      el("div", { class: "card-title-row" },
        el("h3", {}, `${t.id} — ${t.nome || "Torre sem nome"}`),
        el("button", {
          class: "btn btn-sm btn-danger", onclick: () => {
            if (confirm(`Remover a torre ${t.nome || t.id}? As unidades e status dessa torre deixarão de aparecer no stacking plan.`)) {
              torres.splice(idx, 1); redraw();
            }
          }
        }, "Remover torre")),
      el("div", { class: "grid-3" }, nome.wrap, andares.wrap, upa.wrap),
      el("div", { style: "margin-top:12px" }, atipList),
      el("button", {
        class: "btn btn-sm btn-ghost", style: "margin-top:8px", onclick: () => {
          t.andaresAtipicos = t.andaresAtipicos || []; t.andaresAtipicos.push({ andar: t.andares || 1, unidades: 1 }); renderAtip();
        }
      }, "+ Inserir andar fora da tipologia comum"));
  };

  const redraw = () => {
    listWrap.innerHTML = "";
    torres.forEach((t, i) => listWrap.append(renderTorre(t, i)));
    if (!torres.length) listWrap.append(el("div", { class: "banner banner-info" }, "Nenhuma torre cadastrada ainda. Adicione a primeira torre abaixo."));
  };
  redraw();

  root.append(listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", {
        class: "btn", onclick: () => {
          const n = torres.length + 1;
          torres.push({ id: "T" + n, nome: "Torre " + n, andares: 10, unidadesPorAndar: 4, andaresAtipicos: [] });
          redraw();
        }
      }, "+ Adicionar torre"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false;
          toast("Estrutura de torres salva. Stacking plan atualizado.");
          renderRail("estrutura"); updateTopbar();
        }
      }, "Salvar estrutura")));
}

/* ---------------- 3. Prumadas ---------------- */
function viewPrumadas(root) {
  root.append(pageHead("Passo 3 de 4", "Prumadas verticais",
    "Prumadas são as tubulações e cabos que sobem pelo prédio — água, esgoto, energia, internet. As mais comuns já vêm preenchidas; ajuste os nomes ou adicione outras que existam no seu edifício (gás, por exemplo)."));

  const prumadas = State.config.prumadas;
  const tipos = [
    { value: "hidraulica", nome: "Hidráulica" }, { value: "esgoto", nome: "Esgoto" },
    { value: "eletrica", nome: "Elétrica" }, { value: "dados", nome: "Dados" },
    { value: "automacao", nome: "Automação" }, { value: "outra", nome: "Outra" },
  ];
  const listWrap = el("div", {});
  const redraw = () => {
    listWrap.innerHTML = "";
    prumadas.forEach((p, i) => {
      const fn = field("Nome da prumada", p.nome);
      const ft = field("Tipo", p.tipo, { type: "select", options: tipos });
      fn.input.addEventListener("change", () => { p.nome = fn.input.value.trim(); });
      ft.input.addEventListener("change", () => { p.tipo = ft.input.value; });
      listWrap.append(el("div", { class: "prumada-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small mono" }, p.id),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { prumadas.splice(i, 1); redraw(); } }, "Remover")),
        el("div", { class: "grid-2" }, fn.wrap, ft.wrap)));
    });
  };
  redraw();

  root.append(el("div", { class: "card" },
    el("p", { class: "small muted", style: "margin-bottom:10px" }, `${prumadas.length} prumada(s) cadastrada(s)`),
    listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", { class: "btn", onclick: () => { prumadas.push({ id: uid("pr"), nome: "", tipo: "outra" }); redraw(); } }, "+ Adicionar outra prumada vertical"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false; toast("Prumadas salvas."); renderRail("prumadas");
        }
      }, "Salvar prumadas"))));
}

/* ---------------- 4. Ambientes ---------------- */
function tagEditor(getList, setList, placeholder) {
  const wrap = el("div", {});
  const chips = el("div", { class: "chips", style: "margin-bottom:8px" });
  const input = el("input", { placeholder: placeholder || "Ex.: Cozinha", style: "flex:1" });
  const redraw = () => {
    chips.innerHTML = "";
    getList().forEach((a, i) => chips.append(el("span", { class: "chip static" }, a + " ",
      el("button", { class: "btn-ghost", style: "border:0;background:none;cursor:pointer;color:inherit;padding:0 0 0 4px", "aria-label": "Remover " + a, onclick: () => { const l = getList(); l.splice(i, 1); setList(l); redraw(); } }, "×"))));
  };
  const add = () => {
    const v = input.value.trim();
    if (!v) return;
    const l = getList();
    if (!l.includes(v)) { l.push(v); setList(l); }
    input.value = ""; redraw();
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  redraw();
  wrap.append(chips, el("div", { style: "display:flex;gap:8px" }, input, el("button", { class: "btn btn-sm", onclick: add }, "Adicionar")));
  return wrap;
}

function viewAmbientes(root) {
  root.append(pageHead("Passo 4 de 4", "Ambientes das unidades",
    "Liste os cômodos de cada tipo de apartamento — o morador vai escolher entre eles ao comunicar uma obra. Dá para ter uma lista para todos, listas por final de unidade (ex.: todo final 2 e 4) e exceções, como uma cobertura duplex ou a unidade jardim do térreo."));

  const amb = State.config.ambientes;
  const maxFinal = Math.max(1, ...State.config.torres.map(t => Math.max(t.unidadesPorAndar || 0, ...(t.andaresAtipicos || []).map(a => a.unidades || 0))));
  const todasUnidades = buildUnits(State.config);

  /* padrão */
  root.append(el("div", { class: "card" },
    el("h3", {}, "Tipologia padrão"),
    el("p", { class: "small muted", style: "margin:4px 0 10px" }, "Vale para toda unidade que não se enquadrar numa regra por final nem numa exceção."),
    tagEditor(() => amb.padrao, l => { amb.padrao = l; }, "Ex.: Sala")));

  /* regras por final */
  const regrasWrap = el("div", {});
  const redrawRegras = () => {
    regrasWrap.innerHTML = "";
    (amb.porFinal || []).forEach((r, i) => {
      const finaisChips = el("div", { class: "chips" });
      for (let f = 1; f <= maxFinal; f++) {
        const on = (r.finais || []).includes(f);
        finaisChips.append(el("button", {
          class: "chip" + (on ? " on" : ""), onclick: (e) => {
            e.preventDefault();
            r.finais = r.finais || [];
            const ix = r.finais.indexOf(f);
            if (ix >= 0) r.finais.splice(ix, 1); else r.finais.push(f);
            r.finais.sort((a, b) => a - b);
            redrawRegras();
          }
        }, "Final " + f));
      }
      regrasWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, "Regra por final " + (r.finais && r.finais.length ? "— finais " + r.finais.join(", ") : "")),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { amb.porFinal.splice(i, 1); redrawRegras(); } }, "Remover")),
        el("p", { class: "small muted", style: "margin-bottom:6px" }, "Aplicar aos finais:"),
        finaisChips,
        el("p", { class: "small muted", style: "margin:10px 0 6px" }, "Ambientes desta tipologia:"),
        tagEditor(() => r.ambientes || [], l => { r.ambientes = l; }, "Ex.: Suíte")));
    });
  };
  redrawRegras();
  root.append(el("div", { class: "card" },
    el("div", { class: "card-title-row" },
      el("h3", {}, "Regras por final de unidade"),
      el("button", { class: "btn btn-sm", onclick: () => { amb.porFinal.push({ id: uid("rg"), finais: [], ambientes: [] }); redrawRegras(); } }, "+ Associar tipologia a finais")),
    el("p", { class: "small muted", style: "margin-bottom:10px" }, `Ex.: “Todo final 2 e 4 tem estes ambientes”. Finais possíveis neste condomínio: 1 a ${maxFinal}.`),
    regrasWrap));

  /* exceções */
  const excWrap = el("div", {});
  const redrawExc = () => {
    excWrap.innerHTML = "";
    (amb.excecoes || []).forEach((ex, i) => {
      const funit = field("Unidade", ex.unidade, {
        type: "select",
        options: [{ value: "", nome: "Selecione a unidade…" }].concat(todasUnidades.map(u => ({ value: u.id, nome: unitLabel(u) }))),
      });
      const frot = field("Descrição da exceção", ex.rotulo, { placeholder: "Ex.: Cobertura duplex, unidade jardim no térreo" });
      funit.input.addEventListener("change", () => { ex.unidade = funit.input.value; });
      frot.input.addEventListener("change", () => { ex.rotulo = frot.input.value.trim(); });
      excWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, ex.rotulo || "Exceção tipológica"),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { amb.excecoes.splice(i, 1); redrawExc(); } }, "Remover")),
        el("div", { class: "grid-2" }, funit.wrap, frot.wrap),
        el("p", { class: "small muted", style: "margin:10px 0 6px" }, "Ambientes desta unidade:"),
        tagEditor(() => ex.ambientes || [], l => { ex.ambientes = l; }, "Ex.: Terraço")));
    });
  };
  redrawExc();
  root.append(el("div", { class: "card" },
    el("div", { class: "card-title-row" },
      el("h3", {}, "Exceções tipológicas"),
      el("button", { class: "btn btn-sm", onclick: () => { amb.excecoes.push({ id: uid("ex"), unidade: "", rotulo: "", ambientes: [] }); redrawExc(); } }, "+ Inserir exceção tipológica")),
    excWrap.childElementCount ? excWrap : el("div", {}, el("p", { class: "small muted" }, "Nenhuma exceção cadastrada."), excWrap)));

  root.append(el("div", { class: "modal-actions" },
    el("button", {
      class: "btn btn-accent", onclick: async () => {
        await Store.saveConfig(); State.dirty = false; toast("Ambientes salvos."); renderRail("ambientes");
      }
    }, "Salvar ambientes")));
}

/* ---------------- Prédio e serviços: prestadores ---------------- */
function viewPrestadores(root) {
  root.append(pageHead("Prédio e serviços", "Prestadores de serviço",
    "As equipes que cuidam do prédio no dia a dia (fixas, com grade semanal) e as que vêm de vez em quando (esporádicas). A portaria consulta esta lista para saber quem entra e em que horário."));

  const lista = State.config.prestadores;
  const listWrap = el("div", {});

  const redraw = () => {
    listWrap.innerHTML = "";
    lista.forEach((p, i) => {
      const fn = field("Empresa / prestador", p.nome, { placeholder: "Ex.: Verde Vivo Jardinagem" });
      const fs = field("Serviço prestado", p.servico, { placeholder: "Ex.: Jardinagem" });
      const ft = field("Tipo", p.tipo || "fixo", { type: "select", options: [{ value: "fixo", nome: "Fixo (vem toda semana)" }, { value: "esporadico", nome: "Esporádico (sob demanda)" }] });
      const ftel = field("Telefone", p.telefone || "");
      const fobs = field("Observações", p.obs || "", { placeholder: "Ex.: entra pela portaria de serviço" });
      fn.input.addEventListener("input", () => { p.nome = fn.input.value; });
      fs.input.addEventListener("input", () => { p.servico = fs.input.value; });
      ftel.input.addEventListener("input", () => { p.telefone = ftel.input.value; });
      fobs.input.addEventListener("input", () => { p.obs = fobs.input.value; });
      ft.input.addEventListener("change", () => { p.tipo = ft.input.value; redraw(); });

      const gradeWrap = el("div", {});
      if ((p.tipo || "fixo") === "fixo") {
        p.grade = p.grade || [];
        const redrawGrade = () => {
          gradeWrap.innerHTML = "";
          gradeWrap.append(el("p", { class: "small muted", style: "margin:10px 0 4px" }, "Grade semanal — em quais dias e horários esta equipe trabalha no condomínio:"));
          p.grade.forEach((g, j) => {
            const chips = el("div", { class: "chips" });
            DIAS_SEMANA.forEach((dia, di) => {
              const on = (g.dias || []).includes(di);
              chips.append(el("button", {
                class: "chip" + (on ? " on" : ""), onclick: (e) => {
                  e.preventDefault(); g.dias = g.dias || [];
                  const ix = g.dias.indexOf(di);
                  if (ix >= 0) g.dias.splice(ix, 1); else { g.dias.push(di); g.dias.sort(); }
                  e.target.classList.toggle("on");
                }
              }, dia));
            });
            const fdas = el("input", { type: "time", value: g.das || "" });
            const fate = el("input", { type: "time", value: g.ate || "" });
            fdas.addEventListener("change", () => { g.das = fdas.value; });
            fate.addEventListener("change", () => { g.ate = fate.value; });
            gradeWrap.append(el("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px" },
              chips,
              el("span", { class: "small muted" }, "das"), fdas,
              el("span", { class: "small muted" }, "às"), fate,
              el("button", { class: "btn btn-sm btn-danger", onclick: () => { p.grade.splice(j, 1); redrawGrade(); } }, "×")));
          });
          gradeWrap.append(el("button", { class: "btn btn-sm btn-ghost", style: "margin-top:8px", onclick: () => { p.grade.push({ dias: [], das: "", ate: "" }); redrawGrade(); } }, "+ Adicionar horário"));
        };
        redrawGrade();
      }

      listWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, p.nome || "Novo prestador",
            p.tipo === "esporadico" ? el("span", { class: "pill pill-muted", style: "margin-left:8px" }, "Esporádico") : el("span", { class: "pill pill-accent", style: "margin-left:8px" }, "Fixo")),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { lista.splice(i, 1); redraw(); } }, "Remover")),
        el("div", { class: "grid-2" }, fn.wrap, fs.wrap),
        el("div", { class: "grid-3", style: "margin-top:8px" }, ft.wrap, ftel.wrap, fobs.wrap),
        gradeWrap));
    });
    if (!lista.length) listWrap.append(el("p", { class: "small muted" }, "Nenhum prestador cadastrado ainda."));
  };
  redraw();

  root.append(el("div", { class: "card" }, listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", { class: "btn", onclick: () => { lista.push({ id: uid("pv"), nome: "", servico: "", tipo: "fixo", telefone: "", grade: [], obs: "" }); redraw(); } }, "+ Adicionar prestador"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false; toast("Prestadores salvos!"); renderRail("prestadores");
        }
      }, "Salvar prestadores"))));
}

/* ---------------- Prédio e serviços: concessionárias ---------------- */
function viewConcessionarias(root) {
  root.append(pageHead("Prédio e serviços", "Concessionárias",
    "As operadoras de internet e TV por assinatura que atendem o condomínio. Útil para orientar moradores novos e para saber quem chamar quando algo cai."));

  const lista = State.config.concessionarias;
  const tipos = [
    { value: "internet", nome: "Internet" }, { value: "tv", nome: "TV por assinatura" },
    { value: "internet_tv", nome: "Internet + TV" }, { value: "outro", nome: "Outro serviço" },
  ];
  const listWrap = el("div", {});
  const redraw = () => {
    listWrap.innerHTML = "";
    lista.forEach((c, i) => {
      const fn = field("Operadora", c.nome, { placeholder: "Ex.: FibraNet" });
      const ft = field("Serviço", c.tipo || "internet", { type: "select", options: tipos });
      const ftel = field("Telefone / contato", c.telefone || "");
      const fobs = field("Observações", c.obs || "", { placeholder: "Ex.: fibra até o DG de cada torre" });
      fn.input.addEventListener("input", () => { c.nome = fn.input.value; });
      ft.input.addEventListener("change", () => { c.tipo = ft.input.value; });
      ftel.input.addEventListener("input", () => { c.telefone = ftel.input.value; });
      fobs.input.addEventListener("input", () => { c.obs = fobs.input.value; });
      listWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, c.nome || "Nova operadora"),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { lista.splice(i, 1); redraw(); } }, "Remover")),
        el("div", { class: "grid-2" }, fn.wrap, ft.wrap),
        el("div", { class: "grid-2", style: "margin-top:8px" }, ftel.wrap, fobs.wrap)));
    });
    if (!lista.length) listWrap.append(el("p", { class: "small muted" }, "Nenhuma concessionária cadastrada ainda."));
  };
  redraw();

  root.append(el("div", { class: "card" }, listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", { class: "btn", onclick: () => { lista.push({ id: uid("cs"), nome: "", tipo: "internet", telefone: "", obs: "" }); redraw(); } }, "+ Adicionar concessionária"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false; toast("Concessionárias salvas!"); renderRail("concessionarias");
        }
      }, "Salvar concessionárias"))));
}

/* ---------------- Prédio e serviços: áreas comuns (iluminação) ---------------- */
function viewAreasComuns(root) {
  root.append(pageHead("Prédio e serviços", "Iluminação das áreas comuns",
    "Registre cada área comum e como está a iluminação dela. Ao fazer a ronda, atualize o status e marque a verificação — o painel inicial avisa quando algo está com falha."));

  const lista = State.config.areasComuns;
  const listWrap = el("div", {});
  const redraw = () => {
    listWrap.innerHTML = "";
    lista.forEach((a, i) => {
      const fn = field("Área comum", a.nome, { placeholder: "Ex.: Hall social — Torre Ipê" });
      const fobs = field("Observações", a.obs || "", { placeholder: "Ex.: duas luminárias queimadas" });
      fn.input.addEventListener("input", () => { a.nome = fn.input.value; });
      fobs.input.addEventListener("input", () => { a.obs = fobs.input.value; });

      const statusChips = el("div", { class: "chips" });
      for (const [k, info] of Object.entries(ILUM_INFO)) {
        statusChips.append(el("button", {
          class: "chip" + ((a.status || "funcionando") === k ? " on" : ""),
          onclick: (e) => { e.preventDefault(); a.status = k; redraw(); },
        }, el("span", { style: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${info.cor};margin-right:6px` }), info.rotulo));
      }

      listWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, a.nome || "Nova área"),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { lista.splice(i, 1); redraw(); } }, "Remover")),
        el("div", { class: "grid-2" }, fn.wrap, fobs.wrap),
        el("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px" },
          statusChips,
          el("span", { class: "small muted" }, "Última verificação: " + fmtDate(a.verificadoEm)),
          el("button", { class: "btn btn-sm", onclick: () => { a.verificadoEm = todayISO(); redraw(); } }, "Verifiquei hoje"))));
    });
    if (!lista.length) listWrap.append(el("p", { class: "small muted" }, "Nenhuma área comum cadastrada ainda."));
  };
  redraw();

  root.append(el("div", { class: "card" }, listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", { class: "btn", onclick: () => { lista.push({ id: uid("ac"), nome: "", status: "funcionando", verificadoEm: todayISO(), obs: "" }); redraw(); } }, "+ Adicionar área comum"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false; toast("Áreas comuns salvas!"); renderRail("areascomuns");
        }
      }, "Salvar áreas comuns"))));
}

/* ---------------- Prédio e serviços: elevadores ---------------- */
function viewElevadores(root) {
  root.append(pageHead("Prédio e serviços", "Elevadores",
    "Cadastre os elevadores de cada torre — sociais e de serviço, com nome — e acompanhe o funcionamento e o histórico de manutenção de cada um."));

  const lista = State.config.elevadores;
  const torres = State.config.torres;
  if (!torres.length) {
    root.append(el("div", { class: "banner banner-warn" },
      "Cadastre as torres primeiro, para poder dizer de qual torre é cada elevador. ",
      el("button", { class: "btn btn-sm", style: "margin-left:6px", onclick: () => { location.hash = "#/admin/estrutura"; } }, "Cadastrar torres")));
    return;
  }

  const listWrap = el("div", {});
  const redraw = () => {
    listWrap.innerHTML = "";
    lista.forEach((ev, i) => {
      const ftorre = field("Torre", ev.torreId || "", { type: "select", options: [{ value: "", nome: "Torre…" }].concat(torres.map(t => ({ value: t.id, nome: t.nome || t.id }))) });
      const fn = field("Nome do elevador", ev.nome, { placeholder: "Ex.: Social 1" });
      const ft = field("Tipo", ev.tipo || "social", { type: "select", options: [{ value: "social", nome: "Social" }, { value: "servico", nome: "Serviço" }] });
      const fum = field("Última manutenção", ev.ultimaManut || "", { type: "date" });
      const fpm = field("Próxima manutenção prevista", ev.proximaManut || "", { type: "date" });
      ftorre.input.addEventListener("change", () => { ev.torreId = ftorre.input.value; });
      fn.input.addEventListener("input", () => { ev.nome = fn.input.value; });
      ft.input.addEventListener("change", () => { ev.tipo = ft.input.value; });
      fum.input.addEventListener("change", () => { ev.ultimaManut = fum.input.value; });
      fpm.input.addEventListener("change", () => { ev.proximaManut = fpm.input.value; });

      const statusChips = el("div", { class: "chips" });
      for (const [k, info] of Object.entries(ELEV_STATUS)) {
        statusChips.append(el("button", {
          class: "chip" + ((ev.status || "operando") === k ? " on" : ""),
          onclick: (e) => { e.preventDefault(); ev.status = k; redraw(); },
        }, el("span", { style: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${info.cor};margin-right:6px` }), info.rotulo));
      }

      const histWrap = el("div", {});
      const redrawHist = () => {
        histWrap.innerHTML = "";
        (ev.historico || []).forEach((h, j) => {
          const fd = el("input", { type: "date", value: h.data || "" });
          const fx = el("input", { placeholder: "O que foi feito", value: h.descricao || "", style: "flex:1;min-width:180px" });
          fd.addEventListener("change", () => { h.data = fd.value; });
          fx.addEventListener("input", () => { h.descricao = fx.value; });
          histWrap.append(el("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px" },
            fd, fx,
            el("button", { class: "btn btn-sm btn-danger", onclick: () => { ev.historico.splice(j, 1); redrawHist(); } }, "×")));
        });
        histWrap.append(el("button", {
          class: "btn btn-sm btn-ghost", style: "margin-top:8px",
          onclick: () => { ev.historico = ev.historico || []; ev.historico.push({ data: todayISO(), descricao: "" }); redrawHist(); }
        }, "+ Registrar manutenção"));
      };
      redrawHist();

      const torreNome = (torres.find(t => t.id === ev.torreId) || {}).nome || ev.torreId || "sem torre";
      listWrap.append(el("div", { class: "regra-item" },
        el("div", { class: "item-head" },
          el("strong", { class: "small" }, `${ev.nome || "Novo elevador"} · ${torreNome}`,
            el("span", { class: "pill pill-muted", style: "margin-left:8px" }, ELEV_TIPO[ev.tipo] || "Social")),
          el("button", { class: "btn btn-sm btn-danger", onclick: () => { lista.splice(i, 1); redraw(); } }, "Remover")),
        el("div", { class: "grid-3" }, ftorre.wrap, fn.wrap, ft.wrap),
        el("div", { style: "margin-top:10px" },
          el("p", { class: "small muted", style: "margin-bottom:4px" }, "Funcionamento:"), statusChips),
        el("div", { class: "grid-2", style: "margin-top:10px" }, fum.wrap, fpm.wrap),
        el("p", { class: "small muted", style: "margin:10px 0 0" }, "Histórico de manutenção:"),
        histWrap));
    });
    if (!lista.length) listWrap.append(el("p", { class: "small muted" }, "Nenhum elevador cadastrado ainda."));
  };
  redraw();

  root.append(el("div", { class: "card" }, listWrap,
    el("div", { class: "modal-actions", style: "justify-content:space-between" },
      el("button", { class: "btn", onclick: () => { lista.push({ id: uid("el"), torreId: torres[0].id, nome: "", tipo: "social", status: "operando", ultimaManut: "", proximaManut: "", historico: [] }); redraw(); } }, "+ Adicionar elevador"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          await Store.saveConfig(); State.dirty = false; toast("Elevadores salvos!"); renderRail("elevadores");
        }
      }, "Salvar elevadores"))));
}

/* ---------------- 5. Stacking plan + moradores ---------------- */
function stackingLegend() {
  const item = (sw, label, isHammer) => el("span", { class: "legend-item" },
    isHammer
      ? el("span", { class: "legend-swatch", style: "background:var(--surface);display:flex;align-items:center;justify-content:center", html: hammerSVG(sw) })
      : el("span", { class: "legend-swatch", style: "background:" + sw }),
    label);
  return el("div", { class: "legend" },
    item("var(--st-prop)", "Proprietário"),
    item("var(--st-inq)", "Inquilino"),
    item("var(--st-vago)", "Vago"),
    item("var(--st-comerc)", "Em comercialização"),
    item("var(--st-disputa)", "Disputa judicial"),
    item("var(--ob-inicio)", "Obra: início", true),
    item("var(--ob-meio)", "Obra: rumo à metade", true),
    item("var(--ob-reta)", "Obra: reta final", true),
    item("var(--ob-fim)", "Obra: final", true));
}

function stackingPlan(interactive) {
  const wrap = el("div", { class: "towers" });
  for (const t of State.config.torres) {
    const atip = {}; (t.andaresAtipicos || []).forEach(a => { atip[a.andar] = a.unidades; });
    const maxCols = Math.max(t.unidadesPorAndar || 0, ...Object.values(atip), 1);
    const grid = el("div", { class: "tower-grid", style: `grid-template-columns: auto repeat(${maxCols}, minmax(52px, 1fr))` });
    for (let andar = t.andares; andar >= 1; andar--) {
      const qtd = atip[andar] != null ? atip[andar] : t.unidadesPorAndar;
      grid.append(el("div", { class: "floor-label" }, andar + "º"));
      for (let col = 1; col <= maxCols; col++) {
        if (col > qtd) { grid.append(el("div", {})); continue; }
        const numero = andar * 100 + col;
        const id = `${t.id}-${numero}`;
        const d = State.units[id];
        const obra = obraAtivaDaUnidade(id);
        const cls = d && d.status ? (STATUS_INFO[d.status] || {}).classe || "" : "";
        const cell = el("button", {
          class: "unit-cell " + cls,
          title: tooltipUnidade(id, d, obra),
          onclick: interactive ? (() => openUnitModal(id)) : null,
        }, String(numero));
        if (obra) {
          const etapa = etapaDaObra(obra);
          cell.append(el("span", { class: "hammer", html: hammerSVG(ETAPA_INFO[etapa].cor), title: "Obra em andamento — " + ETAPA_INFO[etapa].rotulo }));
        }
        if (d && d.status === "comercializacao" && d.comercializacao)
          cell.append(el("span", { class: "tag-comerc" }, d.comercializacao === "alugar" ? "alugar" : "vender"));
        grid.append(cell);
      }
    }
    wrap.append(el("div", { class: "tower" },
      el("h3", {}, `${t.nome || t.id}`),
      el("div", { class: "tower-grid-wrap" }, grid)));
  }
  return wrap;
}

function tooltipUnidade(id, d, obra) {
  const u = unitById(id);
  let s = u ? unitLabel(u) : id;
  if (d && d.status) s += " — " + STATUS_INFO[d.status].rotulo;
  else s += " — sem cadastro";
  if (d && d.morador && d.morador.nome) s += " — " + d.morador.nome;
  if (obra) s += " — obra: " + ETAPA_INFO[etapaDaObra(obra)].rotulo;
  return s;
}

function viewStacking(root) {
  const comp = cadastroCompleto();
  root.append(pageHead("Dia a dia", "Stacking plan",
    "O mapa do condomínio, torre por torre. Clique em qualquer unidade para dizer quem mora nela e preencher os contatos. As cores mostram a situação de cada uma; o martelinho indica obra em andamento."));

  if (!State.config.torres.length) {
    root.append(el("div", { class: "banner banner-warn" },
      "Antes de montar o mapa, cadastre as torres do condomínio. ",
      el("button", { class: "btn btn-sm", style: "margin-left:6px", onclick: () => { location.hash = "#/admin/estrutura"; } }, "Cadastrar torres")));
    return;
  }

  const pct = comp.total ? Math.round(100 * comp.feitos / comp.total) : 0;
  root.append(el("div", { class: "card" },
    el("div", { class: "card-title-row" },
      el("h3", {}, `Preenchimento: ${comp.feitos} de ${comp.total} unidades`),
      comp.ok
        ? el("span", { class: "pill pill-accent" }, "Cadastro completo — “Informar obra” liberado no menu")
        : el("span", { class: "pill pill-muted" }, pct + "%")),
    el("div", { class: "progress-line" }, el("div", { style: "width:" + pct + "%" })),
    stackingLegend()));

  root.append(el("div", { class: "card" }, stackingPlan(true)));
}

/* ---------- modal da unidade ---------- */
function openUnitModal(unitId) {
  const u = unitById(unitId);
  if (!u) return;
  const d = JSON.parse(JSON.stringify(State.units[unitId] || {}));
  d.status = d.status || "";
  const amb = ambientesDaUnidade(u);

  const body = el("div", {});
  const head = el("div", { class: "modal-head" },
    el("div", {},
      el("h2", {}, unitLabel(u)),
      el("p", { class: "small muted" }, `${u.andar}º andar · final ${u.final} · ${amb.origem}`,
        amb.lista.length ? ` · ${amb.lista.length} ambientes` : "")),
    el("button", { class: "modal-close", "aria-label": "Fechar", onclick: closeModal }, "×"));

  const STATUS_DESC = {
    proprietario: "O dono do apartamento mora nele",
    inquilino: "O apartamento está alugado — mora um inquilino",
    vago: "Ninguém morando no momento",
    comercializacao: "Vazio e anunciado para alugar ou vender",
    disputa: "Vazio, aguardando decisão da justiça",
  };
  const statusList = el("div", { class: "status-cards" });
  const statusWrap = el("div", { class: "unit-panel-status" },
    el("strong", { class: "small" }, "Como está esta unidade hoje?"),
    statusList);
  function redrawStatus() {
    statusList.innerHTML = "";
    for (const [k, info] of Object.entries(STATUS_INFO)) {
      statusList.append(el("button", {
        class: "status-card" + (d.status === k ? " on" : ""),
        onclick: () => { d.status = k; redrawForm(); },
      },
        el("span", { class: "sdot", style: "background:" + info.swatch }),
        el("span", {}, el("strong", {}, info.rotulo), el("small", {}, STATUS_DESC[k]))));
    }
  }

  const formWrap = el("div", { style: "margin-top:14px" });

  function personFields(obj, prefix) {
    obj.nome = obj.nome || ""; obj.telefone = obj.telefone || ""; obj.email = obj.email || "";
    const fn = field("Nome", obj.nome), ft = field("Telefone", obj.telefone), fe = field("E-mail", obj.email, { type: "email" });
    fn.input.addEventListener("input", () => { obj.nome = fn.input.value; });
    ft.input.addEventListener("input", () => { obj.telefone = ft.input.value; });
    fe.input.addEventListener("input", () => { obj.email = fe.input.value; });
    return el("div", { class: "grid-3" }, fn.wrap, ft.wrap, fe.wrap);
  }

  function contratoFields() {
    d.contrato = d.contrato || { inicio: "", fim: "" };
    const fi = field("Início do contrato", d.contrato.inicio, { type: "date" });
    const ff = field("Término do contrato", d.contrato.fim, { type: "date" });
    fi.input.addEventListener("change", () => { d.contrato.inicio = fi.input.value; });
    ff.input.addEventListener("change", () => { d.contrato.fim = ff.input.value; });
    return el("div", { class: "grid-2" }, fi.wrap, ff.wrap);
  }

  function moradoresFixosEditor() {
    return el("div", {},
      el("p", { class: "hint small muted", style: "margin-bottom:6px" }, "Quem mora na unidade de forma permanente (aparece para a portaria)."),
      tagEditor(() => (d.moradoresFixos = d.moradoresFixos || []), l => { d.moradoresFixos = l; }, "Nome do morador"));
  }

  function prumadasBlock() {
    d.prumadasAtualizadas = d.prumadasAtualizadas || {};
    const wrap = el("div", { style: "margin-top:16px" },
      el("h3", { class: "small", style: "margin-bottom:2px" }, "Prumadas atualizadas"),
      el("p", { class: "hint small muted", style: "margin-bottom:4px" }, "Marque as prumadas que esta unidade já modernizou — e quando, se souber."));
    for (const pr of State.config.prumadas) {
      const reg = d.prumadasAtualizadas[pr.id];
      const chk = el("input", { type: "checkbox", checked: !!reg });
      const fd = el("input", { type: "date", value: (reg && reg.data) || "", disabled: !reg });
      chk.addEventListener("change", () => {
        if (chk.checked) { d.prumadasAtualizadas[pr.id] = d.prumadasAtualizadas[pr.id] || {}; fd.disabled = false; }
        else { delete d.prumadasAtualizadas[pr.id]; fd.value = ""; fd.disabled = true; }
      });
      fd.addEventListener("change", () => { if (d.prumadasAtualizadas[pr.id]) d.prumadasAtualizadas[pr.id].data = fd.value; });
      wrap.append(el("label", { class: "check", style: "margin-top:6px;gap:10px;flex-wrap:wrap" },
        chk, el("span", { style: "flex:1;min-width:150px" }, pr.nome), fd));
    }
    return wrap;
  }

  function redrawForm() {
    redrawStatus();
    formWrap.innerHTML = "";

    if (d.status === "proprietario") {
      d.morador = d.morador || {};
      formWrap.append(
        el("h3", { class: "small", style: "margin-bottom:6px" }, "Morador (proprietário)"),
        personFields(d.morador, "morador"),
        el("button", {
          class: "btn btn-sm", style: "margin-top:10px", onclick: () => {
            d.proprietario = d.morador; d.morador = {}; d.status = "inquilino"; d._propInformado = true; redrawForm();
          }
        }, "+ Adicionar locatário/inquilino"),
        el("p", { class: "hint small muted", style: "margin-top:4px" }, "Se a unidade for ocupada por um inquilino futuramente, os dados do proprietário são mantidos e você cadastra o locatário."),
        el("h3", { class: "small", style: "margin:12px 0 6px" }, "Moradores fixos da unidade"),
        moradoresFixosEditor());
    } else if (d.status === "inquilino") {
      d.morador = d.morador || {};
      formWrap.append(
        el("h3", { class: "small", style: "margin-bottom:6px" }, "Morador (inquilino)"),
        personFields(d.morador, "morador"));
      const temProp = d._propInformado || (d.proprietario && d.proprietario.nome);
      if (temProp) {
        d.proprietario = d.proprietario || {};
        formWrap.append(el("h3", { class: "small", style: "margin:12px 0 6px" }, "Proprietário"), personFields(d.proprietario, "prop"));
      } else {
        formWrap.append(el("button", {
          class: "btn btn-sm", style: "margin-top:10px",
          onclick: () => { d._propInformado = true; redrawForm(); }
        }, "Informar proprietário"));
      }
      formWrap.append(
        el("h3", { class: "small", style: "margin:12px 0 6px" }, "Contrato de locação"),
        contratoFields(),
        el("h3", { class: "small", style: "margin:12px 0 6px" }, "Moradores fixos da unidade"),
        moradoresFixosEditor());
    } else if (d.status === "comercializacao") {
      const fm = field("Situação de comercialização", d.comercializacao || "alugar", {
        type: "select", options: [{ value: "alugar", nome: "Para alugar" }, { value: "vender", nome: "Para vender" }]
      });
      fm.input.addEventListener("change", () => { d.comercializacao = fm.input.value; });
      d.comercializacao = d.comercializacao || "alugar";
      formWrap.append(el("div", { class: "grid-2" }, fm.wrap));
    } else if (d.status === "disputa") {
      const fo = field("Observações (opcional)", d.obs || "", { type: "textarea", placeholder: "Nº do processo, vara, contato do advogado…" });
      fo.input.addEventListener("input", () => { d.obs = fo.input.value; });
      formWrap.append(fo.wrap);
    } else if (d.status === "vago") {
      formWrap.append(el("p", { class: "small muted" }, "Unidade desocupada, sem comercialização em curso."));
    } else {
      formWrap.append(el("p", { class: "small muted" }, "Escolha uma das opções acima para começar."));
    }
    if (d.status) formWrap.append(prumadasBlock());
  }
  redrawForm();

  const obra = obraAtivaDaUnidade(unitId);
  const obraInfo = obra ? el("div", { class: "banner banner-info", style: "margin-top:12px" },
    el("span", { html: hammerSVG(ETAPA_INFO[etapaDaObra(obra)].cor), style: "width:16px;height:16px;flex:none" }),
    el("span", {}, `Obra em andamento (${ETAPA_INFO[etapaDaObra(obra)].rotulo}) — período ${fmtDate(obra.dataInicio)} a ${fmtDate(obra.dataFim)}. Gerencie na aba Obras.`)) : null;

  body.append(head, statusWrap, formWrap, obraInfo,
    el("div", { class: "modal-actions" },
      d.status ? el("button", {
        class: "btn btn-danger", onclick: async () => {
          delete State.units[unitId]; await Store.saveUnit(unitId);
          closeModal(); renderAdmin("stacking"); toast("Cadastro da unidade removido.");
        }
      }, "Limpar cadastro") : null,
      el("button", { class: "btn", onclick: closeModal }, "Cancelar"),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          if (!d.status) { toast("Selecione um status para a unidade."); return; }
          if ((d.status === "proprietario" || d.status === "inquilino") && !(d.morador && d.morador.nome.trim())) {
            toast("Informe ao menos o nome do morador."); return;
          }
          delete d._propInformado;
          d.atualizadoEm = new Date().toISOString();
          State.units[unitId] = d;
          await Store.saveUnit(unitId);
          closeModal(); renderAdmin("stacking");
          toast(`Unidade ${u.numero} salva.`);
        }
      }, "Salvar unidade")));
  openModal(body);
}

/* ---------------- 6. Obras (admin) ---------------- */
function viewObras(root) {
  root.append(pageHead("Operação", "Obras do condomínio",
    "Gere links de comunicação de obra para os moradores, acompanhe as submissões e ajuste a etapa de cada obra — a cor do martelo no stacking plan acompanha a etapa."));

  const comp = cadastroCompleto();
  if (!comp.ok) {
    root.append(el("div", { class: "banner banner-warn" },
      `O botão “Informar obra” é liberado quando todos os moradores de todas as torres estiverem preenchidos (${comp.feitos} de ${comp.total} unidades até agora).`));
  } else {
    root.append(el("div", { class: "banner banner-info" },
      "Cadastro completo. Use “Informar obra” (no topo ou abaixo) para gerar o link do formulário e enviá-lo ao morador que fará a obra."));
  }

  const entries = Object.entries(State.obras).map(([id, o]) => ({ id, ...o }))
    .sort((a, b) => (b.criadaEm || "").localeCompare(a.criadaEm || ""));

  const rows = entries.map(o => {
    const u = o.unidade ? unitById(o.unidade) : null;
    const etapa = o.status === "submetida" && !o.encerrada ? etapaDaObra(o) : null;
    const statusPill = o.encerrada
      ? el("span", { class: "pill pill-muted" }, "Encerrada")
      : o.status === "submetida"
        ? el("span", { class: "pill pill-accent" }, "Submetida")
        : el("span", { class: "pill pill-warn" }, "Aguardando morador");

    const etapaSel = el("select", { title: "Etapa da obra (define a cor do martelo)" },
      [["auto", "Etapa automática (pelo prazo)"], ["inicio", "Início de obras"], ["meio", "Rumo à metade"], ["reta_final", "Reta final"], ["fim", "Final da obra"]]
        .map(([v, n]) => el("option", { value: v, selected: (o.progresso || "auto") === v }, n)));
    etapaSel.addEventListener("change", async () => {
      State.obras[o.id].progresso = etapaSel.value;
      await Store.saveObra(o.id); renderAdmin("obras");
    });

    return el("tr", {},
      el("td", { class: "mono" }, o.protocolo || o.id),
      el("td", {}, u ? unitLabel(u) : "—", el("div", { class: "small muted" }, o.morador || "")),
      el("td", {}, o.dataInicio ? `${fmtDate(o.dataInicio)} → ${fmtDate(o.dataFim)}` : "—"),
      el("td", {}, statusPill,
        etapa ? el("div", { class: "small", style: "display:flex;align-items:center;gap:5px;margin-top:4px" },
          el("span", { html: hammerSVG(ETAPA_INFO[etapa].cor), style: "width:13px;height:13px" }), ETAPA_INFO[etapa].rotulo) : null),
      el("td", {}, o.status === "submetida" && !o.encerrada ? etapaSel : null),
      el("td", { style: "white-space:nowrap" },
        o.status !== "submetida" ? el("button", { class: "btn btn-sm", onclick: () => showObraLink(o.id) }, "Ver link") : null,
        " ",
        o.status === "submetida" ? el("button", { class: "btn btn-sm", onclick: () => { location.hash = "#/documento/" + o.id; } }, "Documento") : null,
        " ",
        o.status === "submetida" && !o.encerrada ? el("button", {
          class: "btn btn-sm", onclick: async () => {
            State.obras[o.id].encerrada = true; await Store.saveObra(o.id); renderAdmin("obras"); toast("Obra encerrada — martelo removido do stacking plan.");
          }
        }, "Encerrar") : null,
        " ",
        el("button", {
          class: "btn btn-sm btn-danger", onclick: async () => {
            if (confirm("Excluir este registro de obra?")) { delete State.obras[o.id]; await Store.saveObra(o.id); renderAdmin("obras"); }
          }
        }, "Excluir")));
  });

  root.append(el("div", { class: "card" },
    el("div", { class: "card-title-row" },
      el("h3", {}, `Registros (${entries.length})`),
      comp.ok ? el("button", { class: "btn btn-accent btn-sm", onclick: criarLinkObra }, "Informar obra") : null),
    entries.length
      ? el("div", { class: "table-wrap" }, el("table", { class: "tbl" },
        el("thead", {}, el("tr", {}, ["Protocolo", "Unidade / morador", "Período", "Status", "Etapa", "Ações"].map(h => el("th", {}, h)))),
        el("tbody", {}, rows)))
      : el("p", { class: "small muted" }, "Nenhuma obra registrada ainda.")));
}

async function criarLinkObra() {
  const id = uid("ob");
  State.obras[id] = { criadaEm: new Date().toISOString(), status: "link", encerrada: false };
  await Store.saveObra(id);
  showObraLink(id);
}

function obraURL(id) {
  return location.href.split("#")[0] + "#/obra/" + id;
}

function showObraLink(id) {
  const url = obraURL(id);
  const input = el("input", { value: url, readonly: true, class: "mono", style: "width:100%", onclick: (e) => e.target.select() });
  const body = el("div", {},
    el("div", { class: "modal-head" },
      el("div", {}, el("h2", {}, "Link de comunicação de obra"),
        el("p", { class: "small muted" }, "Envie este link ao morador que fará a obra. Ele abre o formulário de comunicação, que volta preenchido para a administração.")),
      el("button", { class: "modal-close", onclick: closeModal }, "×")),
    el("div", { class: "field" }, el("label", {}, "Link do formulário"), input),
    State.mode === "local" ? el("div", { class: "banner banner-warn", style: "margin-top:10px" },
      "Nesta visualização (demonstração local) o link funciona apenas neste navegador. Na página publicada com dados compartilhados, qualquer pessoa com acesso à página preenche por este link.") : null,
    el("div", { class: "modal-actions" },
      el("button", {
        class: "btn", onclick: async () => {
          try { await navigator.clipboard.writeText(url); toast("Link copiado."); }
          catch (e) { input.select(); toast("Selecione e copie o link (Ctrl+C)."); }
        }
      }, "Copiar link"),
      el("button", { class: "btn btn-accent", onclick: () => { closeModal(); location.hash = "#/obra/" + id; } }, "Abrir formulário agora")));
  openModal(body);
}

/* ---------------- 7. Integração Axisgrid ---------------- */
function viewIntegracao(root) {
  root.append(pageHead("Dados", "Dados e exportação",
    "Tudo o que você cadastra fica organizado num formato padronizado, com identificadores estáveis de torres, unidades e obras. Daqui você exporta uma cópia completa — para backup ou para integrar a outros sistemas no futuro."));

  root.append(el("div", { class: "card" },
    el("h3", {}, "Contrato de dados"),
    el("dl", { class: "kv", style: "margin-top:10px" },
      el("dt", {}, "Esquema"), el("dd", { class: "mono" }, SCHEMA_VERSION),
      el("dt", {}, "ID de unidade"), el("dd", { class: "mono" }, "<torre>-<andar*100+final>  (ex.: T1-402)"),
      el("dt", {}, "Entidades"), el("dd", {}, "condominio · torres · prumadas · regrasAmbientes · prestadores · concessionarias · areasComuns · elevadores · unidades (ocupação, contrato, moradores fixos, prumadas atualizadas) · obras"),
      el("dt", {}, "Armazenamento"), el("dd", {},
        State.mode === "db" ? "Banco compartilhado desta página (quem tem acesso vê os mesmos dados)"
          : State.mode === "api" ? "Servidor local desta máquina — arquivo data/db.json do projeto"
            : "Neste navegador (modo demonstração)"))));

  root.append(el("div", { class: "card" },
    el("h3", {}, "Exportar uma cópia completa"),
    el("p", { class: "small muted", style: "margin:4px 0 12px" }, "Gera um arquivo com tudo o que está cadastrado — condomínio, unidades, moradores e obras."),
    el("div", { style: "display:flex;gap:10px;flex-wrap:wrap" },
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          const json = JSON.stringify(AxisgridAdapter.exportSnapshot(), null, 2);
          const dls = await (window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null));
          if (dls) {
            try { await dls.save({ filename: "domnex-dados.json", data: json }); toast("Cópia dos dados salva!"); }
            catch (e) { if (e && e.code !== "declined") toast("Não foi possível salvar o arquivo aqui — use “Copiar JSON”."); }
          } else {
            try { await navigator.clipboard.writeText(json); toast("Download indisponível nesta visualização — JSON copiado para a área de transferência."); }
            catch (e) { toast("Não foi possível exportar nesta visualização."); }
          }
        }
      }, "Baixar snapshot (.json)"),
      el("button", {
        class: "btn", onclick: async () => {
          try { await navigator.clipboard.writeText(JSON.stringify(AxisgridAdapter.exportSnapshot(), null, 2)); toast("JSON copiado."); }
          catch (e) { toast("Não foi possível copiar."); }
        }
      }, "Copiar JSON"))));

  root.append(el("div", { class: "card" },
    el("h3", {}, "Dados desta instância"),
    el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-top:10px" },
      el("button", {
        class: "btn", onclick: async () => {
          if (confirm("Carregar o condomínio de exemplo? Os dados atuais serão substituídos.")) {
            await loadSample(); renderAdmin("stacking"); toast("Exemplo carregado.");
          }
        }
      }, "Carregar condomínio de exemplo"),
      el("button", {
        class: "btn btn-danger", onclick: async () => {
          if (confirm("Apagar TODOS os dados (condomínio, unidades e obras)? Esta ação não pode ser desfeita.")) {
            await Store.wipeAll(); renderAdmin("condominio"); toast("Dados apagados. Comece pelo cadastro do condomínio.");
          }
        }
      }, "Apagar todos os dados"))));
}
