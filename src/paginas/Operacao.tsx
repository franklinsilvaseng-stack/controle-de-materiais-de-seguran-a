import { useMemo, useState, type FormEvent } from "react";
import { ExternalLink, Search } from "lucide-react";
import { api } from "../lib/api";
import { avisosRuido, caVencido, custoColaborador, intervalosTroca, media, naoEEpi, rankingRetiradas, saldoEpi, ultimaEntrada } from "../lib/calculos";
import { useDados } from "../lib/dados";
import { formatarData, formatarMoeda, hojeIso, interpretarPlanilhaEntrada, interpretarPlanilhaEpi, interpretarValidade, lerCsv, lerInteiro, lerMoeda, mesAtual, normalizarCaLivre, textoDeArquivo } from "../lib/formato";
import { consumirPeriodo, guardarPeriodo } from "../lib/periodo";
import { useNavegar } from "../componentes/Shell";
import { useToast } from "../componentes/Toast";
import { Exportar, Titulo, Vazio } from "../componentes/Ui";
import { UNIDADES, type CaOficial, type Colaborador, type Epi } from "../tipos";

const CONSULTA_CA = "https://caepi.trabalho.gov.br/internet/ConsultaCAInternet.aspx";

function useObra() {
  const dados = useDados();
  const obra = dados.pacote.obras.find((item) => item.id === dados.obraId) ?? null;
  return { ...dados, obra };
}

