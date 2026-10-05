import assert from "node:assert/strict";
import { avisosRuido, caVencido, custoColaborador, intervalosTroca, media, saldoEpi, ultimaEntrada } from "../src/lib/calculos.ts";
import { interpretarPlanilhaEntrada, interpretarPlanilhaEpi } from "../src/lib/formato.ts";
import type { Colaborador, Entrada, Epi, Saida } from "../src/tipos.ts";

const epiCapacete: Epi = { id: "cap", obra_id: "obra", nome: "Capacete", unidade: "UN", ca: null, validade_ca: null, tipo_ruido: "nenhum", ativo: true };
const epiAbafador: Epi = { id: "aba", obra_id: "obra", nome: "Abafador", unidade: "UN", ca: null, validade_ca: null, tipo_ruido: "abafador", ativo: true };
const epiPlug: Epi = { id: "plug", obra_id: "obra", nome: "Plug", unidade: "PAR", ca: null, validade_ca: null, tipo_ruido: "plug", ativo: true };
const joao: Colaborador = { id: "joao", obra_id: "obra", nome: "João", matricula: "1", funcao: "Pedreiro", ativo: true };
const pedro: Colaborador = { id: "pedro", obra_id: "obra", nome: "Pedro", matricula: "2", funcao: "Pedreiro", ativo: true };

const entradas: Entrada[] = [
  { id: "e1", obra_id: "obra", epi_id: "cap", data: "2026-03-01", quantidade: 10, numero_requisicao: "10", numero_nf: "100", valor_unitario: 20, created_at: "2026-03-01T10:00:00Z" },
  { id: "e2", obra_id: "obra", epi_id: "cap", data: "2026-03-01", quantidade: 5, numero_requisicao: "11", numero_nf: "200", valor_unitario: 25, created_at: "2026-03-01T12:00:00Z" },
];
const saidas: Saida[] = [
  { id: "s1", obra_id: "obra", epi_id: "cap", colaborador_id: "joao", data: "2026-03-01", quantidade: 1, valor_unitario: 25, numero_nf: "200", numero_requisicao: "11", entrada_id: "e2", created_at: "2026-03-01T13:00:00Z" },
  { id: "s2", obra_id: "obra", epi_id: "cap", colaborador_id: "joao", data: "2026-06-01", quantidade: 1, valor_unitario: 25, numero_nf: "200", numero_requisicao: "11", entrada_id: "e2", created_at: "2026-06-01T13:00:00Z" },
  { id: "s3", obra_id: "obra", epi_id: "cap", colaborador_id: "joao", data: "2026-09-01", quantidade: 1, valor_unitario: 25, numero_nf: "200", numero_requisicao: "11", entrada_id: "e2", created_at: "2026-09-01T13:00:00Z" },
  { id: "s4", obra_id: "obra", epi_id: "cap", colaborador_id: "pedro", data: "2026-03-01", quantidade: 1, valor_unitario: 25, numero_nf: "200", numero_requisicao: "11", entrada_id: "e2", created_at: "2026-03-01T14:00:00Z" },
  { id: "s5", obra_id: "obra", epi_id: "cap", colaborador_id: "pedro", data: "2026-07-01", quantidade: 1, valor_unitario: 25, numero_nf: "200", numero_requisicao: "11", entrada_id: "e2", created_at: "2026-07-01T14:00:00Z" },
];

assert.equal(saldoEpi(entradas, saidas, "obra", "cap"), 10);
assert.equal(ultimaEntrada(entradas, "obra", "cap")?.valor_unitario, 25);
assert.equal(media(intervalosTroca(saidas, "obra", "joao", "cap", "2026-03-01", null)), 92);
const intervalosFuncao = [
  ...intervalosTroca(saidas, "obra", "joao", "cap", "2026-03-01", null),
  ...intervalosTroca(saidas, "obra", "pedro", "cap", "2026-03-01", null),
];
assert.equal(Math.round(media(intervalosFuncao) ?? 0), 102);
assert.equal(custoColaborador(saidas, "joao", "2026-03-01", "2026-06"), 25);
assert.equal(custoColaborador(saidas, "joao", "2026-03-01", null), 75);

