import { useEffect, useState, type FormEvent } from "react";
import { BRAND, VERSAO_APP } from "../brand";
import { api } from "../lib/api";
import { useDados } from "../lib/dados";
import { formatarData } from "../lib/formato";
import { useToast } from "../componentes/Toast";
import { CampoSenha, Titulo } from "../componentes/Ui";
import type { Acesso, Papel } from "../tipos";

export function AlterarSenha() {
  const { token } = useDados();
  const avisar = useToast();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (nova !== confirma) {
      avisar("A confirmação não é igual à nova senha.", "aviso");
      return;
    }
    setEnviando(true);
    try {
      const dados = await api.alterarSenha(token, atual, nova);
      setAtual("");
      setNova("");
      setConfirma("");
      avisar(dados.mensagem);
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível alterar a senha.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="cartao">
      <Titulo>Alterar Senha</Titulo>
      <form className="grade" onSubmit={salvar}>
        <CampoSenha rotulo="Senha atual" autoComplete="current-password" value={atual} onChange={setAtual} />
        <CampoSenha rotulo="Nova senha" autoComplete="new-password" value={nova} onChange={setNova} />
        <CampoSenha rotulo="Confirme a nova senha" autoComplete="new-password" value={confirma} onChange={setConfirma} />
        <p>Mínimo de 8 caracteres, com pelo menos uma letra e um número.</p>
        <button className="botao" type="submit" disabled={enviando}>Salvar senha</button>
      </form>
    </section>
  );
}

export function Configuracoes({ instalar }: { instalar: () => void }) {
  const { pacote } = useDados();
  const licenca = pacote.licenca;
  return (
    <section className="cartao grade">
      <Titulo>Configurações</Titulo>
      <p>E-mail de acesso: {pacote.perfil.email}</p>
      <p>Nome: {pacote.perfil.full_name}</p>
      <p>Aquisição: {formatarData(licenca.started_at)}</p>
      <p>Tipo de licença: {licenca.plan}</p>
      <p>Vencimento: {licenca.expires_at ? formatarData(licenca.expires_at) : "Sem data de término"}</p>
      <p>Situação: {licenca.status === "trial" ? "Teste" : licenca.status === "active" ? "Ativa" : licenca.status === "expired" ? "Vencida" : "Cancelada"}</p>
      {licenca.plan !== "vitalicia" && BRAND.hotmartUrl ? <p><a href={BRAND.hotmartUrl}>Renovar ou mudar o plano</a></p> : null}
      <AlterarSenha />
      <button className="botao" type="button" onClick={instalar}>Instalar App</button>
      <p>Versão {VERSAO_APP}</p>
    </section>
  );
}

export function Usuarios() {
  const { token, pacote } = useDados();
  const avisar = useToast();
  const [lista, setLista] = useState<Acesso[]>([]);
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("operador");
  const [custos, setCustos] = useState(false);
  const [plano, setPlano] = useState("teste");
  const [dias, setDias] = useState("7");
  const [enviando, setEnviando] = useState(false);
  const [novas, setNovas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pacote.perfil.role !== "administrador") return;
    api.listarAcessos(token).then(setLista).catch((falha: unknown) => {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar os acessos.");
    });
  }, [token, pacote.perfil.role]);

  if (pacote.perfil.role !== "administrador") return <p className="vazio">Somente o administrador gerencia acessos.</p>;

  async function definirSenha(id: string) {
    const valor = (novas[id] ?? "").trim();
    if (valor.length < 8) {
      avisar("A senha precisa ter 8 caracteres, com letra e número.", "aviso");
      return;
    }
    setEnviando(true);
    try {
      const atualizada = await api.definirSenhaAcesso(token, id, valor);
      setLista(atualizada);
      setNovas((atual) => ({ ...atual, [id]: "" }));
      avisar("Senha atualizada.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível salvar a senha.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const diasNumero = dias.trim() === "" ? null : Number(dias);
      const atualizada = await api.criarAcesso(token, {
        nome,
        email,
        senha,
        papel,
        podeVerCustos: custos || papel === "administrador",
        plano,
        dias: diasNumero != null && Number.isFinite(diasNumero) ? diasNumero : null,
      });
      setLista(atualizada);
      setNome("");
      setEmail("");
      setSenha("");
      avisar("Acesso criado.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível criar o acesso.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="grade">
      <Titulo>Acessos</Titulo>
      <p>A senha fica visível só para o administrador. Acessos já criados aparecem como “Não registrada” até você salvar uma nova senha na linha.</p>
      <form className="cartao grade" onSubmit={criar}>
        <label className="campo">Nome<input required value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="campo">E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="campo">Senha<input type="text" autoComplete="off" required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
        <label className="campo">Papel
          <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
            <option value="operador">Técnico</option>
            <option value="administrador">Administrador</option>
            <option value="cliente">Consulta</option>
          </select>
        </label>
        <label className="campo"><span><input type="checkbox" checked={custos} onChange={(e) => setCustos(e.target.checked)} /> Pode ver custo por colaborador</span></label>
        <label className="campo">Plano
          <select value={plano} onChange={(e) => setPlano(e.target.value)}>
            <option value="teste">Teste</option>
            <option value="anual">Anual</option>
            <option value="semestral">Semestral</option>
            <option value="premium">Premium</option>
            <option value="vitalicia">Vitalícia</option>
          </select>
        </label>
        <label className="campo">Dias de validade (vazio = sem término)<input value={dias} onChange={(e) => setDias(e.target.value)} /></label>
        <button className="botao" type="submit" disabled={enviando}>Incluir acesso</button>
      </form>
      {erro ? <p className="erro">{erro}</p> : null}
      {lista.length ? (
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Senha</th><th>Papel</th><th>Custos</th><th>Licença</th></tr></thead>
          <tbody>
            {lista.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.email}</td>
                <td>
                  <strong>{item.senha || "Não registrada"}</strong>
                  <form className="acoes" onSubmit={(evento) => { evento.preventDefault(); void definirSenha(item.id); }}>
                    <input aria-label={`Nova senha de ${item.full_name}`} type="text" value={novas[item.id] ?? ""} placeholder="Nova senha" onChange={(evento) => setNovas((atual) => ({ ...atual, [item.id]: evento.target.value }))} />
                    <button className="botao-secundario" type="submit" disabled={enviando}>Salvar</button>
                  </form>
                </td>
                <td>{item.role === "operador" ? "Técnico" : item.role === "administrador" ? "Administrador" : "Consulta"}</td>
                <td>{item.pode_ver_custos || item.role === "administrador" ? "Sim" : "Não"}</td>
                <td>{item.plan} · {item.expires_at ? formatarData(item.expires_at) : "sem término"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
