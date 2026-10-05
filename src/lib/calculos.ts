import type { Colaborador, Entrada, Epi, Saida, TipoRuido } from "../tipos";
import { semCertificado } from "./formato";

export function saldoEpi(entradas: Entrada[], saidas: Saida[], obraId: string, epiId: string): number {
  const entrou = entradas
    .filter((item) => item.obra_id === obraId && item.epi_id === epiId)
    .reduce((total, item) => total + item.quantidade, 0);
  const saiu = saidas
    .filter((item) => item.obra_id === obraId && item.epi_id === epiId)
    .reduce((total, item) => total + item.quantidade, 0);
  return entrou - saiu;
}

export function ultimaEntrada(entradas: Entrada[], obraId: string, epiId: string): Entrada | null {
  const lista = entradas
    .filter((item) => item.obra_id === obraId && item.epi_id === epiId)
    .sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
  return lista.length ? lista[lista.length - 1] : null;
}

export function adicionarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCMonth(data.getUTCMonth() + meses);
  return data.toISOString().slice(0, 10);
}

export function adicionarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function diasEntre(inicio: string, fim: string): number {
  const a = Date.parse(`${inicio.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${fim.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function dentroDoPeriodo(data: string, inicioObra: string, mes: string | null): boolean {
  const dia = data.slice(0, 10);
  if (mes) return dia.slice(0, 7) === mes;
  return dia >= inicioObra.slice(0, 10);
}

export function custoColaborador(
  saidas: Saida[],
  colaboradorId: string,
  inicioObra: string,
  mes: string | null,
): number {
  return saidas
    .filter(
      (item) =>
        item.colaborador_id === colaboradorId &&
        item.valor_unitario != null &&
        dentroDoPeriodo(item.data, inicioObra, mes),
    )
    .reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0);
}

export type LinhaRanking = {
  colaboradorId: string;
  quantidade: number;
  custo: number;
};

export function rankingRetiradas(
  saidas: Saida[],
  colaboradores: Colaborador[],
  obraId: string,
  inicioObra: string,
  mes: string | null,
  epiId: string | null,
): LinhaRanking[] {
  const mapa = new Map<string, LinhaRanking>();
  for (const saida of saidas) {
    if (saida.obra_id !== obraId) continue;
    if (epiId && saida.epi_id !== epiId) continue;
    if (!dentroDoPeriodo(saida.data, inicioObra, mes)) continue;
    const pessoa = colaboradores.find((item) => item.id === saida.colaborador_id);
    if (!pessoa || pessoa.obra_id !== obraId) continue;
    const atual = mapa.get(saida.colaborador_id) ?? {
      colaboradorId: saida.colaborador_id,
      quantidade: 0,
      custo: 0,
    };
    atual.quantidade += saida.quantidade;
    atual.custo += saida.quantidade * (saida.valor_unitario ?? 0);
    mapa.set(saida.colaborador_id, atual);
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade || a.colaboradorId.localeCompare(b.colaboradorId));
}

export function intervalosTroca(
  saidas: Saida[],
  obraId: string,
  colaboradorId: string,
  epiId: string,
  inicioObra: string,
  mes: string | null,
): number[] {
  const lista = saidas
    .filter((item) => item.obra_id === obraId && item.colaborador_id === colaboradorId && item.epi_id === epiId)
    .sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
  const intervalos: number[] = [];
  for (let i = 1; i < lista.length; i++) {
    if (dentroDoPeriodo(lista[i].data, inicioObra, mes)) {
      intervalos.push(diasEntre(lista[i - 1].data, lista[i].data));
    }
  }
  return intervalos;
}

export function media(valores: number[]): number | null {
  if (!valores.length) return null;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

export type AvisoTroca = {
  colaboradorId: string;
  epiId: string;
  tipo: Exclude<TipoRuido, "nenhum">;
  ultima: string;
  limite: string;
};

export function avisosRuido(
  epis: Epi[],
  saidas: Saida[],
  obraId: string,
  hoje: string,
): AvisoTroca[] {
  const avisos: AvisoTroca[] = [];
  const tipos: Array<Exclude<TipoRuido, "nenhum">> = ["abafador", "plug"];
  for (const tipo of tipos) {
    const episTipo = epis.filter((item) => item.obra_id === obraId && item.tipo_ruido === tipo);
    const pessoas = new Set<string>();
    for (const saida of saidas) {
      if (saida.obra_id !== obraId) continue;
      if (episTipo.some((epi) => epi.id === saida.epi_id)) pessoas.add(saida.colaborador_id);
    }
    for (const colaboradorId of pessoas) {
      const retiradas = saidas
        .filter(
          (item) =>
            item.obra_id === obraId &&
            item.colaborador_id === colaboradorId &&
            episTipo.some((epi) => epi.id === item.epi_id),
        )
        .sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
      const ultima = retiradas[retiradas.length - 1];
      const limite = tipo === "abafador" ? adicionarMeses(ultima.data, 6) : adicionarDias(ultima.data, 15);
      if (hoje >= limite) {
        avisos.push({
          colaboradorId,
          epiId: ultima.epi_id,
          tipo,
          ultima: ultima.data,
          limite,
        });
      }
    }
  }
  return avisos;
}

export function naoEEpi(epi: Pick<Epi, "ca">): boolean {
  return semCertificado(epi.ca ?? "");
}

export function caVencido(epi: Epi, data: string): boolean {
  if (epi.validade_na || naoEEpi(epi)) return false;
  return Boolean(epi.validade_ca && /^\d{4}-\d{2}-\d{2}$/.test(epi.validade_ca) && epi.validade_ca < data.slice(0, 10));
}