const saidasRuido: Saida[] = [
  { id: "a1", obra_id: "obra", epi_id: "aba", colaborador_id: "joao", data: "2026-01-01", quantidade: 1, valor_unitario: 10, numero_nf: "1", numero_requisicao: "1", entrada_id: "x", created_at: "2026-01-01T00:00:00Z" },
  { id: "p1", obra_id: "obra", epi_id: "plug", colaborador_id: "pedro", data: "2026-09-01", quantidade: 1, valor_unitario: 2, numero_nf: "1", numero_requisicao: "1", entrada_id: "x", created_at: "2026-09-01T00:00:00Z" },
];
const avisos = avisosRuido([epiCapacete, epiAbafador, epiPlug], saidasRuido, "obra", "2026-09-29");
assert.equal(avisos.length, 2);
assert.equal(avisos.some((item) => item.colaboradorId === "joao" && item.tipo === "plug"), false);

const planilha = interpretarPlanilhaEpi("Nome,Unidade,CA,Validade,Proteção auditiva\nLuva pigmentada,par,34491,27/12/2028,Não é proteção de ruído\nNOME,UNIDADE,CA,VALIDADE,PROTEÇÃO\n,PC,,,\nCapacete,UN,123,31/02/2026,Abafador\nPlug,PAR,,,plug\n");
assert.equal(planilha.length, 4);
assert.equal(planilha[0].unidade, "PAR");
assert.equal(planilha[0].validadeCa, "2028-12-27");
assert.equal(planilha[0].tipoRuido, "nenhum");
assert.equal(planilha[0].erro, "");
assert.match(planilha[1].erro, /sem nome/);
assert.match(planilha[2].erro, /validade/);
assert.equal(planilha[3].tipoRuido, "plug");
assert.equal(planilha[3].unidade, "PAR");
assert.equal(interpretarPlanilhaEpi("Luva,CX,10,2027-01-05,Abafador")[0].validadeCa, "2027-01-05");
const semCa = interpretarPlanilhaEpi("Nome,Unidade,CA,Validade,Proteção auditiva\nCreme,UN,n/a,N/A,\nProtetor solar,UN,N/A,,\n");
assert.equal(semCa[0].erro, "");
assert.equal(semCa[0].ca, "N/A");
assert.equal(semCa[0].validadeNa, true);
assert.equal(semCa[0].validadeCa, "");
assert.equal(semCa[1].erro, "");
assert.equal(semCa[1].validadeNa, true);
assert.equal(semCa[1].validadeCa, "");
assert.equal(caVencido({ ...epiCapacete, ca: "N/A", validade_ca: "2020-01-01", validade_na: false }, "2026-10-02"), false);
assert.equal(interpretarPlanilhaEntrada("Material,Data,Quantidade,Requisição,NF,Valor unitário,CA,Marca\nProtetor solar FPS 60,30/09/2026,60,9563,177603,\"16,21\",N/A,SUNLAU\n", "2026-09-30")[0].ca, "N/A");
assert.equal(interpretarPlanilhaEntrada("EPI,Data,Quantidade,Requisição,NF,Valor unitário,CA,Marca\nCreme,30/09/2026,1,1,2,10,N/A,\n", "2026-09-30")[0].ca, "N/A");

const entradasPlanilha = interpretarPlanilhaEntrada("EPI,Data,Quantidade,Requisição,NF,Valor unitário\nLuva pigmentada,30/09/2026,10,123,456,\"12,50\"\nEPI,Data,Quantidade,Requisição,NF,Valor\nCapacete,31/12/2026,2,1,2,10\nBota,01/01/2019,1,1,1,10\nÓculos,15/08/2026,0,1,1,10\n", "2026-09-30");
assert.equal(entradasPlanilha.length, 4);
assert.equal(entradasPlanilha[0].data, "2026-09-30");
assert.equal(entradasPlanilha[0].quantidade, 10);
assert.equal(entradasPlanilha[0].valorUnitario, 12.5);
assert.equal(entradasPlanilha[0].erro, "");
assert.match(entradasPlanilha[1].erro, /hoje/);
assert.match(entradasPlanilha[2].erro, /01\/01\/2020/);
assert.match(entradasPlanilha[3].erro, /quantidade/);
assert.equal(interpretarPlanilhaEntrada("Luva,2026-09-01,3,9,8,4.5", "2026-09-30")[0].numeroNf, "8");
const comMarca = interpretarPlanilhaEntrada("EPI,Data,Quantidade,Requisição,NF,Valor unitário,CA,Marca\nLuva,30/09/2026,1,1,2,10,34491,Kalipso\n", "2026-09-30");
assert.equal(comMarca[0].ca, "34491");
assert.equal(comMarca[0].marca, "Kalipso");
assert.equal(entradasPlanilha[0].ca, "");

console.log("cálculos ok");
