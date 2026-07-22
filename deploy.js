const fs = require('fs');
const path = require('path');

// 1. Localizar arquivo de credenciais
let envPath = '';
const pathsToCheck = [
  path.join(__dirname, '.env_vault', 'Cloudflare.env'),
  path.join(__dirname, '..', '.env_vault', 'Cloudflare.env'),
  'A:\\.env_vault\\Cloudflare.env',
  'A:\\OpenClawinstalação\\workspace\\.env_vault\\Cloudflare.env'
];

for (const p of pathsToCheck) {
  if (fs.existsSync(p)) {
    envPath = p;
    break;
  }
}

if (!envPath) {
  console.error('[ERRO] Arquivo .env_vault/Cloudflare.env nao encontrado.');
  process.exit(1);
}

console.log('Carregando credenciais de:', envPath);
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/CLOUDFLARE_TOKEN\s*=\s*(.*)/);
if (!match) {
  console.error('[ERRO] Chave CLOUDFLARE_TOKEN nao encontrada no arquivo.');
  process.exit(1);
}

const token = match[1].trim();
const zoneName = 'techatende.com.br';
const recordName = 'builderfy.techatende.com.br';
const targetCname = 'dhsolucoesdigital001.github.io';

async function run() {
  try {
    // 2. Buscar Zone ID
    console.log(`Buscando Zone ID para o dominio: ${zoneName}`);
    const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${zoneName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const zoneData = await zoneRes.json();
    if (!zoneData.success || zoneData.result.length === 0) {
      console.error('[ERRO] Falha ao localizar a Zona ou token incorreto.', zoneData);
      process.exit(1);
    }
    const zoneId = zoneData.result[0].id;
    console.log(`Zone ID obtida: ${zoneId}`);

    // 3. Verificar se o registro DNS ja existe
    console.log(`Verificando se o registro ${recordName} existe na zona...`);
    const recordRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&name=${recordName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const recordData = await recordRes.json();
    if (!recordData.success) {
      console.error('[ERRO] Falha ao ler registros de DNS.', recordData);
      process.exit(1);
    }

    const payload = {
      type: 'CNAME',
      name: recordName,
      content: targetCname,
      ttl: 1, // Auto
      proxied: true
    };

    let result;
    if (recordData.result.length > 0) {
      const recordId = recordData.result[0].id;
      console.log(`Registro CNAME existente localizado (ID: ${recordId}). Atualizando via PUT...`);
      const updateRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      result = await updateRes.json();
    } else {
      console.log(`Registro CNAME nao encontrado. Criando via POST...`);
      const createRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      result = await createRes.json();
    }

    if (result.success) {
      console.log('[SUCESSO] Configuração de CNAME na Cloudflare realizada com exito!');
      console.log(`Subdominio: ${recordName} -> ${targetCname} (Proxied)`);
    } else {
      console.error('[ERRO] Falha ao atualizar DNS na Cloudflare:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('[ERRO] Excecao na execucao do script:', error);
    process.exit(1);
  }
}

run();
