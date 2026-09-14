/* ================================================================
   Axisgrid Obras — formulário do morador, cronograma, documento
   ================================================================ */

const OBRA_STEPS = ["Identificação", "Abrangência", "Escopo", "Prazos", "Ruído de alto impacto", "Prestadores", "Revisão e assinatura"];

function renderObraForm(obraId) {
  $("#admin-shell").hidden = true;
  $("#doc-shell").hidden = true;
  const shell = $("#obra-shell");
  shell.hidden = false;
  shell.innerHTML = "";

  const obra = State.obras[obraId];
  const inner = el("div", { class: "obra-inner" });
  shell.append(inner);

  if (!obra) {
    inner.append(el("div", { class: "card" },
      el("h2", {}, "Link não encontrado"),
      el("p", { class: "muted", style: "margin-top:6px" }, "Este link de comunicação de obra não existe ou foi removido. Confirme o endereço com a administração do condomínio.")));
    return;
  }
  if (obra.status === "submetida") {
    inner.append(el("div", { class: "card" },
      el("h2", {}, "Comunicação já submetida"),
      el("p", { class: "muted", style: "margin-top:6px" }, `Esta comunicação de obra foi assinada e submetida em ${fmtDate((obra.assinatura || {}).assinadoEm)} sob o protocolo ${obra.protocolo || "—"}.`),
      el("div", { class: "modal-actions" },
        el("button", { class: "btn btn-accent", onclick: () => { location.hash = "#/documento/" + obraId; } }, "Ver documento"))));
    return;
  }

  /* rascunho de trabalho */
  const draft = JSON.parse(JSON.stringify(obra));
  draft.morador = draft.morador || "";
  draft.unidade = draft.unidade || "";
  draft.ambientes = draft.ambientes || [];
  draft.escopo = draft.escopo || [];
  draft.estrutural = draft.estrutural || { possui: false, descricao: "" };
  draft.ruido = draft.ruido || [];
  draft.folgaDias = draft.folgaDias != null ? draft.folgaDias : 0;
  draft.prestadores = draft.prestadores || [];
  let step = draft._step || 0;

  const condoNome = (State.config.condominio || {}).nome || "Condomínio";

  async function saveDraft() {
    draft.status = "rascunho";
    draft._step = step;
    State.obras[obraId] = JSON.parse(JSON.stringify(draft));
    await Store.saveObra(obraId);
  }

  function render() {
    inner.innerHTML = "";
    inner.append(
      el("div", {},
        el("div", { class: "eyebrow", style: "font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--accent);font-weight:600" }, condoNome),
        el("h1", {}, "Comunicação de obra"),
        el("p", { class: "muted", style: "margin-top:4px;max-width:60ch" },
          "Preencha as etapas abaixo. Ao final, você revisará tudo, assinará digitalmente com um token enviado ao seu e-mail e receberá o documento em PDF.")),
      el("div", { class: "stepper" }, OBRA_STEPS.map((s, i) =>
        el("span", { class: "st" + (i === step ? " cur" : i < step ? " ok" : "") }, `${i + 1}. ${s}`))));

    const stepFns = [stepIdent, stepAbrang, stepEscopo, stepPrazos, stepRuido, stepPrest, stepRevisao];
    stepFns[step]();
  }

  function nav(opts) {
    opts = opts || {};
    return el("div", { class: "wizard-nav" },
      step > 0 ? el("button", { class: "btn", onclick: async () => { step--; await saveDraft(); render(); } }, "← Voltar") : el("span", {}),
      el("button", {
        class: "btn btn-accent", onclick: async () => {
          if (opts.validate && !opts.validate()) return;
          step++; await saveDraft(); render(); window.scrollTo(0, 0);
        }
      }, step === OBRA_STEPS.length - 2 ? "Revisar tudo →" : "Salvar e continuar →"));
  }

  /* ---- Etapa 1: identificação ---- */
  function stepIdent() {
    const card = el("div", { class: "card" });
    const fNome = field("Nome do morador", draft.morador, { hint: "Usado para conferir e manter o cadastro do condomínio atualizado." });
    fNome.input.addEventListener("input", () => { draft.morador = fNome.input.value; checkNome(); });

    const torres = State.config.torres;
    const selTorre = el("select", {}, el("option", { value: "" }, "Torre…"), torres.map(t => el("option", { value: t.id }, t.nome || t.id)));
    const selAndar = el("select", {}, el("option", { value: "" }, "Andar…"));
    const selUnid = el("select", {}, el("option", { value: "" }, "Unidade…"));

    const cur = draft.unidade ? unitById(draft.unidade) : null;
    function fillAndares() {
      const t = torres.find(x => x.id === selTorre.value);
      selAndar.innerHTML = ""; selAndar.append(el("option", { value: "" }, "Andar…"));
      if (t) for (let a = 1; a <= t.andares; a++) selAndar.append(el("option", { value: a }, a + "º andar"));
    }
    function fillUnidades() {
      const t = torres.find(x => x.id === selTorre.value);
      selUnid.innerHTML = ""; selUnid.append(el("option", { value: "" }, "Unidade…"));
      if (!t || !selAndar.value) return;
      const andar = +selAndar.value;
      const atip = (t.andaresAtipicos || []).find(x => x.andar === andar);
      const qtd = atip ? atip.unidades : t.unidadesPorAndar;
      for (let f = 1; f <= qtd; f++) {
        const numero = andar * 100 + f;
        selUnid.append(el("option", { value: `${t.id}-${numero}` }, "Unidade " + numero));
      }
    }
    if (cur) { selTorre.value = cur.torreId; fillAndares(); selAndar.value = cur.andar; fillUnidades(); selUnid.value = cur.id; }
    selTorre.addEventListener("change", () => { fillAndares(); fillUnidades(); draft.unidade = ""; });
    selAndar.addEventListener("change", () => { fillUnidades(); draft.unidade = ""; });
    selUnid.addEventListener("change", () => { draft.unidade = selUnid.value; checkNome(); });

    const aviso = el("div", {});
    function checkNome() {
      aviso.innerHTML = "";
      if (!draft.unidade) return;
      const reg = State.units[draft.unidade];
      const cadastrado = reg && reg.morador && reg.morador.nome;
      if (cadastrado && draft.morador && cadastrado.trim().toLowerCase() !== draft.morador.trim().toLowerCase()) {
        aviso.append(el("div", { class: "banner banner-warn", style: "margin-top:10px" },
          `O cadastro do condomínio registra “${cadastrado}” como morador desta unidade. Se o nome mudou, a administração atualizará o cadastro com o nome informado aqui.`));
      } else if (cadastrado) {
        aviso.append(el("div", { class: "banner banner-info", style: "margin-top:10px" }, "Nome confere com o cadastro do condomínio."));
      }
    }
    checkNome();

    card.append(fNome.wrap,
      el("div", { class: "field", style: "margin-top:12px" },
        el("label", {}, "Unidade (torre / andar / unidade)"),
        el("div", { class: "grid-3" }, selTorre, selAndar, selUnid)),
      aviso);
    inner.append(card, nav({
      validate: () => {
        if (!draft.morador.trim()) { toast("Informe o nome do morador."); return false; }
        if (!draft.unidade) { toast("Selecione torre, andar e unidade."); return false; }
        return true;
      }
    }));
  }

  /* ---- Etapa 2: abrangência ---- */
  function stepAbrang() {
    const u = unitById(draft.unidade);
    const amb = ambientesDaUnidade(u);
    const card = el("div", { class: "card" },
      el("h3", {}, "Abrangência da reforma"),
      el("p", { class: "small muted", style: "margin:4px 0 10px" },
        `Selecione os ambientes de ${unitLabel(u)} que serão reformados (${amb.origem}).`));
    if (!amb.lista.length) {
      card.append(el("div", { class: "banner banner-warn" }, "A administração ainda não cadastrou os ambientes desta tipologia. Entre em contato com o condomínio."));
    }
    const chips = el("div", { class: "chips" });
    amb.lista.forEach(a => {
      const on = draft.ambientes.includes(a);
      chips.append(el("button", {
        class: "chip" + (on ? " on" : ""), onclick: (e) => {
          e.preventDefault();
          const ix = draft.ambientes.indexOf(a);
          if (ix >= 0) draft.ambientes.splice(ix, 1); else draft.ambientes.push(a);
          // remove ambientes desmarcados do escopo
          draft.escopo.forEach(s => { s.ambientes = (s.ambientes || []).filter(x => draft.ambientes.includes(x)); });
          e.target.classList.toggle("on");
        }
      }, a));
    });
    card.append(chips);
    inner.append(card, nav({ validate: () => { if (!draft.ambientes.length) { toast("Selecione ao menos um ambiente."); return false; } return true; } }));
  }

  /* ---- Etapa 3: escopo ---- */
  function stepEscopo() {
    const listWrap = el("div", {});
    const sugestoes = ["Demolição", "Remoção do piso", "Troca de rejunte", "Pintura", "Instalação de ar-condicionado", "Elétrica", "Hidráulica", "Marcenaria", "Gesso / forro"];

    const redraw = () => {
      listWrap.innerHTML = "";
      draft.escopo.forEach((s, i) => {
        const fs = field("O que será feito", s.servico, { placeholder: "Ex.: Demolição" });
        fs.input.setAttribute("list", "sug-servicos");
        fs.input.addEventListener("input", () => { s.servico = fs.input.value; });
        const fd = field("Detalhes (opcional)", s.descricao || "", { type: "textarea", placeholder: "Descreva o serviço…" });
        fd.input.addEventListener("input", () => { s.descricao = fd.input.value; });
        const chips = el("div", { class: "chips" });
        draft.ambientes.forEach(a => {
          const on = (s.ambientes || []).includes(a);
          chips.append(el("button", {
            class: "chip" + (on ? " on" : ""), onclick: (e) => {
              e.preventDefault(); s.ambientes = s.ambientes || [];
              const ix = s.ambientes.indexOf(a);
              if (ix >= 0) s.ambientes.splice(ix, 1); else s.ambientes.push(a);
              e.target.classList.toggle("on");
            }
          }, a));
        });
        listWrap.append(el("div", { class: "escopo-item" },
          el("div", { class: "item-head" },
            el("strong", { class: "small" }, "Serviço " + (i + 1)),
            el("button", { class: "btn btn-sm btn-danger", onclick: () => { draft.escopo.splice(i, 1); redraw(); } }, "Remover")),
          fs.wrap,
          el("p", { class: "small muted", style: "margin:8px 0 4px" }, "Em quais ambientes:"),
          chips,
          el("div", { style: "margin-top:8px" }, fd.wrap)));
      });
    };
    redraw();

    const estr = draft.estrutural;
    const chk = el("input", { type: "checkbox", checked: estr.possui });
    const fDesc = field("Descreva a interferência estrutural", estr.descricao, { type: "textarea", placeholder: "Ex.: abertura de vão em parede estrutural, corte de laje…" });
    fDesc.wrap.hidden = !estr.possui;
    fDesc.input.addEventListener("input", () => { estr.descricao = fDesc.input.value; });
    chk.addEventListener("change", () => { estr.possui = chk.checked; fDesc.wrap.hidden = !estr.possui; });

    inner.append(
      el("div", { class: "card" },
        el("div", { class: "card-title-row" },
          el("h3", {}, "Escopo da reforma"),
          el("button", { class: "btn btn-sm", onclick: () => { draft.escopo.push({ id: uid("sc"), servico: "", ambientes: [], descricao: "" }); redraw(); } }, "+ Adicionar serviço")),
        el("p", { class: "small muted", style: "margin-bottom:10px" }, "O que será feito e em quais ambientes. Ex.: Demolição → cozinha e área de serviço; Remoção do piso → sala e quartos."),
        el("datalist", { id: "sug-servicos" }, sugestoes.map(s => el("option", { value: s }))),
        listWrap),
      el("div", { class: "estrutural-box", style: "margin-top:14px" },
        el("h3", {}, "⚠ Interferência na estrutura"),
        el("p", { class: "small", style: "margin:6px 0 10px" },
          "Alguma etapa interfere na estrutura do apartamento ou do edifício? Marque aqui — o condomínio precisa de tempo extra para avaliar este tipo de intervenção antes do início da obra."),
        el("label", { class: "check" }, chk, "Sim, esta reforma interfere na estrutura"),
        el("div", { style: "margin-top:10px" }, fDesc.wrap)),
      nav({
        validate: () => {
          const validos = draft.escopo.filter(s => s.servico.trim());
          if (!validos.length) { toast("Adicione ao menos um serviço ao escopo."); return false; }
          if (validos.some(s => !(s.ambientes || []).length)) { toast("Associe cada serviço a pelo menos um ambiente."); return false; }
          if (estr.possui && !estr.descricao.trim()) { toast("Descreva a interferência estrutural."); return false; }
          draft.escopo = validos;
          return true;
        }
      }));
  }

  /* ---- Etapa 4: prazos ---- */
  function stepPrazos() {
    const fi = field("Início da obra", draft.dataInicio || "", { type: "date" });
    const ff = field("Término previsto da obra", draft.dataFim || "", { type: "date", hint: "Duração da obra como um todo. Ex.: até 30 de setembro." });
    fi.input.addEventListener("change", () => { draft.dataInicio = fi.input.value; });
    ff.input.addEventListener("change", () => { draft.dataFim = ff.input.value; });
    inner.append(el("div", { class: "card" },
      el("h3", {}, "Duração da obra como um todo"),
      el("p", { class: "small muted", style: "margin:4px 0 12px" }, "O período total serve de moldura para o cronograma de ruído da próxima etapa e para a liberação dos prestadores na portaria."),
      el("div", { class: "grid-2" }, fi.wrap, ff.wrap)),
      nav({
        validate: () => {
          if (!draft.dataInicio || !draft.dataFim) { toast("Informe início e término da obra."); return false; }
          if (diffDays(draft.dataInicio, draft.dataFim) < 0) { toast("O término deve ser depois do início."); return false; }
          return true;
        }
      }));
  }

  /* ---- Etapa 5: ruído ---- */
  function stepRuido() {
    const listWrap = el("div", {});
    const redraw = () => {
      listWrap.innerHTML = "";
      draft.ruido.forEach((r, i) => {
        const fe = field("Etapa geradora de ruído", r.etapa, { placeholder: "Ex.: Demolição — Cozinha" });
        fe.input.setAttribute("list", "sug-etapas");
        const fi = field("Do dia", r.inicio || "", { type: "date" });
        const ff = field("Até o dia", r.fim || "", { type: "date" });
        fe.input.addEventListener("input", () => { r.etapa = fe.input.value; });
        fi.input.addEventListener("change", () => { r.inicio = fi.input.value; });
        ff.input.addEventListener("change", () => { r.fim = ff.input.value; });
        listWrap.append(el("div", { class: "ruido-item" },
          el("div", { class: "item-head" },
            el("strong", { class: "small" }, "Etapa " + (i + 1)),
            el("button", { class: "btn btn-sm btn-danger", onclick: () => { draft.ruido.splice(i, 1); redraw(); } }, "Remover")),
          fe.wrap,
          el("div", { class: "grid-2", style: "margin-top:8px" }, fi.wrap, ff.wrap)));
      });
    };
    redraw();

    const sugestoesEtapas = [];
    draft.escopo.forEach(s => (s.ambientes || []).forEach(a => sugestoesEtapas.push(`${s.servico} — ${a}`)));

    const ffol = field("Folga para atrasos (dias úteis, até 3)", draft.folgaDias, { type: "number", min: 0, max: 3, hint: "Dias úteis extras ao fim de cada etapa, para o caso de atrasos." });
    ffol.input.addEventListener("change", () => { draft.folgaDias = Math.max(0, Math.min(3, +ffol.input.value || 0)); ffol.input.value = draft.folgaDias; });

    const chkConf = el("input", { type: "checkbox", checked: !!draft.ruidoConfirmado });
    chkConf.addEventListener("change", () => { draft.ruidoConfirmado = chkConf.checked; });

    inner.append(
      el("div", { class: "card" },
        el("div", { class: "card-title-row" },
          el("h3", {}, "Ruído de alto impacto — por etapa"),
          el("button", { class: "btn btn-sm", onclick: () => { draft.ruido.push({ id: uid("rd"), etapa: "", inicio: draft.dataInicio, fim: draft.dataInicio }); redraw(); } }, "+ Adicionar etapa")),
        el("p", { class: "small muted", style: "margin-bottom:10px" },
          `Informe a duração de cada etapa geradora de ruído de alto impacto, dentro do período da obra (${fmtDate(draft.dataInicio)} a ${fmtDate(draft.dataFim)}). Ex.: Demolição — Cozinha: do dia 1 ao 4.`),
        el("datalist", { id: "sug-etapas" }, sugestoesEtapas.map(s => el("option", { value: s }))),
        listWrap,
        el("div", { class: "grid-2", style: "margin-top:12px" }, ffol.wrap)),
      el("div", { class: "banner banner-warn", style: "margin-top:14px" },
        el("label", { class: "check", style: "align-items:flex-start" }, chkConf,
          el("span", {}, el("strong", {}, "Revisei e confirmo as datas das etapas de ruído."),
            " Estas datas só podem ser alteradas até o dia da submissão da ART. Após a submissão, valem as datas confirmadas aqui (mais a folga informada)."))),
      nav({
        validate: () => {
          const validas = draft.ruido.filter(r => r.etapa.trim() && r.inicio && r.fim);
          if (!validas.length) { toast("Cadastre ao menos uma etapa de ruído (ou informe a etapa única da obra)."); return false; }
          for (const r of validas) {
            if (diffDays(r.inicio, r.fim) < 0) { toast(`Na etapa “${r.etapa}”, o fim vem antes do início.`); return false; }
            if (diffDays(draft.dataInicio, r.inicio) < 0 || diffDays(r.fim, draft.dataFim) < 0) {
              toast(`A etapa “${r.etapa}” está fora do período da obra.`); return false;
            }
          }
          if (!draft.ruidoConfirmado) { toast("Confirme as datas das etapas de ruído para continuar."); return false; }
          draft.ruido = validas;
          return true;
        }
      }));
  }

  /* ---- Etapa 6: prestadores ---- */
  function stepPrest() {
    const listWrap = el("div", {});
    const redraw = () => {
      listWrap.innerHTML = "";
      draft.prestadores.forEach((p, i) => {
        const fsv = field("Serviços que executa", p.servicos || "", { placeholder: "Ex.: Demolição e remoção do piso" });
        const fem = field("Empresa / prestador", p.empresa || "", { placeholder: "Ex.: Empreiteira XPTO" });
        const frt = field("Responsável técnico", p.responsavel || "", { placeholder: "Nome do responsável" });
        const fdr = field("Documento do responsável (RG/CPF/CREA)", p.documentoResp || "");
        fsv.input.addEventListener("input", () => { p.servicos = fsv.input.value; });
        fem.input.addEventListener("input", () => { p.empresa = fem.input.value; });
        frt.input.addEventListener("input", () => { p.responsavel = frt.input.value; });
        fdr.input.addEventListener("input", () => { p.documentoResp = fdr.input.value; });

        const equipeWrap = el("div", {});
        const redrawEquipe = () => {
          equipeWrap.innerHTML = "";
          (p.equipe || []).forEach((m, j) => {
            const fn = field("Nome do prestador", m.nome || "");
            const fd = field("RG ou CPF", m.doc || "");
            fn.input.addEventListener("input", () => { m.nome = fn.input.value; });
            fd.input.addEventListener("input", () => { m.doc = fd.input.value; });
            equipeWrap.append(el("div", { class: "grid-2", style: "margin-top:6px;align-items:end" }, fn.wrap,
              el("div", { style: "display:flex;gap:8px;align-items:flex-end" }, fd.wrap,
                el("button", { class: "btn btn-sm btn-danger", style: "margin-bottom:2px", onclick: () => { p.equipe.splice(j, 1); redrawEquipe(); } }, "×"))));
          });
        };
        redrawEquipe();

        listWrap.append(el("div", { class: "prestador-item" },
          el("div", { class: "item-head" },
            el("strong", { class: "small" }, p.empresa || "Prestador " + (i + 1)),
            el("button", { class: "btn btn-sm btn-danger", onclick: () => { draft.prestadores.splice(i, 1); redraw(); } }, "Remover")),
          el("div", { class: "grid-2" }, fsv.wrap, fem.wrap),
          el("div", { class: "grid-2", style: "margin-top:8px" }, frt.wrap, fdr.wrap),
          el("p", { class: "small muted", style: "margin:10px 0 2px" }, "Equipe (cada pessoa que entrará no condomínio):"),
          equipeWrap,
          el("button", { class: "btn btn-sm btn-ghost", style: "margin-top:8px", onclick: () => { p.equipe = p.equipe || []; p.equipe.push({ nome: "", doc: "" }); redrawEquipe(); } }, "+ Adicionar pessoa")));
      });
    };
    redraw();

    inner.append(el("div", { class: "card" },
      el("div", { class: "card-title-row" },
        el("h3", {}, "Prestadores de serviço e responsáveis técnicos"),
        el("button", { class: "btn btn-sm", onclick: () => { draft.prestadores.push({ id: uid("pv"), servicos: "", empresa: "", responsavel: "", documentoResp: "", equipe: [] }); redraw(); } }, "+ Adicionar prestador")),
      el("p", { class: "small muted", style: "margin-bottom:10px" },
        "Um cadastro por empresa/prestador, por tipo de serviço. Ex.: Demolição e remoção do piso → Empreiteira XPTO; Ar-condicionado → FrigoAr; Pintura → Miro. Com o cronograma por escopo, a portaria já libera cada equipe no período correto."),
      listWrap),
      nav({
        validate: () => {
          const validos = draft.prestadores.filter(p => (p.empresa || "").trim());
          if (!validos.length) { toast("Cadastre ao menos um prestador de serviço."); return false; }
          for (const p of validos) {
            if (!(p.equipe || []).some(m => (m.nome || "").trim() && (m.doc || "").trim())) {
              toast(`Informe nome e documento de ao menos uma pessoa da equipe de “${p.empresa}”.`); return false;
            }
            p.equipe = p.equipe.filter(m => (m.nome || "").trim());
          }
          draft.prestadores = validos;
          return true;
        }
      }));
  }

  /* ---- Etapa 7: revisão e assinatura ---- */
  function stepRevisao() {
    inner.append(
      el("div", { class: "banner banner-info" }, "Revise o documento abaixo. Ao assinar digitalmente, você receberá um token por e-mail para confirmar a submissão ao condomínio."),
      el("div", { class: "card", style: "margin-top:14px" }, buildDocumento(draft, obraId, { preview: true })),
      el("div", { class: "wizard-nav" },
        el("button", { class: "btn", onclick: async () => { step--; await saveDraft(); render(); } }, "← Voltar e ajustar"),
        el("button", { class: "btn btn-accent", onclick: () => fluxoAssinatura() }, "Assinar digitalmente e submeter")));
  }

  function fluxoAssinatura() {
    const token = String(Math.floor(100000 + Math.random() * 900000));
    const reg = State.units[draft.unidade];
    const emailMorador = (reg && reg.morador && reg.morador.email) || "seu e-mail cadastrado";

    const fTok = el("input", { class: "mono", placeholder: "······", maxlength: "6", inputmode: "numeric", style: "font-size:20px;letter-spacing:.3em;text-align:center;width:100%;padding:8px;border:1px solid var(--line-strong);border-radius:6px;background:var(--bg)" });
    const erro = el("p", { class: "small", style: "color:var(--danger);margin-top:6px", hidden: true }, "Token incorreto. Confira o número recebido por e-mail.");

    const body = el("div", {},
      el("div", { class: "modal-head" },
        el("div", {}, el("h2", {}, "Assinatura digital"),
          el("p", { class: "small muted" }, "Um push com o token de assinatura foi enviado para " + emailMorador + ".")),
        el("button", { class: "modal-close", onclick: closeModal }, "×")),
      el("div", { class: "mail-card" },
        el("div", { class: "mail-meta" }, "✉ Simulação de e-mail — neste protótipo o token aparece aqui; em produção (Axisgrid), ele chega só na caixa de entrada do morador."),
        el("p", {}, el("strong", {}, condoNome), " — token para assinatura da comunicação de obra:"),
        el("div", { class: "token-big" }, token)),
      el("div", { class: "field" },
        el("label", {}, "Assinatura digital — digite o token recebido"), fTok, erro),
      el("div", { class: "modal-actions" },
        el("button", { class: "btn", onclick: closeModal }, "Cancelar"),
        el("button", {
          class: "btn btn-accent", onclick: async () => {
            if (fTok.value.trim() !== token) { erro.hidden = false; return; }
            draft.status = "submetida";
            draft.assinatura = { token, assinadoEm: todayISO(), nome: draft.morador };
            const n = Object.values(State.obras).filter(o => o.protocolo).length + 1;
            draft.protocolo = `OBR-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
            delete draft._step;
            // atualiza nome do morador no cadastro, se divergente
            const regU = State.units[draft.unidade];
            if (regU && regU.morador && draft.morador && regU.morador.nome !== draft.morador) {
              regU.morador.nome = draft.morador;
              await Store.saveUnit(draft.unidade);
            }
            State.obras[obraId] = JSON.parse(JSON.stringify(draft));
            await Store.saveObra(obraId);
            closeModal();
            const okBody = el("div", {},
              el("div", { class: "modal-head" },
                el("div", {}, el("h2", {}, "Comunicação submetida ✓"),
                  el("p", { class: "small muted" }, `Protocolo ${draft.protocolo} · assinada em ${fmtDate(draft.assinatura.assinadoEm)}.`)),
                el("button", { class: "modal-close", onclick: () => { closeModal(); location.hash = "#/documento/" + obraId; } }, "×")),
              el("p", { class: "small" }, "Uma cópia do formulário em PDF foi enviada para " + emailMorador + ". Neste protótipo, use “Ver documento” e imprima/salve em PDF pelo navegador."),
              el("div", { class: "modal-actions" },
                el("button", { class: "btn btn-accent", onclick: () => { closeModal(); location.hash = "#/documento/" + obraId; } }, "Ver documento (PDF)")));
            openModal(okBody, { locked: true });
          }
        }, "Submeter")));
    openModal(body, { locked: true });
  }

  render();
}

/* ================= cronograma ilustrado (gantt) ================= */
function buildGantt(obra) {
  if (!obra.dataInicio || !obra.dataFim) return el("p", { class: "small muted" }, "Sem período definido.");
  const dias = diffDays(obra.dataInicio, obra.dataFim) + 1;
  const axis = el("div", { class: "gantt-axis" }, el("div", { class: "glabel-spacer" }));
  for (let i = 0; i < dias; i++) {
    const d = parseISO(addDays(obra.dataInicio, i));
    axis.append(el("div", { class: "gcell" }, (d.getDate() === 1 || i === 0) ? `${d.getDate()}/${d.getMonth() + 1}` : String(d.getDate())));
  }
  const rows = [];
  const mkRow = (label, sub, bars) => {
    const track = el("div", { class: "gantt-track", style: "--gdays:" + dias });
    for (const b of bars) {
      const left = (100 * b.start / dias), width = (100 * b.len / dias);
      track.append(el("div", { class: "gantt-bar " + b.cls, style: `left:${left}%;width:${width}%`, title: b.title || "" }, b.txt || ""));
    }
    return el("div", { class: "gantt-row" },
      el("div", { class: "glabel" }, label, sub ? el("small", {}, sub) : null), track);
  };
  rows.push(mkRow("Obra completa", `${fmtDate(obra.dataInicio)} → ${fmtDate(obra.dataFim)}`,
    [{ start: 0, len: dias, cls: "total", txt: dias + " dias", title: "Período total da obra" }]));
  for (const r of (obra.ruido || [])) {
    const start = diffDays(obra.dataInicio, r.inicio);
    const len = diffDays(r.inicio, r.fim) + 1;
    const bars = [{ start, len, cls: "ruido", title: `${r.etapa}: ${fmtDate(r.inicio)} a ${fmtDate(r.fim)}` }];
    if (obra.folgaDias > 0) {
      const folgaFim = addBusinessDays(r.fim, obra.folgaDias);
      const flen = Math.min(diffDays(r.fim, folgaFim), dias - (start + len));
      if (flen > 0) bars.push({ start: start + len, len: flen, cls: "folga", title: `Folga de ${obra.folgaDias} dia(s) útil(eis) para atrasos` });
    }
    rows.push(mkRow(r.etapa, `${fmtDate(r.inicio)} → ${fmtDate(r.fim)}`, bars));
  }
  return el("div", { class: "gantt" }, el("div", { class: "gantt-scroll" }, el("div", { class: "gantt-inner" }, axis, rows)));
}

/* ================= documento ================= */
function buildDocumento(obra, obraId, opts) {
  opts = opts || {};
  const c = State.config.condominio || {};
  const u = obra.unidade ? unitById(obra.unidade) : null;
  const reg = obra.unidade ? State.units[obra.unidade] : null;

  const kv = (pairs) => el("dl", { class: "kv" }, pairs.map(([k, v]) => [el("dt", {}, k), el("dd", {}, v || "—")]));

  const doc = el("div", { class: "doc-paper" });
  doc.append(el("header", { class: "doc-head" },
    el("div", {},
      el("h2", { class: "doc-title" }, "Comunicação de Obra"),
      el("p", { class: "small muted" }, c.nome || "Condomínio", c.endereco ? ` · ${c.endereco}, ${c.cidade || ""}${c.uf ? "/" + c.uf : ""}` : "")),
    el("div", { style: "text-align:right" },
      el("div", { class: "mono", style: "font-weight:600" }, obra.protocolo || "PRÉVIA — não submetida"),
      el("div", { class: "small muted" }, "Emitido em " + fmtDate(todayISO())))));

  doc.append(el("section", { class: "doc-sec" }, el("h3", {}, "1 · Identificação"),
    kv([
      ["Morador", obra.morador],
      ["Unidade", u ? unitLabel(u) + ` (${u.andar}º andar, final ${u.final})` : "—"],
      ["Vínculo", reg ? (STATUS_INFO[reg.status] || {}).rotulo : "—"],
      ["Contato", reg && reg.morador ? [reg.morador.telefone, reg.morador.email].filter(Boolean).join(" · ") : "—"],
    ])));

  doc.append(el("section", { class: "doc-sec" }, el("h3", {}, "2 · Abrangência"),
    el("div", { class: "chips" }, (obra.ambientes || []).map(a => el("span", { class: "chip static" }, a)))));

  doc.append(el("section", { class: "doc-sec" }, el("h3", {}, "3 · Escopo da reforma"),
    el("div", { class: "table-wrap" }, el("table", { class: "tbl" },
      el("thead", {}, el("tr", {}, ["Serviço", "Ambientes", "Detalhes"].map(h => el("th", {}, h)))),
      el("tbody", {}, (obra.escopo || []).map(s => el("tr", {},
        el("td", {}, el("strong", {}, s.servico)),
        el("td", {}, (s.ambientes || []).join(", ")),
        el("td", { class: "small" }, s.descricao || "—"))))))));

  if (obra.estrutural && obra.estrutural.possui) {
    doc.append(el("section", { class: "doc-sec" },
      el("div", { class: "estrutural-box" },
        el("h3", {}, "⚠ Interferência estrutural declarada"),
        el("p", { class: "small", style: "margin-top:6px" }, obra.estrutural.descricao),
        el("p", { class: "small", style: "margin-top:6px" }, el("strong", {}, "Atenção do condomínio: "), "esta obra exige avaliação técnica prévia antes da liberação."))));
  }

  doc.append(el("section", { class: "doc-sec" }, el("h3", {}, "4 · Cronograma ilustrado"),
    buildGantt(obra),
    el("p", { class: "small muted", style: "margin-top:6px" },
      `Período total: ${fmtDate(obra.dataInicio)} a ${fmtDate(obra.dataFim)}. Etapas em laranja: ruído de alto impacto (datas confirmadas pelo morador${obra.folgaDias ? `; tracejado: folga de até ${obra.folgaDias} dia(s) útil(eis)` : ""}). Alterações apenas até a submissão da ART.`)));

  doc.append(el("section", { class: "doc-sec" }, el("h3", {}, "5 · Prestadores de serviço"),
    el("div", { class: "table-wrap" }, el("table", { class: "tbl" },
      el("thead", {}, el("tr", {}, ["Serviços", "Empresa / prestador", "Responsável técnico", "Equipe (nome · documento)"].map(h => el("th", {}, h)))),
      el("tbody", {}, (obra.prestadores || []).map(p => el("tr", {},
        el("td", {}, p.servicos),
        el("td", {}, el("strong", {}, p.empresa)),
        el("td", { class: "small" }, [p.responsavel, p.documentoResp].filter(Boolean).join(" · ")),
        el("td", { class: "small" }, (p.equipe || []).map(m => el("div", {}, `${m.nome} · ${m.doc}`)))))))),
    el("p", { class: "small muted", style: "margin-top:6px" }, "As equipes acima ficam pré-autorizadas na portaria dentro do período da obra, conforme o cronograma por escopo.")));

  doc.append(el("div", { class: "sig-block" },
    el("div", {},
      el("div", { class: "small muted" }, "Assinatura digital"),
      obra.assinatura
        ? el("div", {}, el("strong", {}, obra.assinatura.nome), el("div", { class: "small" }, `Token ${obra.assinatura.token} · ${fmtDate(obra.assinatura.assinadoEm)}`))
        : el("div", { class: "muted" }, "Pendente — assinada na submissão")),
    el("div", { style: "text-align:right" },
      el("div", { class: "small muted" }, "Protocolo"),
      el("div", { class: "mono", style: "font-weight:600" }, obra.protocolo || "—"))));

  return doc;
}

function renderDocumento(obraId) {
  $("#admin-shell").hidden = true;
  $("#obra-shell").hidden = true;
  const shell = $("#doc-shell");
  shell.hidden = false;
  shell.innerHTML = "";
  const obra = State.obras[obraId];
  const inner = el("div", { class: "doc-inner" });
  shell.append(inner);
  if (!obra) {
    inner.append(el("div", { class: "card" }, el("h2", {}, "Documento não encontrado")));
    return;
  }
  inner.append(
    el("div", { class: "doc-toolbar" },
      el("button", { class: "btn", onclick: () => { history.length > 1 ? history.back() : location.hash = "#/admin/obras"; } }, "← Voltar"),
      el("div", { style: "display:flex;gap:10px" },
        el("button", { class: "btn btn-accent", onclick: () => window.print() }, "Imprimir / Salvar em PDF"))),
    buildDocumento(obra, obraId));
}

/* ================= roteador e boot ================= */
function route() {
  closeModal();
  const h = location.hash || "";
  let m;
  if ((m = h.match(/^#\/obra\/([\w-]+)/))) return renderObraForm(m[1]);
  if ((m = h.match(/^#\/documento\/([\w-]+)/))) return renderDocumento(m[1]);
  if ((m = h.match(/^#\/admin\/(\w+)/))) return renderAdmin(m[1]);
  renderAdmin("inicio");
}

(async function boot() {
  await Store.init();
  Store.onRemoteChange = () => {
    updateTopbar();
    const h = location.hash;
    // re-render telas passivas; não interrompe formulários em edição
    if (!State.dirty && (h.startsWith("#/admin/stacking") || h.startsWith("#/admin/obras") || h.startsWith("#/admin/inicio") || h === "" )) route();
  };
  $("#btn-informar-obra").addEventListener("click", criarLinkObra);
  window.addEventListener("hashchange", route);
  route();
})();
