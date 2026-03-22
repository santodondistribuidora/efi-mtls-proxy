# EFÍ BANK mTLS Proxy

Proxy intermediário para a API PIX da EFÍ BANK com suporte a certificados mTLS.

## Estrutura

```
efi-mtls-proxy/
├── index.js          # Servidor proxy
├── package.json      # Dependências
├── certs/
│   ├── certificate.pem   # ← Seu certificado EFÍ
│   └── key.pem           # ← Sua chave privada EFÍ
└── README.md
```

## Deploy no Railway

### 1. Preparar certificados

Coloque seus arquivos `certificate.pem` e `key.pem` na pasta `certs/`.

Se você recebeu um arquivo `.p12`, converta:
```bash
openssl pkcs12 -in certificado.p12 -out certs/certificate.pem -clcerts -nokeys
openssl pkcs12 -in certificado.p12 -out certs/key.pem -nocerts -nodes
```

### 2. Criar repositório no GitHub

```bash
git init
git add .
git commit -m "EFÍ mTLS proxy"
git remote add origin https://github.com/SEU-USUARIO/efi-mtls-proxy.git
git push -u origin main
```

### 3. Deploy no Railway

1. Acesse [railway.app](https://railway.app) e crie uma conta
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório `efi-mtls-proxy`
4. Em **Variables**, adicione:
   - `PROXY_SECRET` = um valor aleatório seguro (ex: gere com `openssl rand -hex 32`)
5. Railway vai detectar Node.js automaticamente e fazer deploy

### 4. Verificar

Após o deploy, acesse:
```
https://SEU-APP.up.railway.app/health
```

Deve retornar: `{"status":"ok","certs":true,...}`

### 5. Configurar no Lovable

Use a URL do Railway como `EFI_PROXY_URL` e o valor de `PROXY_SECRET` como `EFI_PROXY_SECRET` nos secrets do projeto.

## Segurança

- Todas as requisições exigem o header `x-proxy-secret`
- Os certificados mTLS são carregados na inicialização
- Timeout de 30s para evitar conexões presas
