#!/bin/bash

# Script de Integracao Cloudflare para escritorio-builderfy
# Configura o CNAME builderfy.techatende.com.br apontando para dhsolucoesdigital001.github.io

# Desativa echo local de chaves
set +x

# 1. Validacao do arquivo de Credenciais
if [ -f "./.env_vault/Cloudflare.env" ]; then
    ENV_PATH="./.env_vault/Cloudflare.env"
elif [ -f "../.env_vault/Cloudflare.env" ]; then
    ENV_PATH="../.env_vault/Cloudflare.env"
elif [ -f "A:/.env_vault/Cloudflare.env" ]; then
    ENV_PATH="A:/.env_vault/Cloudflare.env"
else
    echo "[ERRO] Arquivo .env_vault/Cloudflare.env contendo o token necessario nao foi encontrado."
    exit 1
fi

echo "Carregando credenciais de: $ENV_PATH"
# Ler o token ignorando espacos e carriage returns
CLOUDFLARE_TOKEN=*** -E "^CLOUDFLARE_TOKEN=" "$ENV_PATH" | cut -d'=' -f2- | tr -d '\r' | tr -d ' ')

if [ -z "$CLOUDFLARE_TOKEN" ]; then
    echo "[ERRO] Token CLOUDFLARE_TOKEN nao localizado no arquivo de configuracao."
    exit 1
fi

ZONE_NAME="techatende.com.br"
RECORD_NAME="builderfy.techatende.com.br"
TARGET_CNAME="dhsolucoesdigital001.github.io"

echo "Consultando Zone ID para o dominio: $ZONE_NAME..."

ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -H "Content-Type: application/json")

SUCCESS=$(echo "$ZONE_RESPONSE" | grep -o '"success":\s*true' | head -n 1)
if [ -z "$SUCCESS" ]; then
    echo "[ERRO] Falha ao consultar a API da Cloudflare. Verifique a validade do seu Token."
    exit 1
fi

# Parsing Zone ID
if command -v jq >/dev/null 2>&1; then
    ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id // empty')
else
    ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
fi

if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
    echo "[AVISO] Zona '$ZONE_NAME' nao localizada nesta conta da Cloudflare."
    exit 1
fi

echo "Zone ID encontrada: $ZONE_ID"

# 2. Consultar se o registro de CNAME ja existe
echo "Verificando se o registro DNS para $RECORD_NAME ja existe..."
RECORD_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=$RECORD_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -H "Content-Type: application/json")

if command -v jq >/dev/null 2>&1; then
    RECORD_ID=$(echo "$RECORD_RESPONSE" | jq -r '.result[0].id // empty')
else
    RECORD_ID=$(echo "$RECORD_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
fi

DATA_JSON="{\"type\":\"CNAME\",\"name\":\"$RECORD_NAME\",\"content\":\"$TARGET_CNAME\",\"ttl\":1,\"proxied\":true}"

if [ -n "$RECORD_ID" ] && [ "$RECORD_ID" != "null" ]; then
    echo "Registro CNAME ja existe (ID: $RECORD_ID). Executando atualizacao (PUT)..."
    RESULT=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$DATA_JSON")
else
    echo "Registro CNAME nao localizado. Criando novo registro (POST)..."
    RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$DATA_JSON")
fi

REQ_SUCCESS=$(echo "$RESULT" | grep -o '"success":\s*true' | head -n 1)
if [ -n "$REQ_SUCCESS" ]; then
    echo "[SUCESSO] DNS configurado corretamente na Cloudflare (Proxied = True)!"
else
    echo "[ERRO] Falha ao injetar CNAME na Cloudflare:"
    echo "$RESULT"
    exit 1
fi
