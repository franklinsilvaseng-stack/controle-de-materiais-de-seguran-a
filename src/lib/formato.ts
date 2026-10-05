export function hojeIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function lerMoeda(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "").replace("R$", "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function lerInteiro(texto: string): number | null {
  const n = Number(texto.trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function mesAtual(): string {
  return hojeIso().slice(0, 7);
}

export async function textoDeArquivo(arquivo: File): Promise<string> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(bytes);
}

export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const amostra = limpo.split("\n").find((linha) => linha.trim()) ?? "";
  const separador = (amostra.match(/;/g) ?? []).length > (amostra.match(/,/g) ?? []).length ? ";" : ",";
  const linhas: string[][] = [];
  let campos: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const caractere = limpo[i];
    if (aspas) {
      if (caractere === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          aspas = false;
        }
      } else {
        campo += caractere;
      }
    } else if (caractere === '"') {
      aspas = true;
    } else if (caractere === separador) {
      campos.push(campo.trim());
      campo = "";
    } else if (caractere === "\n") {
      campos.push(campo.trim());
      if (campos.some(Boolean)) linhas.push(campos);
      campos = [];
      campo = "";
    } else {
      campo += caractere;
    }
  }
  if (campo || campos.length) {
    campos.push(campo.trim());
    if (campos.some(Boolean)) linhas.push(campos);
  }
  return linhas;
}

const UNIDADES_PLANILHA = ["UN", "PAR", "CX", "KG", "M", "L", "SC"];

export type LinhaEpiPlanilha = {
  nome: string;
  unidade: string;
  ca: string;
  validadeCa: string;
  validadeNa: boolean;
  tipoRuido: "nenhum" | "abafador" | "plug";
  erro: string;
};

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

export function semCertificado(valor: string) {
  const texto = semAcento(valor).replace(/[^a-z0-9]/g, "");
  return texto === "na" || texto === "semca" || texto === "naoseaplica" || texto === "semcertificado";
}

export function normalizarCaLivre(valor: string) {
  const texto = valor.trim();
  if (!texto) return "";
  if (semCertificado(texto)) return "N/A";
  return texto.slice(0, 40);
}

export function interpretarValidade(texto: string) {
  const valor = texto.trim();
  if (!valor) return { iso: "", na: false, erro: "" };
  if (semCertificado(valor)) return { iso: "", na: true, erro: "" };
  const data = dataPlanilha(valor);
  if (!data) return { iso: "", na: false, erro: "use dd/mm/aaaa ou N/A" };
  return { iso: data, na: false, erro: "" };
}