export function Obras() {
  const { token, pacote, atualizar } = useDados();
  const avisar = useToast();
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeIso());
  const [editando, setEditando] = useState<{ id: string; ativo: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);
  function limpar() {
    setEditando(null);
    setNome("");
    setDataInicio(hojeIso());
  }
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      atualizar(await api.salvarObra(token, editando
        ? { id: editando.id, nome, dataInicio, ativo: editando.ativo }
        : { nome, dataInicio, ativo: true }));
      avisar(editando ? "Obra alterada." : "Obra salva.");
      limpar();
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível salvar.", "erro");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section className="grade">
      <Titulo>Obras</Titulo>
      <form className="cartao grade" onSubmit={salvar}>
        {editando ? <h3>Alterar obra</h3> : null}
        <label className="campo">Nome da obra<input required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="campo">Início da obra<input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></label>
        <button className="botao" disabled={enviando} type="submit">{editando ? "Salvar alteração" : "Cadastrar obra"}</button>
        {editando ? <button className="botao-secundario" type="button" onClick={limpar}>Cancelar</button> : null}
      </form>
      {pacote.obras.length ? (
        <>
          <Exportar colunas={["Obra", "Início", "Situação"]} linhas={pacote.obras.map((obra) => [obra.nome, formatarData(obra.data_inicio), obra.ativo ? "Ativa" : "Inativa"])} />
          <table className="tabela">
            <thead><tr><th>Obra</th><th>Início</th><th></th></tr></thead>
            <tbody>
              {pacote.obras.map((obra) => (
                <tr key={obra.id}>
                  <td>{obra.nome}</td>
                  <td>{formatarData(obra.data_inicio)}</td>
                  <td className="acoes">
                    <button className="botao-secundario" type="button" onClick={() => {
                      setEditando({ id: obra.id, ativo: obra.ativo });
                      setNome(obra.nome);
                      setDataInicio(obra.data_inicio);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>Editar</button>
                    <button className="botao-secundario" type="button" onClick={async () => {
                      try {
                        atualizar(await api.salvarObra(token, { id: obra.id, nome: obra.nome, dataInicio: obra.data_inicio, ativo: !obra.ativo }));
                        avisar(obra.ativo ? "Obra inativada." : "Obra reativada.");
                      } catch (falha) {
                        avisar(falha instanceof Error ? falha.message : "Não foi possível atualizar.", "erro");
                      }
                    }}>{obra.ativo ? "Inativar" : "Reativar"}</button>
                    <button className="botao-perigo" type="button" onClick={async () => {
                      if (!window.confirm(`Excluir a obra "${obra.nome}"? Esta ação não pode ser desfeita.`)) return;
                      try {
                        atualizar(await api.excluir(token, "obra", obra.id));
                        if (editando?.id === obra.id) limpar();
                        avisar("Obra excluída.");
                      } catch (falha) {
                        avisar(falha instanceof Error ? falha.message : "Não foi possível excluir.", "erro");
                      }
                    }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : <Vazio>Nenhuma obra ainda. Cadastre a primeira.</Vazio>}
    </section>
  );
}

export function Estoque() {
  const { token, pacote, obra, atualizar } = useObra();
  const avisar = useToast();
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<string>("UN");
  const [ca, setCa] = useState("");
  const [validadeCa, setValidadeCa] = useState("");
  const [tipoRuido, setTipoRuido] = useState("nenhum");
  const [editando, setEditando] = useState<Epi | null>(null);
  const [oficial, setOficial] = useState<CaOficial | null>(null);
  const [buscandoCa, setBuscandoCa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [quantidadeEntrada, setQuantidadeEntrada] = useState("");
  const [dataEntrada, setDataEntrada] = useState(hojeIso());
  const [requisicaoEntrada, setRequisicaoEntrada] = useState("");
  const [nfEntrada, setNfEntrada] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [saldoEditando, setSaldoEditando] = useState<number | null>(null);
  if (!obra) return <Vazio>Cadastre uma obra antes dos EPIs.</Vazio>;
  const epis = pacote.epis.filter((item) => item.obra_id === obra.id);
  function limpar() {
    setEditando(null);
    setNome("");
    setUnidade("UN");
    setCa("");
    setValidadeCa("");
    setTipoRuido("nenhum");
    setOficial(null);
    setQuantidadeEntrada("");
    setDataEntrada(hojeIso());
    setRequisicaoEntrada("");
    setNfEntrada("");
    setValorEntrada("");
    setSaldoEditando(null);
  }
  function editar(epi: Epi) {
    setEditando(epi);
    setNome(epi.nome);
    setUnidade(epi.unidade);
    setCa(epi.ca ?? "");
    setValidadeCa(epi.validade_na ? "N/A" : epi.validade_ca ? formatarData(epi.validade_ca) : "");
    setTipoRuido(epi.tipo_ruido);
    setOficial(null);
    setQuantidadeEntrada("");
    setDataEntrada(hojeIso());
    setRequisicaoEntrada("");
    setNfEntrada("");
    setValorEntrada("");
    setSaldoEditando(saldoEpi(pacote.entradas, pacote.saidas, obra!.id, epi.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function buscarCa() {
    const texto = normalizarCaLivre(ca);
    if (texto === "N/A") {
      setCa("N/A");
      setOficial(null);
      setValidadeCa("N/A");
      return;
    }
    if (texto !== ca) setCa(texto);
    if (!texto.replace(/\D/g, "")) return;
    setBuscandoCa(true);
    try {
      const dados = await api.consultarCa(token, texto);
      setOficial(dados);
      if (dados.validade) setValidadeCa(formatarData(dados.validade));
    } catch (falha) {
      setOficial(null);
      avisar(falha instanceof Error ? falha.message : "Não foi possível consultar o CA.", "aviso");
    } finally {
      setBuscandoCa(false);
    }
  }
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const caNormal = normalizarCaLivre(ca);
    const validade = interpretarValidade(caNormal === "N/A" ? "N/A" : validadeCa);
    if (validade.erro) {
      avisar("A validade precisa ser uma data (dd/mm/aaaa) ou N/A.", "aviso");
      return;
    }
    const querEntrada = quantidadeEntrada.trim() !== "";
    const qtd = querEntrada ? lerInteiro(quantidadeEntrada) : null;
    const preco = querEntrada ? lerMoeda(valorEntrada) : null;
    if (querEntrada && (!qtd || preco == null || !requisicaoEntrada.trim() || !nfEntrada.trim())) {
      avisar("Para adicionar o saldo, informe a quantidade, a requisição, a nota fiscal e o valor.", "aviso");
      return;
    }
    setEnviando(true);
    try {
      const pacoteEpi = await api.salvarEpi(token, {
        id: editando?.id,
        obraId: obra!.id,
        nome,
        unidade,
        ca: caNormal,
        validadeCa: validade.iso,
        validadeNa: validade.na,
        tipoRuido,
        ativo: editando ? editando.ativo : true,
      });
      let pacoteFinal = pacoteEpi;
      if (querEntrada && qtd && preco != null) {
        const chave = (valor: string) => valor.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
        const epiId = editando?.id ?? pacoteEpi.epis.find((item) => item.obra_id === obra!.id && chave(item.nome) === chave(nome))?.id;
        if (!epiId) throw new Error("O material foi salvo, mas o saldo não entrou. Lance a quantidade em Entradas.");
        pacoteFinal = await api.salvarEntrada(token, {
          obraId: obra!.id,
          epiId,
          data: dataEntrada,
          quantidade: qtd,
          numeroRequisicao: requisicaoEntrada.trim(),
          numeroNf: nfEntrada.trim(),
          valorUnitario: preco,
          ca: caNormal,
          marca: "",
        });
      }
      atualizar(pacoteFinal);
      avisar(querEntrada ? "Saldo adicionado." : editando ? "EPI alterado." : "EPI salvo.");
      limpar();
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível salvar.", "erro");
    } finally {
      setEnviando(false);
    }
  }
  function baixarModeloEpi() {
    const csv = "Nome,Unidade,CA,Validade,Proteção auditiva\nLuva de Algodão Pigmentada,PAR,34491,27/12/2028,Não é proteção de ruído\nCreme de proteção,UN,N/A,N/A,Não é proteção de ruído\nProtetor auricular,PAR,,01/06/2027,Plug\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo-epis.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function importarEpis(arquivo: File) {
    const texto = await textoDeArquivo(arquivo);
    const planilha = interpretarPlanilhaEpi(texto);
    if (!planilha.length) {
      avisar("Nenhuma linha para importar. Use as colunas Nome, Unidade, CA, Validade e Proteção auditiva.", "aviso");
      return;
    }
    setImportando(true);
    const chave = (valor: string) => valor.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
    const conhecidos = new Map(epis.map((item) => [chave(item.nome), item]));
    let novos = 0;
    let alterados = 0;
    const problemas: string[] = [];
    let pacoteAtual = pacote;
    for (const item of planilha) {
      if (item.erro) {
        problemas.push(item.erro);
        continue;
      }
      const existente = conhecidos.get(chave(item.nome));
      try {
        pacoteAtual = await api.salvarEpi(token, {
          id: existente?.id,
          obraId: obra!.id,
          nome: item.nome,
          unidade: item.unidade,
          ca: item.ca,
          validadeCa: item.validadeCa,
          validadeNa: item.validadeNa,
          tipoRuido: item.tipoRuido,
          ativo: existente ? existente.ativo : true,
        });
        if (existente) alterados += 1;
        else {
          novos += 1;
          const criado = pacoteAtual.epis.find((epi) => epi.obra_id === obra!.id && chave(epi.nome) === chave(item.nome));
          if (criado) conhecidos.set(chave(item.nome), criado);
        }
      } catch (falha) {
        problemas.push(falha instanceof Error ? `${item.nome}: ${falha.message}` : item.nome);
      }
    }
    atualizar(pacoteAtual);
    setImportando(false);
    const resumo = `${novos} novo(s), ${alterados} atualizado(s).`;
    avisar(problemas.length ? `${resumo} ${problemas.length} linha(s) não entrou: ${problemas.slice(0, 3).join("; ")}` : `Importação concluída. ${resumo}`, problemas.length ? "aviso" : "sucesso");
  }
  function marcar(id: string) {
    setSelecionados((atual) => atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]);
  }
  async function excluirSelecionados() {
    const alvos = linhas.filter((item) => selecionados.includes(item.epi.id));
    if (!alvos.length) {
      avisar("Marque os EPIs que devem ser excluídos.", "aviso");
      return;
    }
    const listaNomes = alvos.map((item) => item.epi.nome).join(", ");
    if (!window.confirm(`Excluir ${alvos.length} EPI(s): ${listaNomes}? Esta ação não pode ser desfeita.`)) return;
    const problemas: string[] = [];
    let pacoteAtual = pacote;
    let excluidos = 0;
    for (const item of alvos) {
      try {
        pacoteAtual = await api.excluir(token, "epi", item.epi.id);
        excluidos += 1;
        if (editando?.id === item.epi.id) limpar();
      } catch (falha) {
        problemas.push(`${item.epi.nome}: ${falha instanceof Error ? falha.message : "não foi possível excluir"}`);
      }
    }
    atualizar(pacoteAtual);
    setSelecionados([]);
    avisar(problemas.length ? `${excluidos} excluído(s). ${problemas.slice(0, 2).join(" ")}` : `${excluidos} EPI(s) excluído(s).`, problemas.length ? "aviso" : "sucesso");
  }
  async function remover(epi: Epi) {
    if (!window.confirm(`Excluir o EPI "${epi.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      atualizar(await api.excluir(token, "epi", epi.id));
      if (editando?.id === epi.id) limpar();
      avisar("EPI excluído.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível excluir.", "erro");
    }
  }
  async function alternar(epi: Epi) {
    try {
      atualizar(await api.salvarEpi(token, {
        id: epi.id,
        obraId: epi.obra_id,
        nome: epi.nome,
        unidade: epi.unidade,
        ca: epi.ca ?? "",
        validadeCa: epi.validade_ca ?? "",
        validadeNa: Boolean(epi.validade_na),
        tipoRuido: epi.tipo_ruido,
        ativo: !epi.ativo,
      }));
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível atualizar.", "erro");
    }
  }
  const linhas = epis.map((epi) => {
    const saldo = saldoEpi(pacote.entradas, pacote.saidas, obra.id, epi.id);
    const ultima = ultimaEntrada(pacote.entradas, obra.id, epi.id);
    return { epi, saldo, ultima };
  });
  return (
    <section className="grade">
      <Titulo>Estoque de EPI</Titulo>
      <form className="cartao grade" onSubmit={salvar}>
        {editando ? <h3>Alterar EPI</h3> : null}
        <label className="campo">Nome<input required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="campo">Unidade
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>{UNIDADES.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <div className="campo">
          <label className="campo">CA
            <input
              value={ca}
              placeholder="Número ou N/A"
              onChange={(e) => { setCa(e.target.value); setOficial(null); }}
              onBlur={buscarCa}
            />
          </label>
          <div className="acoes">
            <button className="botao-secundario" type="button" disabled={buscandoCa || !ca.trim()} onClick={buscarCa}>
              <Search size={14} aria-hidden="true" /> {buscandoCa ? "Buscando..." : "Buscar na base do Ministério"}
            </button>
            <a className="link-ca" href={CONSULTA_CA} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden="true" /> Abrir o site do Ministério
            </a>
          </div>
          {oficial ? (
            <div className={`ca-oficial${oficial.situacao === "VÁLIDO" ? "" : " ca-alerta"}`}>
              <strong>CA {oficial.ca} · {oficial.situacao}{oficial.validade ? ` até ${formatarData(oficial.validade)}` : ""}</strong>
              {oficial.equipamento ? <span>{oficial.equipamento}</span> : null}
              {oficial.fabricante ? <span>Fabricante: {oficial.fabricante}{oficial.referencia ? ` · Ref. ${oficial.referencia}` : ""}</span> : null}
              {oficial.descricao ? <small>{oficial.descricao}</small> : null}
              <small>Base do Ministério atualizada em {formatarData(oficial.atualizado_em.slice(0, 10))}.</small>
            </div>
          ) : null}
        </div>
        <label className="campo">Validade do CA
          <input value={validadeCa} placeholder="dd/mm/aaaa ou N/A" onChange={(e) => setValidadeCa(e.target.value)} onBlur={() => {
            const validade = interpretarValidade(validadeCa);
            if (!validade.erro) setValidadeCa(validade.na ? "N/A" : validade.iso ? formatarData(validade.iso) : "");
          }} />
        </label>
        <p>Materiais que não são EPI, como protetor solar e colete, não têm CA nem validade. Escreva N/A no CA: a validade também fica N/A.</p>
        <label className="campo">Proteção auditiva
          <select value={tipoRuido} onChange={(e) => setTipoRuido(e.target.value)}>
            <option value="nenhum">Não é proteção de ruído</option>
            <option value="abafador">Abafador · aviso a cada 6 meses</option>
            <option value="plug">Plug · aviso a cada 15 dias</option>
          </select>
        </label>
        <h3>{saldoEditando === 0 ? "Adicionar saldo neste item zerado" : "Adicionar saldo"}</h3>
        <p>{saldoEditando === 0 ? "Este material ainda não tem entrada. Informe a quantidade, por exemplo 40, junto com a requisição, a nota e o valor." : "Deixe a quantidade em branco para só alterar o cadastro. Preencha para lançar uma entrada."}</p>
        <label className="campo">Quantidade<input inputMode="numeric" value={quantidadeEntrada} placeholder="40" onChange={(e) => setQuantidadeEntrada(e.target.value)} /></label>
        {quantidadeEntrada.trim() ? (
          <>
            <label className="campo">Data da entrada<input type="date" required value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} /></label>
            <label className="campo">Nº da requisição<input required value={requisicaoEntrada} onChange={(e) => setRequisicaoEntrada(e.target.value)} /></label>
            <label className="campo">Nº da nota fiscal<input required value={nfEntrada} onChange={(e) => setNfEntrada(e.target.value)} /></label>
            <label className="campo">Valor unitário<input required value={valorEntrada} placeholder="0,00" onChange={(e) => setValorEntrada(e.target.value)} /></label>
          </>
        ) : null}
        <button className="botao" disabled={enviando} type="submit">{quantidadeEntrada.trim() ? "Salvar e adicionar saldo" : editando ? "Salvar alteração" : "Salvar EPI"}</button>
        {editando ? <button className="botao-secundario" type="button" onClick={limpar}>Cancelar</button> : null}
      </form>
      <div className="cartao grade">
        <p>Importe um arquivo separado por vírgula, com as colunas Nome, Unidade, CA, Validade e Proteção auditiva. Se o material não é EPI, use N/A no CA; a validade também fica N/A. O nome que já existir nesta obra é atualizado.</p>
        <div className="acoes">
          <label className="botao-secundario">
            {importando ? "Importando..." : "Importar arquivo"}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              disabled={importando}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = "";
                if (arquivo) void importarEpis(arquivo);
              }}
            />
          </label>
          <button className="botao-secundario" type="button" onClick={baixarModeloEpi}>Baixar modelo</button>
        </div>
      </div>
      {linhas.length ? (
        <>
          <Exportar
            colunas={["EPI", "Unidade", "Saldo", "Preço vigente", "NF", "Requisição", "CA"]}
            linhas={linhas.map((item) => [item.epi.nome, item.epi.unidade, String(item.saldo), formatarMoeda(item.ultima?.valor_unitario), item.ultima?.numero_nf ?? "", item.ultima?.numero_requisicao ?? "", item.epi.ca ?? ""])}
          />
          <button className="botao-perigo" type="button" disabled={!selecionados.length} onClick={() => void excluirSelecionados()}>
            Excluir selecionados{selecionados.length ? ` (${selecionados.length})` : ""}
          </button>
          <table className="tabela">
            <thead>
              <tr>
                <th>
                  <label className="marcar">
                    <input
                      type="checkbox"
                      checked={linhas.length > 0 && linhas.every((item) => selecionados.includes(item.epi.id))}
                      onChange={(evento) => setSelecionados(evento.target.checked ? linhas.map((item) => item.epi.id) : [])}
                    />
                    Selecionar
                  </label>
                </th>
                <th>EPI</th><th>Saldo</th><th>Preço vigente</th><th>NF</th><th>Requisição</th><th></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((item) => (
                <tr key={item.epi.id} className={item.saldo <= 0 ? "linha-zero" : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${item.epi.nome}`}
                      checked={selecionados.includes(item.epi.id)}
                      onChange={() => marcar(item.epi.id)}
                    />
                  </td>
                  <td>
                    {item.epi.nome}
                    {naoEEpi(item.epi) ? <div><small>Não é EPI · CA e validade N/A</small></div> : item.epi.ca || item.epi.validade_na ? <div><small>CA {item.epi.ca || "—"}{item.epi.validade_na ? " · validade N/A" : item.epi.validade_ca ? ` · até ${formatarData(item.epi.validade_ca)}` : ""}</small></div> : null}
                    {caVencido(item.epi, hojeIso()) ? <div className="negativo">CA vencido</div> : null}
                    {item.saldo <= 0 && item.epi.ativo ? <div><small>Sem saldo. Use Editar para adicionar a quantidade.</small></div> : null}
                    {!item.epi.ativo ? <div><small>Inativo</small></div> : null}
                  </td>
                  <td>{item.saldo} {item.epi.unidade}</td>
                  <td>{formatarMoeda(item.ultima?.valor_unitario)}</td>
                  <td>{item.ultima?.numero_nf ?? "—"}</td>
                  <td>{item.ultima?.numero_requisicao ?? "—"}</td>
                  <td className="acoes">
                    <button className="botao-secundario" type="button" onClick={() => editar(item.epi)}>Editar</button>
                    <button className="botao-secundario" type="button" onClick={() => alternar(item.epi)}>{item.epi.ativo ? "Inativar" : "Reativar"}</button>
                    <button className="botao-perigo" type="button" onClick={() => remover(item.epi)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : <Vazio>Nenhum EPI nesta obra. Cadastre o primeiro.</Vazio>}
    </section>
  );
}

export function Entradas() {
  const { token, pacote, obra, atualizar } = useObra();
  const avisar = useToast();
  const [epiId, setEpiId] = useState("");
  const [data, setData] = useState(hojeIso());
  const [quantidade, setQuantidade] = useState("1");
  const [requisicao, setRequisicao] = useState("");
  const [nf, setNf] = useState("");
  const [valor, setValor] = useState("");
  const [ca, setCa] = useState("");
  const [marca, setMarca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [excluindo, setExcluindo] = useState(false);
  if (!obra) return <Vazio>Cadastre uma obra antes de lançar entradas.</Vazio>;
  const epis = pacote.epis.filter((item) => item.obra_id === obra.id && item.ativo);
  const lista = pacote.entradas.filter((item) => item.obra_id === obra.id);
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const qtd = lerInteiro(quantidade);
    const preco = lerMoeda(valor);
    if (!epiId || !qtd || preco == null) {
      avisar("Informe EPI, quantidade inteira e valor.", "aviso");
      return;
    }
    setEnviando(true);
    try {
      atualizar(await api.salvarEntrada(token, {
        obraId: obra!.id,
        epiId,
        data,
        quantidade: qtd,
        numeroRequisicao: requisicao.trim(),
        numeroNf: nf.trim(),
        valorUnitario: preco,
        ca: normalizarCaLivre(ca),
        marca: marca.trim(),
      }));
      avisar("Entrada lançada.");
      setQuantidade("1");
      setRequisicao("");
      setNf("");
      setValor("");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível lançar.", "erro");
    } finally {
      setEnviando(false);
    }
  }
  async function sugerirMarca() {
    const texto = normalizarCaLivre(ca);
    if (texto === "N/A") {
      setCa("N/A");
      return;
    }
    if (texto !== ca) setCa(texto);
    if (marca.trim() || !texto.replace(/\D/g, "")) return;
    try {
      const oficial = await api.consultarCa(token, texto);
      if (oficial.fabricante) setMarca(oficial.fabricante.slice(0, 80));
      if (oficial.ca) setCa(oficial.ca);
    } catch {
      // O CA digitado permanece mesmo quando não está na base do Ministério.
    }
  }
  function baixarModeloEntrada() {
    const csv = "Material,Data,Quantidade,Requisição,NF,Valor unitário,CA,Marca\nLuva de Algodão Pigmentada,30/09/2026,10,1234,5678,\"12,50\",34491,Kalipso\nProtetor solar FPS 60,30/09/2026,10,1234,5678,\"16,21\",N/A,Sunlau\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo-entradas.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function importarEntradas(arquivo: File) {
    const texto = await textoDeArquivo(arquivo);
    const planilha = interpretarPlanilhaEntrada(texto);
    if (!planilha.length) {
      avisar("Nenhuma linha para importar. Use as colunas Material, Data, Quantidade, Requisição, NF, Valor unitário, CA e Marca.", "aviso");
      return;
    }
    setImportando(true);
    const chave = (valorNome: string) => valorNome.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
    const episPorNome = new Map(epis.map((item) => [chave(item.nome), item]));
    let lancadas = 0;
    const problemas: string[] = [];
    let pacoteAtual = pacote;
    for (const item of planilha) {
      if (item.erro) {
        problemas.push(item.erro);
        continue;
      }
      const epi = episPorNome.get(chave(item.epi));
      if (!epi) {
        problemas.push(`${item.epi}: material não encontrado ou inativo nesta obra.`);
        continue;
      }
      try {
        pacoteAtual = await api.salvarEntrada(token, {
          obraId: obra!.id,
          epiId: epi.id,
          data: item.data,
          quantidade: item.quantidade,
          numeroRequisicao: item.numeroRequisicao,
          numeroNf: item.numeroNf,
          valorUnitario: item.valorUnitario,
          ca: item.ca || epi.ca || "",
          marca: item.marca,
        });
        lancadas += 1;
      } catch (falha) {
        problemas.push(falha instanceof Error ? `${item.epi}: ${falha.message}` : item.epi);
      }
    }
    atualizar(pacoteAtual);
    setImportando(false);
    const resumo = `${lancadas} entrada(s) lançada(s).`;
    avisar(problemas.length ? `${resumo} ${problemas.length} linha(s) não entrou: ${problemas.slice(0, 3).join("; ")}` : `Importação concluída. ${resumo}`, problemas.length ? "aviso" : "sucesso");
  }
  function marcar(id: string) {
    setSelecionados((atual) => atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]);
  }
  async function excluirSelecionados() {
    const alvos = lista.filter((item) => selecionados.includes(item.id));
    if (!alvos.length) {
      avisar("Marque as entradas que devem ser excluídas.", "aviso");
      return;
    }
    const nomes = alvos.slice(0, 3).map((item) => pacote.epis.find((epi) => epi.id === item.epi_id)?.nome ?? "material").join(", ");
    const resto = alvos.length > 3 ? ` e mais ${alvos.length - 3}` : "";
    if (!window.confirm(`Excluir ${alvos.length} entrada(s): ${nomes}${resto}? O saldo diminui. Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    const problemas: string[] = [];
    let pacoteAtual = pacote;
    let excluidos = 0;
    for (const item of alvos) {
      try {
        pacoteAtual = await api.excluir(token, "entrada", item.id);
        excluidos += 1;
      } catch (falha) {
        problemas.push(falha instanceof Error ? falha.message : "Não foi possível excluir.");
      }
    }
    atualizar(pacoteAtual);
    setSelecionados([]);
    setExcluindo(false);
    avisar(problemas.length ? `${excluidos} excluída(s). ${problemas[0]}` : `${excluidos} entrada(s) excluída(s).`, problemas.length ? "aviso" : "sucesso");
  }
  const marcados = lista.filter((item) => selecionados.includes(item.id));
  return (
    <section className="grade">
      <Titulo>Entradas</Titulo>
      <form className="cartao grade" onSubmit={salvar}>
        <label className="campo">EPI<select required value={epiId} onChange={(e) => {
          const id = e.target.value;
          setEpiId(id);
          setCa(epis.find((item) => item.id === id)?.ca ?? "");
          setMarca("");
        }}><option value="">Selecione</option>{epis.map((epi) => <option key={epi.id} value={epi.id}>{epi.nome}</option>)}</select></label>
        <label className="campo">CA do EPI<input value={ca} placeholder="Número ou N/A" onChange={(e) => setCa(e.target.value)} onBlur={() => { void sugerirMarca(); }} /></label>
        <label className="campo">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={80} /></label>
        <label className="campo">Data<input type="date" required value={data} onChange={(e) => setData(e.target.value)} /></label>
        <label className="campo">Quantidade<input inputMode="numeric" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label>
        <label className="campo">Nº da requisição<input required value={requisicao} onChange={(e) => setRequisicao(e.target.value)} /></label>
        <label className="campo">Nº da nota fiscal<input required value={nf} onChange={(e) => setNf(e.target.value)} /></label>
        <label className="campo">Valor unitário<input required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></label>
        <button className="botao" disabled={enviando} type="submit">Lançar entrada</button>
      </form>
      <div className="cartao grade">
        <p>Importe um arquivo separado por vírgula, com as colunas Material, Data, Quantidade, Requisição, NF, Valor unitário, CA e Marca. Cada linha lança uma entrada nova nesta obra. O nome precisa ser o mesmo do cadastro. Se o material não é EPI, use N/A no CA.</p>
        <div className="acoes">
          <label className="botao-secundario">
            {importando ? "Importando..." : "Importar arquivo"}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              disabled={importando}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = "";
                if (arquivo) void importarEntradas(arquivo);
              }}
            />
          </label>
          <button className="botao-secundario" type="button" onClick={baixarModeloEntrada}>Baixar modelo</button>
        </div>
      </div>
      {lista.length ? (
        <>
          <Exportar colunas={["Data", "EPI", "CA", "Marca", "Qtd", "Requisição", "NF", "Valor"]} linhas={lista.map((item) => [formatarData(item.data), pacote.epis.find((epi) => epi.id === item.epi_id)?.nome ?? "", item.ca ?? "", item.marca ?? "", String(item.quantidade), item.numero_requisicao, item.numero_nf, formatarMoeda(item.valor_unitario)])} />
          <button className="botao-perigo" type="button" disabled={!marcados.length || excluindo} onClick={() => void excluirSelecionados()}>
            {excluindo ? "Excluindo..." : `Excluir selecionados${marcados.length ? ` (${marcados.length})` : ""}`}
          </button>
          <table className="tabela">
            <thead>
              <tr>
                <th>
                  <label className="marcar">
                    <input
                      type="checkbox"
                      checked={lista.length > 0 && lista.every((item) => selecionados.includes(item.id))}
                      onChange={(evento) => setSelecionados(evento.target.checked ? lista.map((item) => item.id) : [])}
                    />
                    Selecionar
                  </label>
                </th>
                <th>Data</th><th>EPI</th><th>CA</th><th>Marca</th><th>Qtd</th><th>Requisição</th><th>NF</th><th>Valor</th>
              </tr>
            </thead>
            <tbody>{lista.map((item) => {
              const nome = pacote.epis.find((epi) => epi.id === item.epi_id)?.nome ?? "";
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${nome} de ${formatarData(item.data)}`}
                      checked={selecionados.includes(item.id)}
                      onChange={() => marcar(item.id)}
                    />
                  </td>
                  <td>{formatarData(item.data)}</td>
                  <td>{nome}</td>
                  <td>{item.ca || "—"}</td>
                  <td>{item.marca || "—"}</td>
                  <td>{item.quantidade}</td>
                  <td>{item.numero_requisicao}</td>
                  <td>{item.numero_nf}</td>
                  <td>{formatarMoeda(item.valor_unitario)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </>
      ) : <Vazio>Nenhuma entrada nesta obra.</Vazio>}
    </section>
  );
}

const MOTIVO_AD: Record<string, string> = {
  perda: "Perda",
  dano: "Dano",
  extravio: "Extravio",
  nao_devolucao: "Não devolução",
};

export function Entregas() {
  const { token, pacote, obra, atualizar } = useObra();
  const avisar = useToast();
  const [epiId, setEpiId] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");
  const [data, setData] = useState(hojeIso());
  const [quantidade, setQuantidade] = useState("1");
  const [ficha, setFicha] = useState(false);
  const [gerarAd, setGerarAd] = useState(false);
  const [numeroAd, setNumeroAd] = useState("");
  const [motivoAd, setMotivoAd] = useState("perda");
  const [enviando, setEnviando] = useState(false);
  const [periodoInicial] = useState(() => consumirPeriodo("entregas"));
  const [de, setDe] = useState(periodoInicial?.inicio ?? "");
  const [ate, setAte] = useState(periodoInicial?.fim ?? "");
  const [pessoaFiltro, setPessoaFiltro] = useState(periodoInicial?.colaboradorId ?? "");
  if (!obra) return <Vazio>Cadastre uma obra antes das entregas.</Vazio>;
  const epis = pacote.epis.filter((item) => item.obra_id === obra.id && item.ativo);
  const pessoas = pacote.colaboradores.filter((item) => item.obra_id === obra.id && item.ativo);
  const epi = epis.find((item) => item.id === epiId);
  const lista = pacote.saidas.filter((item) => {
    if (item.obra_id !== obra.id) return false;
    if (pessoaFiltro && item.colaborador_id !== pessoaFiltro) return false;
    const dia = item.data.slice(0, 10);
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    return true;
  });
  const autorizacoes = lista.filter((item) => item.numero_ad);
  const totalAd = pacote.verCustos
    ? autorizacoes.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0)
    : null;
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const qtd = lerInteiro(quantidade);
    if (!epiId || !colaboradorId || !qtd) {
      avisar("Escolha o EPI, o colaborador e a quantidade.", "aviso");
      return;
    }
    if (!ficha) {
      avisar("Confirme que orientou a assinatura da Ficha de EPI.", "aviso");
      return;
    }
    if (gerarAd && !numeroAd.trim()) {
      avisar("Informe o número da AD - Autorização de Desconto.", "aviso");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await api.salvarSaida(token, {
        obraId: obra!.id,
        epiId,
        colaboradorId,
        data,
        quantidade: qtd,
        fichaOrientada: true,
        numeroAd: gerarAd ? numeroAd.trim() : "",
        motivoAd: gerarAd ? motivoAd : "",
      });
      atualizar(resposta.pacote);
      if (resposta.avisoCa) avisar(resposta.avisoCa, "aviso");
      else avisar(gerarAd ? "Entrega registrada com AD - Autorização de Desconto." : "Entrega registrada.");
      setFicha(false);
      setGerarAd(false);
      setNumeroAd("");
      setMotivoAd("perda");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível registrar.", "erro");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section className="grade">
      <Titulo>Entregas</Titulo>
      <form className="cartao grade" onSubmit={salvar}>
        <label className="campo">EPI<select required value={epiId} onChange={(e) => setEpiId(e.target.value)}><option value="">Selecione</option>{epis.map((item) => <option key={item.id} value={item.id}>{item.nome} · saldo {saldoEpi(pacote.entradas, pacote.saidas, obra.id, item.id)}</option>)}</select></label>
        {epi && caVencido(epi, data) ? <p className="erro">O CA deste EPI está vencido. A entrega pode seguir, com este aviso.</p> : null}
        <label className="campo">Colaborador<select required value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}><option value="">Selecione</option>{pessoas.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.matricula} · {item.funcao}</option>)}</select></label>
        <label className="campo">Data<input type="date" required value={data} onChange={(e) => setData(e.target.value)} /></label>
        <label className="campo">Quantidade<input inputMode="numeric" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label>
        <label className="campo"><span><input type="checkbox" checked={ficha} onChange={(e) => setFicha(e.target.checked)} /> Orientei a pessoa a assinar a Ficha de EPI</span></label>
        <label className="campo"><span><input type="checkbox" checked={gerarAd} onChange={(e) => setGerarAd(e.target.checked)} /> Gerar AD - Autorização de Desconto</span></label>
        {gerarAd ? (
          <>
            <p>Use quando o valor deste EPI deve ser descontado do colaborador.</p>
            <label className="campo">Número da AD<input required value={numeroAd} onChange={(e) => setNumeroAd(e.target.value)} maxLength={40} /></label>
            <label className="campo">Motivo
              <select value={motivoAd} onChange={(e) => setMotivoAd(e.target.value)}>
                <option value="perda">Perda</option>
                <option value="dano">Dano</option>
                <option value="extravio">Extravio</option>
                <option value="nao_devolucao">Não devolução</option>
              </select>
            </label>
          </>
        ) : null}
        <button className="botao" disabled={enviando} type="submit">Registrar entrega</button>
      </form>
      <div className="acoes">
        <label className="campo">De<input type="date" value={de} max={ate || undefined} onChange={(evento) => setDe(evento.target.value)} /></label>
        <label className="campo">Até<input type="date" value={ate} min={de || undefined} onChange={(evento) => setAte(evento.target.value)} /></label>
        <label className="campo">Colaborador
          <select value={pessoaFiltro} onChange={(evento) => setPessoaFiltro(evento.target.value)}>
            <option value="">Todos</option>
            {pacote.colaboradores.filter((item) => item.obra_id === obra.id).map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.matricula}</option>)}
          </select>
        </label>
        {de || ate || pessoaFiltro ? <button className="botao-secundario" type="button" onClick={() => { setDe(""); setAte(""); setPessoaFiltro(""); }}>Limpar filtro</button> : null}
      </div>
      {lista.length ? (
        <>
          {autorizacoes.length ? <p>{autorizacoes.length} AD - Autorização de Desconto{totalAd != null ? ` · ${formatarMoeda(totalAd)} a descontar` : ""}</p> : null}
          {pacote.verCustos ? <p>Custo destas entregas: {formatarMoeda(lista.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0))}</p> : null}
          <Exportar
            colunas={["Data", "Colaborador", "Matrícula", "EPI", "Qtd", "NF", "Requisição", "AD", "Motivo", ...(pacote.verCustos ? ["Custo"] : [])]}
            linhas={lista.map((item) => [
              formatarData(item.data),
              pacote.colaboradores.find((pessoa) => pessoa.id === item.colaborador_id)?.nome ?? "",
              pacote.colaboradores.find((pessoa) => pessoa.id === item.colaborador_id)?.matricula ?? "",
              pacote.epis.find((itemEpi) => itemEpi.id === item.epi_id)?.nome ?? "",
              String(item.quantidade),
              item.numero_nf,
              item.numero_requisicao,
              item.numero_ad ?? "",
              item.motivo_ad ? MOTIVO_AD[item.motivo_ad] ?? "" : "",
              ...(pacote.verCustos ? [formatarMoeda(item.quantidade * (item.valor_unitario ?? 0))] : []),
            ])}
          />
          <table className="tabela">
            <thead><tr><th>Data</th><th>Colaborador</th><th>Matrícula</th><th>EPI</th><th>Qtd</th><th>NF</th><th>AD</th>{pacote.verCustos ? <th>Custo</th> : null}</tr></thead>
            <tbody>
              {lista.map((item) => {
                const pessoa = pacote.colaboradores.find((atual) => atual.id === item.colaborador_id);
                const custo = item.quantidade * (item.valor_unitario ?? 0);
                return <tr key={item.id}><td>{formatarData(item.data)}</td><td>{pessoa?.nome}</td><td>{pessoa?.matricula ?? "—"}</td><td>{pacote.epis.find((itemEpi) => itemEpi.id === item.epi_id)?.nome}</td><td>{item.quantidade}</td><td>{item.numero_nf}</td><td>{item.numero_ad ? `${item.numero_ad} · ${MOTIVO_AD[item.motivo_ad ?? ""] ?? ""}` : "—"}</td>{pacote.verCustos ? <td>{formatarMoeda(custo)}</td> : null}</tr>;
              })}
              {pacote.verCustos ? <tr><td colSpan={7}>Total</td><td>{formatarMoeda(lista.reduce((total, item) => total + item.quantidade * (item.valor_unitario ?? 0), 0))}</td></tr> : null}
            </tbody>
          </table>
        </>
      ) : <Vazio>{pessoaFiltro ? "Nenhuma entrega deste colaborador nesse filtro." : de || ate ? "Nenhuma entrega neste período." : "Nenhuma entrega nesta obra."}</Vazio>}
    </section>
  );
}

