# Gestão Condominial

Aplicação web para condomínios registrarem as obras dos apartamentos: stacking plan
com o status de cada unidade (proprietário, inquilino, vago, comercialização, disputa),
cadastro de moradores e fluxo completo de comunicação de obra — abrangência, escopo,
cronograma de ruído, prestadores de serviço e assinatura digital com token.

**Protótipo estático** (HTML/CSS/JS puros, sem build). Os dados ficam no navegador
(localStorage); a camada de dados é isolada no adaptador `Store` (`core.js`) para,
no futuro, ser trocada por uma API com banco compartilhado — o que habilitará o
link de comunicação de obra entre dispositivos diferentes.

## Rodar localmente

Qualquer servidor estático serve. Por exemplo:

```bash
npx http-server -p 8080 .
```

E abra http://localhost:8080.

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | Casca da página |
| `styles.css` | Design system (temas claro/escuro) |
| `core.js` | Estado, modelo de domínio, adaptador de persistência, exportação (`condoworks/1`) |
| `views.js` | Painel do administrador (cadastro, stacking plan, obras) |
| `obra.js` | Formulário do morador, cronograma, documento para impressão, roteador |
