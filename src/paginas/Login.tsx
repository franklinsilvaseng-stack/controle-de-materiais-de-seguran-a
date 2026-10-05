import { useState, type FormEvent } from "react";
import { CampoSenha } from "../componentes/Ui";
import { BRAND } from "../brand";
import { api } from "../lib/api";
import type { Pacote } from "../tipos";

export function Login({ entrar, aviso = "" }: { entrar: (token: string, pacote: Pacote) => void; aviso?: string }) {
  const [modo, setModo] = useState<"entrar" | "recuperar" | "redefinir">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [token, setToken] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const dados = await api.login(email.trim(), senha);
      entrar(dados.token, dados.pacote);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  async function aoRecuperar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const dados = await api.recuperar(email.trim());
      setInfo(dados.mensagem);
      setModo("redefinir");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível recuperar.");
    } finally {
      setEnviando(false);
    }
  }

  async function aoRedefinir(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const dados = await api.redefinir(token.trim(), senha);
      setInfo(dados.mensagem);
      setModo("entrar");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível definir a senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <h1 className="titulo">{BRAND.nome}</h1>
      <p className="subtitulo">Estoque de EPI por obra, na mão do técnico de segurança.</p>
      {aviso ? <p className="erro">{aviso}</p> : null}
      {modo === "entrar" ? (
        <form className="grade" onSubmit={aoEntrar}>
          <label className="campo">E-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <CampoSenha rotulo="Senha" autoComplete="current-password" value={senha} onChange={setSenha} />
          {erro ? <p className="erro">{erro}</p> : null}
          {info ? <p className="vazio">{info}</p> : null}
          <button className="botao" type="submit" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
          <button className="botao-secundario" type="button" onClick={() => { setModo("recuperar"); setErro(""); }}>Esqueci minha senha</button>
        </form>
      ) : null}
      {modo === "recuperar" ? (
        <form className="grade" onSubmit={aoRecuperar}>
          <p>Informe o e-mail de acesso. Se ele existir, enviaremos as instruções.</p>
          <label className="campo">E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {erro ? <p className="erro">{erro}</p> : null}
          <button className="botao" type="submit" disabled={enviando}>Enviar</button>
          <button className="botao-secundario" type="button" onClick={() => setModo("entrar")}>Voltar</button>
        </form>
      ) : null}
      {modo === "redefinir" ? (
        <form className="grade" onSubmit={aoRedefinir}>
          <p>Cole o código recebido e escolha a nova senha. Ela precisa ter 8 caracteres, com letra e número.</p>
          <label className="campo">Código<input value={token} onChange={(e) => setToken(e.target.value)} required /></label>
          <CampoSenha rotulo="Nova senha" autoComplete="new-password" value={senha} onChange={setSenha} />
          {erro ? <p className="erro">{erro}</p> : null}
          {info ? <p className="vazio">{info}</p> : null}
          <button className="botao" type="submit" disabled={enviando}>Salvar senha</button>
        </form>
      ) : null}
      {BRAND.hotmartUrl ? <p><a href={BRAND.hotmartUrl}>Adquirir acesso</a></p> : null}
      <RodapeSimples />
    </main>
  );
}

function RodapeSimples() {
  return (
    <footer className="rodape">
      <p>Desenvolvido por planilhaprofissional.com</p>
      <p>WhatsApp: {BRAND.whatsappDisplay}</p>
      <p>Suporte: {BRAND.supportEmail}</p>
    </footer>
  );
}
