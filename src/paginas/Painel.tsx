import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Box,
  Download,
  Headphones,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useNavegar } from "../componentes/Shell";
import { useToast } from "../componentes/Toast";
import { Vazio } from "../componentes/Ui";
import { adicionarDias, avisosRuido, caVencido, naoEEpi, rankingRetiradas, saldoEpi, ultimaEntrada } from "../lib/calculos";
import { useDados } from "../lib/dados";
import { exportarCsv, formatarData, formatarMoeda, hojeIso, mesAtual } from "../lib/formato";
import { guardarPeriodo } from "../lib/periodo";
import type { Entrada, Saida } from "../tipos";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function mesAnterior(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, numero - 2, 1));
  return data.toISOString().slice(0, 7);
}

function mesesRecentes(quantidade: number, base: string) {
  const [ano, numero] = base.split("-").map(Number);
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(Date.UTC(ano, numero - quantidade + indice, 1));
    return data.toISOString().slice(0, 7);
  });
}

function mesesEntre(inicio: string, fim: string) {
  const lista: string[] = [];
  const [ano, mes] = inicio.slice(0, 7).split("-").map(Number);
  let cursor = new Date(Date.UTC(ano, mes - 1, 1));
  const limite = fim.slice(0, 7);
  while (cursor.toISOString().slice(0, 7) <= limite && lista.length < 24) {
    lista.push(cursor.toISOString().slice(0, 7));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return lista;
}

function limitarData(valor: string, hoje: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return hoje;
  if (valor < "2020-01-01") return "2020-01-01";
  if (valor > hoje) return hoje;
  return valor;
}

function noIntervalo(data: string, inicio: string, fim: string) {
  const dia = data.slice(0, 10);
  return dia >= inicio && dia <= fim;
}

function rotuloMes(mes: string) {
  const numero = Number(mes.slice(5, 7));
  return MESES[numero - 1] ?? mes;
}

function variacao(atual: number, anterior: number) {
  if (atual === 0 && anterior <= 0) return "nenhum lançamento no período";
  if (anterior <= 0) return "primeiro registro no período";
  if (atual === 0) return "nenhum lançamento neste período";
  const pct = ((atual - anterior) / anterior) * 100;
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1).replace(".", ",")}% em relação ao período anterior`;
}

function pecas(quantidade: number) {
  return quantidade === 1 ? "1 peça" : `${quantidade} peças`;
}

function lancamentos(quantidade: number) {
  return quantidade === 1 ? "1 lançamento" : `${quantidade} lançamentos`;
}

function tempoRelativo(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return formatarData(iso);
  const minutos = Math.round(diff / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "•";
}

function somarQuantidade(lista: Array<{ quantidade: number }>) {
  return lista.reduce((total, item) => total + item.quantidade, 0);
}

export function Painel() {
  const { pacote, obraId, recarregar, carregando } = useDados();
  const ir = useNavegar();
  const avisar = useToast();
  const hoje = hojeIso();
  const [inicio, setInicio] = useState(`${mesAtual()}-01`);
  const [fim, setFim] = useState(hoje);
  const obra = pacote.obras.find((item) => item.id === obraId) ?? null;
  const de = inicio <= fim ? inicio : fim;
  const ate = inicio <= fim ? fim : inicio;
  const ontem = adicionarDias(hoje, -1);
  const mes = mesAtual();
  const anterior = mesAnterior(mes);

  const resumo = useMemo(() => {
    if (!obra) return null;
    const epis = pacote.epis.filter((item) => item.obra_id === obra.id);
    const ativos = epis.filter((item) => item.ativo);
    const pessoas = pacote.colaboradores.filter((item) => item.obra_id === obra.id);
    const pessoasAtivas = pessoas.filter((item) => item.ativo);
    const entradas = pacote.entradas.filter((item) => item.obra_id === obra.id);
    const saidas = pacote.saidas.filter((item) => item.obra_id === obra.id);
    const linhas = ativos.map((epi) => ({
      epi,
      saldo: saldoEpi(pacote.entradas, pacote.saidas, obra.id, epi.id),
      preco: ultimaEntrada(pacote.entradas, obra.id, epi.id)?.valor_unitario ?? 0,
    }));
    const zerados = linhas.filter((item) => item.saldo <= 0);
    const comSaldo = linhas.length - zerados.length;
    const vencidos = ativos.filter((item) => caVencido(item, hoje));
    const atrasos = avisosRuido(pacote.epis, pacote.saidas, obra.id, hoje);
    const valorEstoque = linhas.reduce((total, item) => total + Math.max(item.saldo, 0) * (item.preco ?? 0), 0);
    const pecas = linhas.reduce((total, item) => total + Math.max(item.saldo, 0), 0);
    const doDia = (lista: Array<Entrada | Saida>, dia: string) => lista.filter((item) => item.data.slice(0, 10) === dia);
    const doMes = (lista: Array<Entrada | Saida>, referencia: string) => lista.filter((item) => item.data.slice(0, 7) === referencia);
    const entregasHoje = doDia(saidas, hoje);
    const entregasOntem = doDia(saidas, ontem);
    const entradasHoje = doDia(entradas, hoje);
    const entradasOntem = doDia(entradas, ontem);
    const entregasMes = doMes(saidas, mes);
    const entregasMesAnterior = doMes(saidas, anterior);
    const noPeriodo = saidas.filter((item) => noIntervalo(item.data, de, ate));
    const entradasNoPeriodo = entradas.filter((item) => noIntervalo(item.data, de, ate));
    const dias = Math.max(1, Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000) + 1);
    const fimAnterior = adicionarDias(de, -1);
    const inicioAnterior = adicionarDias(fimAnterior, -(dias - 1));
    const periodoAnterior = saidas.filter((item) => noIntervalo(item.data, inicioAnterior, fimAnterior));
    const entradasPeriodoAnterior = entradas.filter((item) => noIntervalo(item.data, inicioAnterior, fimAnterior));
    const ultimoDia = new Date(Date.UTC(Number(de.slice(0, 4)), Number(de.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const mesCheio = de.endsWith("-01") && de.slice(0, 7) === ate.slice(0, 7) && (ate === ultimoDia || ate === hoje);
    const barras = mesCheio
      ? [1, 2, 3, 4, 5].map((semana) => {
          const itens = noPeriodo.filter((item) => Math.ceil(Number(item.data.slice(8, 10)) / 7) === semana);
          return {
            rotulo: `Semana ${semana}`,
            detalhe: lancamentos(itens.length),
            valor: somarQuantidade(itens),
            dinheiro: itens.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0),
          };
        }).filter((item, indice) => item.valor > 0 || indice < 4)
      : dias <= 45
        ? Array.from({ length: Math.min(6, Math.ceil(dias / 7)) }, (_, indice) => {
            const comeco = adicionarDias(de, indice * 7);
            const termino = adicionarDias(comeco, 6) > ate ? ate : adicionarDias(comeco, 6);
            const itens = noPeriodo.filter((item) => noIntervalo(item.data, comeco, termino));
            return {
              rotulo: formatarData(comeco).slice(0, 5),
              detalhe: lancamentos(itens.length),
              valor: somarQuantidade(itens),
              dinheiro: itens.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0),
            };
          })
        : mesesEntre(de, ate).map((chave) => {
            const itens = noPeriodo.filter((item) => item.data.slice(0, 7) === chave);
            return {
              rotulo: rotuloMes(chave),
              detalhe: lancamentos(itens.length),
              valor: somarQuantidade(itens),
              dinheiro: itens.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0),
            };
          });
    const ranking = rankingRetiradas(
      noPeriodo,
      pacote.colaboradores,
      obra.id,
      obra.data_inicio,
      null,
      null,
    ).slice(0, 3);
    const movimentos = [
      ...entradas.map((item) => ({
        id: `e-${item.id}`,
        quando: item.created_at || item.data,
        titulo: `Entrada de ${pacote.epis.find((epi) => epi.id === item.epi_id)?.nome ?? "EPI"}`,
        detalhe: `${item.quantidade} · NF ${item.numero_nf}`,
        tipo: "entrada" as const,
      })),
      ...saidas.map((item) => ({
        id: `s-${item.id}`,
        quando: item.created_at || item.data,
        titulo: `${pacote.colaboradores.find((pessoa) => pessoa.id === item.colaborador_id)?.nome ?? "Colaborador"} retirou EPI`,
        detalhe: `${pacote.epis.find((epi) => epi.id === item.epi_id)?.nome ?? "EPI"} · ${item.quantidade}`,
        tipo: "saida" as const,
      })),
    ].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 4);
    return {
      epis, ativos, pessoas, pessoasAtivas, linhas, zerados, comSaldo, vencidos, atrasos, valorEstoque, pecas,
      entregasHoje, entregasOntem, entradasHoje, entradasOntem, entregasMes, entregasMesAnterior,
      noPeriodo, periodoAnterior, entradasNoPeriodo, entradasPeriodoAnterior, barras, movimentos, ranking,
    };
  }, [anterior, ate, de, hoje, mes, obra, ontem, pacote]);

  useEffect(() => {
    void recarregar().catch(() => undefined);
  }, [recarregar]);

  async function atualizar() {
    try {
      await recarregar();
      avisar("Painel atualizado.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível atualizar.", "erro");
    }
  }

  if (!obra || !resumo) {
    return (
      <section className="painel-dash">
        <Vazio>Nenhuma obra ainda. Cadastre a primeira para controlar os EPIs.</Vazio>
        <button className="botao" type="button" onClick={() => ir("obras")}>Cadastrar obra</button>
      </section>
    );
  }

  const nome = pacote.perfil.full_name.trim().split(/\s+/)[0] || "técnico";
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const custoPeriodo = resumo.noPeriodo.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0);
  const custoAnterior = resumo.periodoAnterior.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0);
  const maxBarra = Math.max(1, ...resumo.barras.map((item) => item.valor));
  const progressoPessoas = resumo.pessoas.length ? Math.round((resumo.pessoasAtivas.length / resumo.pessoas.length) * 100) : 0;
  const progressoEpis = resumo.ativos.length ? Math.round((resumo.comSaldo / resumo.ativos.length) * 100) : 0;
  const cores = ["#184a4e", "#1f7a4d", "#9a6b2f"];

  function exportar() {
    if (!resumo) return;
    exportarCsv(
      ["EPI", "Unidade", "Saldo", "CA", "Validade", ...(pacote.verCustos ? ["Preço vigente"] : [])],
      resumo.linhas.map((item) => [
        item.epi.nome,
        item.epi.unidade,
        String(item.saldo),
        item.epi.ca ?? "",
        item.epi.validade_na || naoEEpi(item.epi) ? "N/A" : formatarData(item.epi.validade_ca),
        ...(pacote.verCustos ? [formatarMoeda(item.preco)] : []),
      ]),
    );
  }

  return (
    <section className="painel-dash">
      <header className="dash-pagina">
        <div>
          <h2>Painel</h2>
          <p>Estoque e entregas da obra {obra.nome}</p>
        </div>
      </header>

      <article className="dash-hero">
        <div className="dash-hero-topo">
          <div>
            <h3>Olá, {nome}</h3>
            <p>Resumo de {formatarData(de)} até {formatarData(ate)}.</p>
          </div>
          <div className="dash-hero-acoes">
            <span className="dash-data">{dataExtenso}</span>
            <button className="dash-hero-botao" type="button" onClick={exportar}>
              <Download size={16} aria-hidden="true" /> Exportar
            </button>
            <button className="dash-hero-botao" type="button" onClick={atualizar} disabled={carregando} aria-label="Atualizar painel">
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="dash-kpis-hero">
          <HeroMetrica
            icone={<Package size={16} aria-hidden="true" />}
            valor={String(resumo.noPeriodo.length)}
            rotulo="Entregas no período"
            nota={variacao(resumo.noPeriodo.length, resumo.periodoAnterior.length)}
          />
          <HeroMetrica
            icone={<Box size={16} aria-hidden="true" />}
            valor={String(resumo.entradasNoPeriodo.length)}
            rotulo="Entradas no período"
            nota={variacao(resumo.entradasNoPeriodo.length, resumo.entradasPeriodoAnterior.length)}
          />
          <HeroMetrica
            icone={<Wallet size={16} aria-hidden="true" />}
            valor={pacote.verCustos ? formatarMoeda(custoPeriodo) : String(somarQuantidade(resumo.noPeriodo))}
            rotulo={pacote.verCustos ? "Custo no período" : "Peças no período"}
            nota={pacote.verCustos ? variacao(custoPeriodo, custoAnterior) : variacao(somarQuantidade(resumo.noPeriodo), somarQuantidade(resumo.periodoAnterior))}
          />
          <HeroMetrica
            icone={<AlertTriangle size={16} aria-hidden="true" />}
            valor={String(resumo.zerados.length)}
            rotulo="EPIs sem saldo"
            nota={resumo.ativos.length ? `${Math.round((resumo.zerados.length / resumo.ativos.length) * 100)}% dos EPIs ativos` : "nenhum EPI ativo"}
          />
        </div>
      </article>

      <div className="dash-grade-4">
        <CartaoIndicador
          icone={<Users size={18} aria-hidden="true" />}
          cor="#1f7a4d"
          valor={String(resumo.pessoasAtivas.length)}
          rotulo="Colaboradores ativos"
          nota={`${resumo.pessoasAtivas.length} em atividade nesta obra`}
          progresso={progressoPessoas}
          legenda={`${resumo.pessoasAtivas.length} de ${resumo.pessoas.length}`}
        />
        <CartaoIndicador
          icone={<Package size={18} aria-hidden="true" />}
          cor="#184a4e"
          valor={String(resumo.ativos.length)}
          rotulo="EPIs ativos"
          nota={`${resumo.comSaldo} com saldo disponível`}
          progresso={progressoEpis}
          legenda={`${resumo.comSaldo} de ${resumo.ativos.length}`}
        />
        <CartaoIndicador
          icone={<ShoppingCart size={18} aria-hidden="true" />}
          cor="#c2410c"
          valor={String(somarQuantidade(resumo.noPeriodo))}
          rotulo="Peças no período"
          nota={variacao(somarQuantidade(resumo.noPeriodo), somarQuantidade(resumo.periodoAnterior))}
          progresso={Math.round((somarQuantidade(resumo.noPeriodo) / Math.max(somarQuantidade(resumo.noPeriodo), somarQuantidade(resumo.periodoAnterior), 1)) * 100)}
          legenda={`período anterior ${somarQuantidade(resumo.periodoAnterior)}`}
        />
        <CartaoIndicador
          icone={<Wallet size={18} aria-hidden="true" />}
          cor="#6d28d9"
          valor={pacote.verCustos ? formatarMoeda(resumo.valorEstoque) : String(resumo.pecas)}
          rotulo={pacote.verCustos ? "Valor em estoque" : "Peças em estoque"}
          nota={pacote.verCustos ? "preço da última entrada de cada EPI" : "soma dos saldos positivos"}
          progresso={progressoEpis}
          legenda={pacote.verCustos ? `${resumo.comSaldo} EPIs com saldo` : `${resumo.pecas} peças`}
        />
      </div>

      <div className="dash-meio">
        <article className="cartao dash-bloco">
          <div className="dash-bloco-topo">
            <div>
              <h3>Entregas</h3>
              <p>De {formatarData(de)} até {formatarData(ate)}</p>
            </div>
          </div>
          <div className="dash-filtro">
            <label className="campo">De
              <input type="date" value={inicio} min="2020-01-01" max={fim} onChange={(evento) => setInicio(limitarData(evento.target.value, hoje))} />
            </label>
            <label className="campo">Até
              <input type="date" value={fim} min={inicio} max={hoje} onChange={(evento) => setFim(limitarData(evento.target.value, hoje))} />
            </label>
            <div className="dash-alternar" role="group" aria-label="Atalhos de período">
              <button type="button" className={inicio === `${mes}-01` && fim === hoje ? "ativo" : ""} onClick={() => { setInicio(`${mes}-01`); setFim(hoje); }}>Este mês</button>
              <button type="button" className={inicio === `${mesesRecentes(6, mes)[0]}-01` && fim === hoje ? "ativo" : ""} onClick={() => { setInicio(`${mesesRecentes(6, mes)[0]}-01`); setFim(hoje); }}>6 meses</button>
            </div>
          </div>
          <ul className="dash-barras">
            {resumo.barras.map((item, indice) => (
              <li key={`${item.rotulo}-${indice}`}>
                <div className="dash-barra-rotulo">
                  <strong>{item.rotulo}</strong>
                  <span>{item.detalhe}</span>
                </div>
                <div className="dash-trilho" role="presentation">
                  <span style={{ width: `${Math.round((item.valor / maxBarra) * 100)}%` }} />
                </div>
                <div className="dash-barra-valor">
                  {pacote.verCustos ? formatarMoeda(item.dinheiro) : pecas(item.valor)}
                </div>
              </li>
            ))}
          </ul>
          <div className="dash-mini-grade">
            <Mini
              rotulo="Entregas no período"
              valor={String(resumo.barras.reduce((total, item) => total + item.valor, 0))}
            />
            <Mini
              rotulo="Período anterior"
              valor={String(somarQuantidade(resumo.periodoAnterior))}
            />
            <Mini
              rotulo={pacote.verCustos ? "Custo no período" : "Lançamentos no período"}
              valor={pacote.verCustos
                ? formatarMoeda(resumo.noPeriodo.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0))
                : String(resumo.noPeriodo.length)}
            />
            <Mini rotulo="CA vencido" valor={String(resumo.vencidos.length)} />
          </div>
        </article>

        <article className="cartao dash-bloco">
          <div className="dash-bloco-topo">
            <div>
              <h3>Movimentos recentes</h3>
              <p>Entradas e entregas desta obra</p>
            </div>
            <span className="dash-ao-vivo">Atualizado</span>
          </div>
          {resumo.movimentos.length ? (
            <ul className="dash-lista">
              {resumo.movimentos.map((item) => (
                <li key={item.id}>
                  <span className={`dash-ponto ${item.tipo}`} aria-hidden="true" />
                  <div>
                    <strong>{item.titulo}</strong>
                    <p>{item.detalhe}</p>
                  </div>
                  <time>{tempoRelativo(item.quando)}</time>
                </li>
              ))}
            </ul>
          ) : <p className="vazio">Ainda não há entrada nem entrega nesta obra.</p>}
          <button className="dash-link" type="button" onClick={() => { guardarPeriodo("entregas", de, ate); ir("entregas"); }}>
            Ver entregas <ArrowRight size={16} aria-hidden="true" />
          </button>
        </article>
      </div>

      <div className="dash-baixo">
        <article className="cartao dash-bloco">
          <div className="dash-bloco-topo">
            <div>
              <h3>Ações rápidas</h3>
              <p>Atalhos do dia a dia</p>
            </div>
          </div>
          <div className="dash-acoes">
            <Acao cor="#184a4e" icone={<Box size={18} aria-hidden="true" />} titulo="Lançar entrada" texto="Chegada de EPI na obra" onClick={() => ir("entradas")} />
            <Acao cor="#1f7a4d" icone={<Package size={18} aria-hidden="true" />} titulo="Registrar entrega" texto="Saída para o colaborador" onClick={() => ir("entregas")} />
            <Acao cor="#c2410c" icone={<Warehouse size={18} aria-hidden="true" />} titulo="Ver estoque" texto="Saldos, CA e preços" onClick={() => ir("estoque")} />
            <Acao cor="#6d28d9" icone={<Bell size={18} aria-hidden="true" />} titulo="Avisos de troca" texto="Proteção auditiva em atraso" onClick={() => ir("avisos")} />
          </div>
        </article>

        <article className="cartao dash-bloco">
          <div className="dash-bloco-topo">
            <div>
              <h3>Quem mais retirou</h3>
              <p>De {formatarData(de)} até {formatarData(ate)}</p>
            </div>
            <button className="dash-link" type="button" onClick={() => { guardarPeriodo("ranking", de, ate); ir("ranking"); }}>Ver ranking <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          {resumo.ranking.length ? (
            <ul className="dash-ranking">
              {resumo.ranking.map((item, indice) => {
                const pessoa = pacote.colaboradores.find((atual) => atual.id === item.colaboradorId);
                return (
                  <li key={item.colaboradorId}>
                    <span className="dash-avatar" style={{ background: cores[indice] }}>{iniciais(pessoa?.nome ?? "")}</span>
                    <div>
                      <button className="dash-link" type="button" onClick={() => { guardarPeriodo("entregas", de, ate, item.colaboradorId); ir("entregas"); }}>
                        {pessoa?.nome} <ArrowRight size={14} aria-hidden="true" />
                      </button>
                      <p>{pessoa?.funcao} · {pecas(item.quantidade)} · ver histórico</p>
                    </div>
                    <div className="dash-ranking-valor">
                      {pacote.verCustos ? formatarMoeda(item.custo) : pecas(item.quantidade)}
                      <span>{pacote.verCustos ? "custo" : "peças"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="vazio">Nenhuma retirada neste período.</p>}
        </article>
      </div>

      <article className="cartao dash-bloco">
        <div className="dash-bloco-topo">
          <div>
            <h3>Pendências</h3>
            <p>Itens que pedem atenção nesta obra</p>
          </div>
          <span className="dash-pendente-total">{resumo.vencidos.length + resumo.zerados.length + resumo.atrasos.length} pendências</span>
        </div>
        <div className="dash-pendentes">
          <Pendente
            tom="laranja"
            icone={<AlertTriangle size={18} aria-hidden="true" />}
            total={resumo.vencidos.length}
            titulo="CA vencido"
            texto="EPIs ativos com certificado fora da validade."
            acao="Ver estoque"
            onClick={() => ir("estoque")}
          />
          <Pendente
            tom="azul"
            icone={<Box size={18} aria-hidden="true" />}
            total={resumo.zerados.length}
            titulo="Saldo zerado"
            texto="Não há peça disponível para nova entrega."
            acao="Repor estoque"
            onClick={() => ir("entradas")}
          />
          <Pendente
            tom="vermelho"
            icone={<Headphones size={18} aria-hidden="true" />}
            total={resumo.atrasos.length}
            titulo="Troca auditiva"
            texto="Abafador ou plug fora do prazo de quem já recebeu."
            acao="Ver avisos"
            onClick={() => ir("avisos")}
          />
        </div>
      </article>
    </section>
  );
}

function HeroMetrica({ icone, valor, rotulo, nota }: { icone: ReactNode; valor: string; rotulo: string; nota: string }) {
  return (
    <div className="dash-kpi-hero">
      <div className="dash-kpi-hero-topo">{icone}<span>{rotulo}</span></div>
      <strong>{valor}</strong>
      <p>{nota}</p>
    </div>
  );
}

function CartaoIndicador({
  icone, cor, valor, rotulo, nota, progresso, legenda,
}: {
  icone: ReactNode;
  cor: string;
  valor: string;
  rotulo: string;
  nota: string;
  progresso: number;
  legenda: string;
}) {
  const pct = Math.max(0, Math.min(100, progresso));
  return (
    <article className="cartao dash-indicador">
      <div className="dash-indicador-topo">
        <span className="dash-icone" style={{ color: cor }}>{icone}</span>
      </div>
      <strong>{valor}</strong>
      <p className="dash-rotulo">{rotulo}</p>
      <p className="dash-nota">{nota}</p>
      <div className="dash-trilho claro" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
        <span style={{ width: `${pct}%`, background: cor }} />
      </div>
      <p className="dash-legenda">{legenda}</p>
    </article>
  );
}

function Mini({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="dash-mini">
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  );
}

function Acao({ cor, icone, titulo, texto, onClick }: { cor: string; icone: ReactNode; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button className="dash-acao" type="button" style={{ background: cor }} onClick={onClick}>
      {icone}
      <strong>{titulo}</strong>
      <span>{texto}</span>
    </button>
  );
}

function Pendente({
  tom, icone, total, titulo, texto, acao, onClick,
}: {
  tom: "laranja" | "azul" | "vermelho";
  icone: ReactNode;
  total: number;
  titulo: string;
  texto: string;
  acao: string;
  onClick: () => void;
}) {
  return (
    <article className={`dash-pendente ${tom}`}>
      <div className="dash-pendente-topo">{icone}<strong>{total}</strong></div>
      <h4>{titulo}</h4>
      <p>{texto}</p>
      <button type="button" onClick={onClick}>{acao}</button>
    </article>
  );
}
