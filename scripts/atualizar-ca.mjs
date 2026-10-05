import fs from "node:fs";

const arquivo = process.argv[2] ?? "tgg_export_caepi.txt";
const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const chave = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const token = process.env.CA_SYNC_TOKEN ?? "";

if (!url || !chave || !token) {
  console.error("Defina SUPABASE_URL, SUPABASE_ANON_KEY e CA_SYNC_TOKEN.");
  process.exit(1);
}

function dataIso(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : null;
}

const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/);
const cabecalho = linhas[0].split("|");
if (cabecalho[0] !== "NR Registro CA" || cabecalho[2] !== "SITUACAO") {
  console.error("O layout do arquivo do Ministério mudou. Confira as colunas antes de atualizar.");
  process.exit(1);
}

const porCa = new Map();
for (const linha of linhas.slice(1)) {
  const c = linha.split("|");
  if (c.length < 11 || !/^\d+$/.test(c[0])) continue;
  const ca = c[0].replace(/^0+/, "");
  porCa.set(ca, {
    ca,
    validade: dataIso(c[1]),
    situacao: c[2].trim(),
    equipamento: c[7].trim().slice(0, 300),
    descricao: c[8].trim().slice(0, 600),
    fabricante: c[5].trim().slice(0, 200),
    referencia: c[10].trim().slice(0, 200),
  });
}

const registros = [...porCa.values()];
if (registros.length < 10000) {
  console.error(`Só ${registros.length} CAs no arquivo. Atualização interrompida para não gravar uma base incompleta.`);
  process.exit(1);
}

async function enviar(corpo, tentativa = 1) {
  const resposta = await fetch(`${url}/functions/v1/controleepi-auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      "x-sync-token": token,
    },
    body: JSON.stringify({ action: "sincronizar-ca", ...corpo }),
  });
  const json = await resposta.json().catch(() => ({ ok: false, erro: `HTTP ${resposta.status}` }));
  if (!json.ok) {
    if (tentativa < 3 && resposta.status >= 500) return enviar(corpo, tentativa + 1);
    throw new Error(json.erro ?? `HTTP ${resposta.status}`);
  }
  return json.dados;
}

const lote = 2000;
for (let i = 0; i < registros.length; i += lote) {
  const final = i + lote >= registros.length;
  const dados = await enviar({ linhas: registros.slice(i, i + lote), final, total: registros.length });
  if (final) console.log(`Base de CA atualizada: ${registros.length} CAs. EPIs com validade corrigida: ${dados.episAtualizados ?? 0}.`);
}