export function Colaboradores() {
  const { token, pacote, obra, atualizar } = useObra();
  const avisar = useToast();
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [funcao, setFuncao] = useState("");
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaMatricula, setBuscaMatricula] = useState("");
  const [buscaCargo, setBuscaCargo] = useState("");
  if (!obra) return <Vazio>Cadastre uma obra antes dos colaboradores.</Vazio>;
  const lista = pacote.colaboradores.filter((item) => item.obra_id === obra.id);
  const contem = (valor: string, busca: string) => {
    const normal = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
    return !busca.trim() || normal(valor).includes(normal(busca));
  };
  const filtrados = lista.filter((item) => contem(item.nome, buscaNome) && contem(item.matricula, buscaMatricula) && contem(item.funcao, buscaCargo));
  function limpar() {
    setEditando(null);
    setNome("");
    setMatricula("");
    setFuncao("");
  }
  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      atualizar(await api.salvarColaborador(token, {
        id: editando?.id,
        obraId: obra!.id,
        nome,
        matricula,
        funcao,
        ativo: editando ? editando.ativo : true,
      }));
      avisar(editando ? "Colaborador alterado." : "Colaborador salvo.");
      limpar();
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível salvar.", "erro");
    } finally {
      setEnviando(false);
    }
  }
  function baixarModelo() {
    const csv = "Nome,Matrícula,Função\nJoão da Silva,1020,Pedreiro\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo-colaboradores.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function importarArquivo(arquivo: File) {
    const texto = await textoDeArquivo(arquivo);
    const linhas = lerCsv(texto);
    if (!linhas.length) {
      avisar("O arquivo está vazio.", "aviso");
      return;
    }
    const cabecalho = linhas[0].map((item) => item.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase());
    const indice = {
      nome: cabecalho.findIndex((item) => item === "nome"),
      matricula: cabecalho.findIndex((item) => item === "matricula"),
      funcao: cabecalho.findIndex((item) => item === "funcao" || item === "cargo"),
    };
    const temCabecalho = indice.nome >= 0 && indice.matricula >= 0 && indice.funcao >= 0;
    const dados = (temCabecalho ? linhas.slice(1) : linhas).map((linha) => ({
      nome: (temCabecalho ? linha[indice.nome] : linha[0]) ?? "",
      matricula: (temCabecalho ? linha[indice.matricula] : linha[1]) ?? "",
      funcao: (temCabecalho ? linha[indice.funcao] : linha[2]) ?? "",
    })).filter((item) => {
      const nome = item.nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      const matricula = item.matricula.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      if (nome === "nome" && matricula.startsWith("matricula")) return false;
      return Boolean(item.nome || item.matricula || item.funcao);
    });
    if (!dados.length) {
      avisar("Nenhuma linha para importar. Use as colunas Nome, Matrícula e Função.", "aviso");
      return;
    }
    setImportando(true);
    const conhecidos = new Map(lista.map((item) => [item.matricula.trim(), item]));
    let novos = 0;
    let alterados = 0;
    const problemas: string[] = [];
    let pacoteAtual = pacote;
    for (const item of dados) {
      if (!item.nome.trim() || !item.matricula.trim() || !item.funcao.trim()) {
        problemas.push(`${item.matricula || item.nome || "linha"} sem nome, matrícula ou função`);
        continue;
      }
      const existente = conhecidos.get(item.matricula.trim());
      try {
        pacoteAtual = await api.salvarColaborador(token, {
          id: existente?.id,
          obraId: obra!.id,
          nome: item.nome.trim(),
          matricula: item.matricula.trim(),
          funcao: item.funcao.trim(),
          ativo: existente ? existente.ativo : true,
        });
        if (existente) alterados += 1;
        else {
          novos += 1;
          const criado = pacoteAtual.colaboradores.find((pessoa) => pessoa.obra_id === obra!.id && pessoa.matricula.trim() === item.matricula.trim());
          if (criado) conhecidos.set(item.matricula.trim(), criado);
        }
      } catch (falha) {
        problemas.push(falha instanceof Error ? `${item.matricula}: ${falha.message}` : item.matricula);
      }
    }
    atualizar(pacoteAtual);
    setImportando(false);
    const resumo = `${novos} novo(s), ${alterados} atualizado(s).`;
    avisar(problemas.length ? `${resumo} ${problemas.length} linha(s) não entrou: ${problemas.slice(0, 3).join("; ")}` : `Importação concluída. ${resumo}`, problemas.length ? "aviso" : "sucesso");
  }
  async function remover(item: Colaborador) {
    if (!window.confirm(`Excluir o colaborador "${item.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      atualizar(await api.excluir(token, "colaborador", item.id));
      if (editando?.id === item.id) limpar();
      avisar("Colaborador excluído.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível excluir.", "erro");
    }
  }
  return (
    <section className="grade">
      <Titulo>Colaboradores</Titulo>
      <form className="cartao grade" onSubmit={salvar}>
        <label className="campo">Nome<input required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="campo">Matrícula<input required value={matricula} onChange={(e) => setMatricula(e.target.value)} /></label>
        <label className="campo">Função<input required value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Pedreiro" /></label>
        <button className="botao" disabled={enviando} type="submit">{editando ? "Salvar alteração" : "Salvar"}</button>
        {editando ? <button className="botao-secundario" type="button" onClick={limpar}>Cancelar</button> : null}
      </form>
      <div className="cartao grade">
        <p>Importe um arquivo separado por vírgula, com as colunas Nome, Matrícula e Função. A matrícula que já existir nesta obra é atualizada.</p>
        <div className="acoes">
          <label className="botao-secundario">
            {importando ? "Importando..." : "Importar arquivo"}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              disabled={importando}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = "";
                if (arquivo) void importarArquivo(arquivo);
              }}
            />
          </label>
          <button className="botao-secundario" type="button" onClick={baixarModelo}>Baixar modelo</button>
        </div>
      </div>
      {lista.length ? (
        <>
          <div
            className="cartao grade grade-3"
            onKeyDown={(evento) => {
              if (evento.key !== "Escape") return;
              evento.preventDefault();
              setBuscaNome("");
              setBuscaMatricula("");
              setBuscaCargo("");
            }}
          >
            <label className="campo">Nome<input value={buscaNome} onChange={(e) => setBuscaNome(e.target.value)} placeholder="Parte do nome" /></label>
            <label className="campo">Matrícula<input value={buscaMatricula} onChange={(e) => setBuscaMatricula(e.target.value)} placeholder="Número da matrícula" /></label>
            <label className="campo">Cargo<input value={buscaCargo} onChange={(e) => setBuscaCargo(e.target.value)} placeholder="Função" /></label>
          </div>
          <p>{filtrados.length === lista.length ? `${lista.length} colaboradores` : `${filtrados.length} de ${lista.length} colaboradores`}</p>
          <Exportar colunas={["Nome", "Matrícula", "Função", "Situação"]} linhas={filtrados.map((item) => [item.nome, item.matricula, item.funcao, item.ativo ? "Ativo" : "Inativo"])} />
          {filtrados.length ? (
          <table className="tabela">
            <thead><tr><th>Nome</th><th>Matrícula</th><th>Função</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}{!item.ativo ? <div><small>Inativo</small></div> : null}</td>
                  <td>{item.matricula}</td>
                  <td>{item.funcao}</td>
                  <td className="acoes">
                    <button className="botao-secundario" type="button" onClick={() => {
                      setEditando(item);
                      setNome(item.nome);
                      setMatricula(item.matricula);
                      setFuncao(item.funcao);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>Editar</button>
                    <button className="botao-secundario" type="button" onClick={async () => {
                      try {
                        atualizar(await api.salvarColaborador(token, { id: item.id, obraId: item.obra_id, nome: item.nome, matricula: item.matricula, funcao: item.funcao, ativo: !item.ativo }));
                      } catch (falha) {
                        avisar(falha instanceof Error ? falha.message : "Não foi possível atualizar.", "erro");
                      }
                    }}>{item.ativo ? "Inativar" : "Reativar"}</button>
                    <button className="botao-perigo" type="button" onClick={() => remover(item)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : <Vazio>Nenhum colaborador encontrado com esses filtros.</Vazio>}
        </>
      ) : <Vazio>Nenhum colaborador nesta obra.</Vazio>}
    </section>
  );
}

export function Custos() {
  const { pacote, obra } = useObra();
  const [modo, setModo] = useState<"obra" | "mes">("obra");
  const [mes, setMes] = useState(mesAtual());
  const [funcao, setFuncao] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  if (!pacote.verCustos) return <Vazio>O custo por colaborador fica visível só para o administrador e para quem ele autorizar.</Vazio>;
  if (!obra) return <Vazio>Cadastre uma obra para consultar custos.</Vazio>;
  const pessoas = pacote.colaboradores.filter((item) => item.obra_id === obra.id && (!funcao || item.funcao.toLocaleLowerCase("pt-BR") === funcao.toLocaleLowerCase("pt-BR")) && (!pessoaId || item.id === pessoaId));
  const funcoes = [...new Set(pacote.colaboradores.filter((item) => item.obra_id === obra.id).map((item) => item.funcao))];
  const periodo = modo === "mes" ? mes : null;
  const linhas = pessoas.map((pessoa) => ({
    pessoa,
    custo: custoColaborador(pacote.saidas, pessoa.id, obra.data_inicio, periodo),
    quantidade: pacote.saidas.filter((saida) => saida.colaborador_id === pessoa.id && (periodo ? saida.data.slice(0, 7) === periodo : saida.data >= obra.data_inicio)).reduce((total, saida) => total + saida.quantidade, 0),
  }));
  const total = linhas.reduce((soma, item) => soma + item.custo, 0);
  return (
    <section className="grade">
      <Titulo>Custo por colaborador</Titulo>
      <div className="acoes">
        <label className="campo">Período<select value={modo} onChange={(e) => setModo(e.target.value as "obra" | "mes")}><option value="obra">Desde o início da obra</option><option value="mes">Por mês</option></select></label>
        {modo === "mes" ? <label className="campo">Mês<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label> : null}
        <label className="campo">Função<select value={funcao} onChange={(e) => setFuncao(e.target.value)}><option value="">Todas</option>{funcoes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="campo">Colaborador<select value={pessoaId} onChange={(e) => setPessoaId(e.target.value)}><option value="">Todos, um por linha</option>{pessoas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      </div>
      {linhas.length ? (
        <>
          <Exportar colunas={["Nome", "Matrícula", "Função", "Quantidade", "Custo"]} linhas={[...linhas.map((item) => [item.pessoa.nome, item.pessoa.matricula, item.pessoa.funcao, String(item.quantidade), formatarMoeda(item.custo)]), ["Total", "", "", "", formatarMoeda(total)]]} />
          <table className="tabela">
            <thead><tr><th>Colaborador</th><th>Função</th><th>Peças</th><th>Custo</th></tr></thead>
            <tbody>
              {linhas.map((item) => <tr key={item.pessoa.id}><td>{item.pessoa.nome}</td><td>{item.pessoa.funcao}</td><td>{item.quantidade}</td><td>{formatarMoeda(item.custo)}</td></tr>)}
              <tr><td colSpan={3}>Total das linhas</td><td>{formatarMoeda(total)}</td></tr>
            </tbody>
          </table>
        </>
      ) : <Vazio>Nenhum colaborador com esse filtro.</Vazio>}
    </section>
  );
}

export function Ranking() {
  const { pacote, obra } = useObra();
  const ir = useNavegar();
  const [modo, setModo] = useState<"obra" | "mes">("obra");
  const [mes, setMes] = useState(mesAtual());
  const [epiId, setEpiId] = useState("");
  const [periodoInicial] = useState(() => consumirPeriodo("ranking"));
  const [de, setDe] = useState(periodoInicial?.inicio ?? "");
  const [ate, setAte] = useState(periodoInicial?.fim ?? "");
  if (!obra) return <Vazio>Cadastre uma obra para ver o ranking.</Vazio>;
  const saidasPeriodo = de && ate
    ? pacote.saidas.filter((item) => item.data.slice(0, 10) >= de && item.data.slice(0, 10) <= ate)
    : pacote.saidas;
  const linhas = rankingRetiradas(saidasPeriodo, pacote.colaboradores, obra.id, obra.data_inicio, de && ate ? null : modo === "mes" ? mes : null, epiId || null);
  const epis = pacote.epis.filter((item) => item.obra_id === obra.id);
  return (
    <section className="grade">
      <Titulo>Ranking de retiradas</Titulo>
      <div className="acoes">
        <label className="campo">De<input type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="campo">Até<input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} /></label>
        {de || ate ? <button className="botao-secundario" type="button" onClick={() => { setDe(""); setAte(""); }}>Limpar período</button> : null}
        <label className="campo">Período<select value={modo} disabled={Boolean(de && ate)} onChange={(e) => setModo(e.target.value as "obra" | "mes")}><option value="obra">Desde o início da obra</option><option value="mes">Por mês</option></select></label>
        {modo === "mes" && !(de && ate) ? <label className="campo">Mês<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label> : null}
        <label className="campo">EPI<select value={epiId} onChange={(e) => setEpiId(e.target.value)}><option value="">Todos os EPIs</option>{epis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      </div>
      {linhas.length ? (
        <>
          <Exportar colunas={["Posição", "Colaborador", "Função", "Quantidade", "Custo"]} linhas={linhas.map((item, indice) => {
            const pessoa = pacote.colaboradores.find((atual) => atual.id === item.colaboradorId);
            return [String(indice + 1), pessoa?.nome ?? "", pessoa?.funcao ?? "", String(item.quantidade), pacote.verCustos ? formatarMoeda(item.custo) : ""];
          })} />
          <table className="tabela">
            <thead><tr><th>#</th><th>Colaborador</th><th>Função</th><th>Quantidade</th>{pacote.verCustos ? <th>Custo</th> : null}<th></th></tr></thead>
            <tbody>
              {linhas.map((item, indice) => {
                const pessoa = pacote.colaboradores.find((atual) => atual.id === item.colaboradorId);
                return (
                  <tr key={item.colaboradorId}>
                    <td>{indice + 1}</td>
                    <td>{pessoa?.nome}</td>
                    <td>{pessoa?.funcao}</td>
                    <td>{item.quantidade}</td>
                    {pacote.verCustos ? <td>{formatarMoeda(item.custo)}</td> : null}
                    <td><button className="botao-secundario" type="button" onClick={() => { guardarPeriodo("entregas", de, ate, item.colaboradorId); ir("entregas"); }}>Histórico</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : <Vazio>Ainda não há retiradas nesse recorte.</Vazio>}
    </section>
  );
}

export function MediaTroca() {
  const { pacote, obra } = useObra();
  const [modo, setModo] = useState<"obra" | "mes">("obra");
  const [mes, setMes] = useState(mesAtual());
  const [funcao, setFuncao] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  const [epiId, setEpiId] = useState("");
  const pessoas = useMemo(() => {
    if (!obra) return [];
    return pacote.colaboradores.filter((item) => item.obra_id === obra.id && (!funcao || item.funcao.toLocaleLowerCase("pt-BR") === funcao.toLocaleLowerCase("pt-BR")) && (!pessoaId || item.id === pessoaId));
  }, [pacote.colaboradores, obra, funcao, pessoaId]);
  if (!obra) return <Vazio>Cadastre uma obra para ver a média de troca.</Vazio>;
  const epis = pacote.epis.filter((item) => item.obra_id === obra.id && (!epiId || item.id === epiId));
  const funcoes = [...new Set(pacote.colaboradores.filter((item) => item.obra_id === obra.id).map((item) => item.funcao))];
  const periodo = modo === "mes" ? mes : null;
  const detalhe = pessoas.flatMap((pessoa) => epis.map((epi) => {
    const intervalos = intervalosTroca(pacote.saidas, obra.id, pessoa.id, epi.id, obra.data_inicio, periodo);
    return { pessoa, epi, intervalos, mediaDias: media(intervalos) };
  })).filter((item) => item.intervalos.length || pacote.saidas.some((saida) => saida.colaborador_id === item.pessoa.id && saida.epi_id === item.epi.id));
  const resumo = epis.map((epi) => {
    const todos = pessoas.flatMap((pessoa) => intervalosTroca(pacote.saidas, obra.id, pessoa.id, epi.id, obra.data_inicio, periodo));
    return { epi, mediaDias: media(todos), trocas: todos.length };
  }).filter((item) => item.trocas > 0);
  return (
    <section className="grade">
      <Titulo>Média de troca</Titulo>
      <p>A primeira entrega não entra na média. A média da função junta todos os intervalos, em dias.</p>
      <div className="acoes">
        <label className="campo">Período<select value={modo} onChange={(e) => setModo(e.target.value as "obra" | "mes")}><option value="obra">Desde o início da obra</option><option value="mes">Por mês</option></select></label>
        {modo === "mes" ? <label className="campo">Mês<input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label> : null}
        <label className="campo">Função<select value={funcao} onChange={(e) => setFuncao(e.target.value)}><option value="">Todas</option>{funcoes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="campo">Colaborador<select value={pessoaId} onChange={(e) => setPessoaId(e.target.value)}><option value="">Função inteira</option>{pessoas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label className="campo">EPI<select value={epiId} onChange={(e) => setEpiId(e.target.value)}><option value="">Todos</option>{pacote.epis.filter((item) => item.obra_id === obra.id).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
      </div>
      <h3>Por função</h3>
      {resumo.length ? (
        <table className="tabela">
          <thead><tr><th>EPI</th><th>Trocas</th><th>Média</th><th>Prazo</th></tr></thead>
          <tbody>{resumo.map((item) => <tr key={item.epi.id}><td>{item.epi.nome}</td><td>{item.trocas}</td><td>{item.mediaDias == null ? "sem troca" : `${Math.round(item.mediaDias)} dias`}</td><td>{item.epi.tipo_ruido === "abafador" ? "6 meses" : item.epi.tipo_ruido === "plug" ? "15 dias" : "—"}</td></tr>)}</tbody>
        </table>
      ) : <Vazio>Ainda não há troca neste recorte. A primeira entrega de cada pessoa não conta.</Vazio>}
      <h3>Por colaborador</h3>
      {detalhe.length ? (
        <>
          <Exportar colunas={["Colaborador", "Função", "EPI", "Trocas", "Média em dias"]} linhas={detalhe.map((item) => [item.pessoa.nome, item.pessoa.funcao, item.epi.nome, String(item.intervalos.length), item.mediaDias == null ? "sem troca" : String(Math.round(item.mediaDias))])} />
          <table className="tabela">
            <thead><tr><th>Colaborador</th><th>Função</th><th>EPI</th><th>Trocas</th><th>Média</th></tr></thead>
            <tbody>{detalhe.map((item) => <tr key={`${item.pessoa.id}-${item.epi.id}`}><td>{item.pessoa.nome}</td><td>{item.pessoa.funcao}</td><td>{item.epi.nome}</td><td>{item.intervalos.length}</td><td>{item.mediaDias == null ? "sem troca" : `${Math.round(item.mediaDias)} dias`}</td></tr>)}</tbody>
          </table>
        </>
      ) : <Vazio>Nenhum colaborador retirou EPI neste filtro.</Vazio>}
    </section>
  );
}

export function Avisos() {
  const { pacote, obra } = useObra();
  if (!obra) return <Vazio>Cadastre uma obra para ver os avisos.</Vazio>;
  const avisos = avisosRuido(pacote.epis, pacote.saidas, obra.id, hojeIso());
  return (
    <section className="grade">
      <Titulo>Avisos de troca</Titulo>
      <p>Entram só quem já recebeu abafador ou plug. Abafador: 6 meses. Plug: 15 dias.</p>
      {avisos.length ? (
        <>
          <Exportar colunas={["Colaborador", "Função", "Tipo", "Última retirada", "Limite"]} linhas={avisos.map((aviso) => {
            const pessoa = pacote.colaboradores.find((item) => item.id === aviso.colaboradorId);
            return [pessoa?.nome ?? "", pessoa?.funcao ?? "", aviso.tipo === "abafador" ? "Abafador" : "Plug", formatarData(aviso.ultima), formatarData(aviso.limite)];
          })} />
          <table className="tabela">
            <thead><tr><th>Colaborador</th><th>Função</th><th>EPI</th><th>Última</th><th>Limite</th></tr></thead>
            <tbody>{avisos.map((aviso) => {
              const pessoa = pacote.colaboradores.find((item) => item.id === aviso.colaboradorId);
              return <tr key={`${aviso.colaboradorId}-${aviso.tipo}`}><td>{pessoa?.nome}</td><td>{pessoa?.funcao}</td><td>{aviso.tipo === "abafador" ? "Abafador" : "Plug"}</td><td>{formatarData(aviso.ultima)}</td><td className="negativo">{formatarData(aviso.limite)}</td></tr>;
            })}</tbody>
          </table>
        </>
      ) : <Vazio>Ninguém está em atraso de abafador ou plug nesta obra.</Vazio>}
    </section>
  );
}
