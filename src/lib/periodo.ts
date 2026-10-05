const CHAVE = "controleepi-periodo";

export function guardarPeriodo(destino: "entregas" | "ranking", inicio: string, fim: string, colaboradorId = "") {
  sessionStorage.setItem(CHAVE, JSON.stringify({ destino, inicio, fim, colaboradorId }));
}

export function consumirPeriodo(destino: "entregas" | "ranking") {
  const bruto = sessionStorage.getItem(CHAVE);
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as { destino?: string; inicio?: string; fim?: string; colaboradorId?: string };
    const inicio = dados.inicio ?? "";
    const fim = dados.fim ?? "";
    const colaboradorId = dados.colaboradorId ?? "";
    const periodoValido = Boolean(inicio && fim && inicio <= fim);
    if (dados.destino !== destino || (!periodoValido && !colaboradorId)) return null;
    sessionStorage.removeItem(CHAVE);
    return { inicio: periodoValido ? inicio : "", fim: periodoValido ? fim : "", colaboradorId };
  } catch {
    return null;
  }
}