function dataPlanilha(texto: string) {
  const valor = texto.trim();
  if (!valor) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? valor
    : valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normal = typeof iso === "string" ? iso : iso ? `${iso[3]}-${iso[2].padStart(2, "0")}-${iso[1].padStart(2, "0")}` : "";
  if (!normal) return null;
  const data = new Date(`${normal}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== normal) return null;
  return normal;
}

function protecaoPlanilha(texto: string): LinhaEpiPlanilha["tipoRuido"] | null {
  const valor = semAcento(texto);
  if (!valor || valor === "nenhum" || valor.startsWith("nao")) return "nenhum";
  if (valor.includes("abafador")) return "abafador";
  if (valor.includes("plug")) return "plug";
  return null;
}

export function interpretarPlanilhaEpi(texto: string): LinhaEpiPlanilha[] {
  const tabela = lerCsv(texto);
  if (!tabela.length) return [];
  const cabecalho = tabela[0].map(semAcento);
  const indice = {
    nome: cabecalho.findIndex((item) => item === "nome"),
    unidade: cabecalho.findIndex((item) => item === "unidade"),
    ca: cabecalho.findIndex((item) => item === "ca"),
    validade: cabecalho.findIndex((item) => item === "validade" || item.startsWith("validade ")),
    protecao: cabecalho.findIndex((item) => item === "protecao" || item.startsWith("protecao ") || item === "ruido" || item === "tipo"),
  };
  const temCabecalho = indice.nome >= 0;
  const pegar = (linha: string[], coluna: number, posicao: number) =>
    ((temCabecalho ? (coluna >= 0 ? linha[coluna] : "") : linha[posicao]) ?? "").trim();
  const resultado: LinhaEpiPlanilha[] = [];
  for (const linha of temCabecalho ? tabela.slice(1) : tabela) {
    const nome = pegar(linha, indice.nome, 0);
    const unidadeBruta = pegar(linha, indice.unidade, 1);
    const ca = normalizarCaLivre(pegar(linha, indice.ca, 2));
    const validadeBruta = pegar(linha, indice.validade, 3);
    const validade = interpretarValidade(validadeBruta);
    const protecaoBruta = pegar(linha, indice.protecao, 4);
    if (!nome && !unidadeBruta && !ca && !validadeBruta && !protecaoBruta) continue;
    if (semAcento(nome) === "nome") continue;
    const unidade = (unidadeBruta || "UN").toUpperCase();
    const tipoRuido = protecaoPlanilha(protecaoBruta);
    const semEpi = ca === "N/A";
    let erro = "";
    if (!nome) erro = "Linha sem nome do EPI";
    else if (!UNIDADES_PLANILHA.includes(unidade)) erro = `${nome}: unidade "${unidadeBruta}" não é aceita. Use UN, PAR, CX, KG, M, L ou SC.`;
    else if (!semEpi && validade.erro) erro = `${nome}: validade "${validadeBruta}" precisa estar como dd/mm/aaaa ou N/A.`;
    else if (!tipoRuido) erro = `${nome}: proteção "${protecaoBruta}" deve ser Abafador, Plug ou ficar em branco.`;
    resultado.push({
      nome,
      unidade,
      ca,
      validadeCa: semEpi ? "" : validade.iso,
      validadeNa: semEpi || validade.na,
      tipoRuido: tipoRuido ?? "nenhum",
      erro,
    });
  }
  return resultado;
}

export type LinhaEntradaPlanilha = {
  epi: string;
  data: string;
  quantidade: number;
  numeroRequisicao: string;
  numeroNf: string;
  valorUnitario: number;
  ca: string;
  marca: string;
  erro: string;
};

function rotuloPlanilha(texto: string) {
  return semAcento(texto).replace(/[º°.#]/g, "").replace(/\s+/g, " ").trim();
}

export function interpretarPlanilhaEntrada(texto: string, hoje = hojeIso()): LinhaEntradaPlanilha[] {
  const tabela = lerCsv(texto);
  if (!tabela.length) return [];
  const cabecalho = tabela[0].map(rotuloPlanilha);
  const indiceEpi = cabecalho.findIndex((item) => item === "epi" || item.startsWith("epi ") || item === "material" || item.startsWith("material ") || item === "descricao" || item.startsWith("descricao ") || item === "produto");
  const indice = {
    epi: indiceEpi >= 0 ? indiceEpi : cabecalho.findIndex((item) => item === "nome"),
    data: cabecalho.findIndex((item) => item === "data"),
    quantidade: cabecalho.findIndex((item) => item === "quantidade" || item === "qtd"),
    requisicao: cabecalho.findIndex((item) => item === "requisicao" || item.includes("requisicao")),
    nf: cabecalho.findIndex((item) => item === "nf" || item === "nota" || item.includes("nota fiscal")),
    valor: cabecalho.findIndex((item) => item === "valor" || item.startsWith("valor ") || item === "preco" || item.startsWith("preco ")),
    ca: cabecalho.findIndex((item) => item === "ca"),
    marca: cabecalho.findIndex((item) => item === "marca" || item === "fabricante"),
  };
  const temCabecalho = indice.epi >= 0 && [indice.data, indice.quantidade, indice.requisicao, indice.nf, indice.valor].some((item) => item >= 0);
  const pegar = (linha: string[], coluna: number, posicao: number) =>
    ((temCabecalho ? (coluna >= 0 ? linha[coluna] : "") : linha[posicao]) ?? "").trim();
  const resultado: LinhaEntradaPlanilha[] = [];
  for (const linha of temCabecalho ? tabela.slice(1) : tabela) {
    const epi = pegar(linha, indice.epi, 0);
    const dataBruta = pegar(linha, indice.data, 1);
    const quantidadeBruta = pegar(linha, indice.quantidade, 2);
    const numeroRequisicao = pegar(linha, indice.requisicao, 3);
    const numeroNf = pegar(linha, indice.nf, 4);
    const valorBruto = pegar(linha, indice.valor, 5);
    const ca = normalizarCaLivre(pegar(linha, indice.ca, 6));
    const marca = pegar(linha, indice.marca, 7).slice(0, 80);
    if (!epi && !dataBruta && !quantidadeBruta && !numeroRequisicao && !numeroNf && !valorBruto && !ca && !marca) continue;
    if (rotuloPlanilha(epi) === "epi" || rotuloPlanilha(epi) === "nome") continue;
    const data = dataPlanilha(dataBruta);
    const quantidade = lerInteiro(quantidadeBruta);
    const valor = lerMoeda(valorBruto);
    let erro = "";
    if (!epi) erro = "Linha sem nome do EPI";
    else if (!data) erro = `${epi}: data "${dataBruta}" precisa estar como dd/mm/aaaa.`;
    else if (data < "2020-01-01" || data > hoje) erro = `${epi}: use uma data entre 01/01/2020 e hoje.`;
    else if (!quantidade) erro = `${epi}: a quantidade precisa ser um número inteiro maior que zero.`;
    else if (!numeroRequisicao || !numeroNf) erro = `${epi}: informe a requisição e a nota fiscal.`;
    else if (valor == null || valor < 0 || valor >= 10000) erro = `${epi}: o valor precisa ser o preço da nota, menor que 10.000.`;
    resultado.push({
      epi,
      data: data ?? "",
      quantidade: quantidade ?? 0,
      numeroRequisicao,
      numeroNf,
      valorUnitario: valor ?? 0,
      ca,
      marca,
      erro,
    });
  }
  return resultado;
}

export function exportarCsv(colunas: string[], linhas: string[][]): void {
  const escapar = (valor: string) => `"${valor.replaceAll('"', '""')}"`;
  const csv = [colunas, ...linhas].map((linha) => linha.map(escapar).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `controleepi-export-${hojeIso()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
