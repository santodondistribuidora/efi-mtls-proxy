const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));

// ── Certificados mTLS ──────────────────────────────────────────
const CERT_PATH = path.join(__dirname, "certs", "certificate.pem");
const KEY_PATH  = path.join(__dirname, "certs", "key.pem");

let cert, key;
try {
  cert = fs.readFileSync(CERT_PATH);
  key  = fs.readFileSync(KEY_PATH);
  console.log("✅ Certificados mTLS carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar certificados:", err.message);
  console.error("   Coloque certificate.pem e key.pem na pasta certs/");
  process.exit(1);
}

// ── Segurança ──────────────────────────────────────────────────
const PROXY_SECRET = process.env.PROXY_SECRET;
if (!PROXY_SECRET) {
  console.error("❌ Variável PROXY_SECRET não configurada");
  process.exit(1);
}

// ── Health check ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", certs: !!cert, timestamp: new Date().toISOString() });
});

// ── Proxy para EFÍ ────────────────────────────────────────────
app.all("/efi/*", (req, res) => {
  // Validar secret
  if (req.headers["x-proxy-secret"] !== PROXY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Montar path para a API da EFÍ
  const efiPath = req.path.replace("/efi", "");
  const efiHost = "pix.api.efipay.com.br";
  const fullUrl = `https://${efiHost}${efiPath}`;

  console.log(`→ ${req.method} ${fullUrl}`);

  // Copiar headers relevantes (remover os do proxy)
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders["x-proxy-secret"];
  delete forwardHeaders["host"];
  delete forwardHeaders["connection"];
  delete forwardHeaders["content-length"];
  forwardHeaders["host"] = efiHost;

  const urlObj = new URL(fullUrl);

  const options = {
    hostname: urlObj.hostname,
    port: 443,
    path: urlObj.pathname + urlObj.search,
    method: req.method,
    cert: cert,
    key: key,
    headers: forwardHeaders,
    rejectUnauthorized: true,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`← ${proxyRes.statusCode} ${fullUrl}`);

    // Copiar status e headers da resposta
    res.status(proxyRes.statusCode);
    const safeHeaders = ["content-type", "x-request-id"];
    safeHeaders.forEach((h) => {
      if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
    });

    // Stream da resposta
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`✗ Erro no proxy: ${err.message}`);
    res.status(502).json({ error: `Proxy error: ${err.message}` });
  });

  // Timeout de 30s
  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    res.status(504).json({ error: "Gateway timeout" });
  });

  // Enviar body se aplicável
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const bodyStr = JSON.stringify(req.body);
    proxyReq.setHeader("content-length", Buffer.byteLength(bodyStr));
    proxyReq.write(bodyStr);
  }

  proxyReq.end();
});

// ── Rota padrão ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Use /efi/* para acessar a API da EFÍ" });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 EFÍ mTLS Proxy rodando na porta ${PORT}`);
});
