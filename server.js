/* ================================================================
   Gestão Condominial — servidor local
   Servidor HTTP sem dependências externas (Node.js puro):
   - Serve a aplicação (arquivos estáticos desta pasta)
   - API JSON em /api/* com persistência em data/db.json
   Rodar:  node server.js   (porta 8330 por padrão; PORT=xxxx muda)
   ================================================================ */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8330);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const MAX_BODY = 2 * 1024 * 1024; // 2 MB

/* ---------------- banco (arquivo JSON) ---------------- */
let db = { rev: 1, config: null, units: {}, obras: {} };
try {
  const raw = fs.readFileSync(DB_FILE, "utf8");
  const loaded = JSON.parse(raw);
  if (loaded && typeof loaded === "object") db = Object.assign(db, loaded);
  console.log(`Banco carregado de ${DB_FILE} (rev ${db.rev})`);
} catch (e) {
  console.log("Banco novo — nada salvo ainda.");
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error("Falha ao gravar o banco:", e.message);
    }
  }, 150);
}
function bump() { db.rev += 1; persist(); }

/* ---------------- helpers HTTP ---------------- */
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("payload muito grande")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null")); }
      catch (e) { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

/* ---------------- servidor ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;

  try {
    /* ---- API ---- */
    if (p.startsWith("/api/")) {
      if (req.method === "GET" && p === "/api/rev") return sendJson(res, 200, { rev: db.rev });
      if (req.method === "GET" && p === "/api/state")
        return sendJson(res, 200, { rev: db.rev, config: db.config, units: db.units, obras: db.obras });

      if (req.method === "PUT" && p === "/api/config") {
        db.config = await readBody(req); bump();
        return sendJson(res, 200, { ok: true, rev: db.rev });
      }

      const mUnit = p.match(/^\/api\/units\/([^/]+)$/);
      if (mUnit && ID_RE.test(mUnit[1])) {
        if (req.method === "PUT") { db.units[mUnit[1]] = await readBody(req); bump(); return sendJson(res, 200, { ok: true, rev: db.rev }); }
        if (req.method === "DELETE") { delete db.units[mUnit[1]]; bump(); return sendJson(res, 200, { ok: true, rev: db.rev }); }
      }

      const mObra = p.match(/^\/api\/obras\/([^/]+)$/);
      if (mObra && ID_RE.test(mObra[1])) {
        if (req.method === "PUT") { db.obras[mObra[1]] = await readBody(req); bump(); return sendJson(res, 200, { ok: true, rev: db.rev }); }
        if (req.method === "DELETE") { delete db.obras[mObra[1]]; bump(); return sendJson(res, 200, { ok: true, rev: db.rev }); }
      }

      if (req.method === "POST" && p === "/api/wipe") {
        db = { rev: db.rev + 1, config: null, units: {}, obras: {} }; persist();
        return sendJson(res, 200, { ok: true, rev: db.rev });
      }

      return sendJson(res, 404, { erro: "rota não encontrada" });
    }

    /* ---- arquivos estáticos ---- */
    if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { erro: "método não permitido" });

    let rel = decodeURIComponent(p);
    if (rel === "/") rel = "/index.html";
    // nunca servir o banco, dotfiles ou caminhos fora da pasta
    if (rel.includes("..") || rel.startsWith("/data/") || rel.includes("/.")) {
      res.writeHead(404); return res.end("Não encontrado");
    }
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(404); return res.end("Não encontrado"); }

    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Não encontrado"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(buf);
    });
  } catch (e) {
    sendJson(res, 400, { erro: e.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Gestão Condominial no ar: http://localhost:${PORT}`);
  console.log(`Dados persistidos em: ${DB_FILE}`);
});
