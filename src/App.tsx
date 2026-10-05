import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Shell, type Tela } from "./componentes/Shell";
import { ToastProvider, useToast } from "./componentes/Toast";
import { DadosProvider } from "./lib/dados";
import { api } from "./lib/api";
import { ComeceAqui } from "./paginas/ComeceAqui";
import { AlterarSenha, Configuracoes, Usuarios } from "./paginas/Conta";
import { Login } from "./paginas/Login";
import { Painel } from "./paginas/Painel";
import { Avisos, Colaboradores, Custos, Entradas, Entregas, Estoque, MediaTroca, Obras, Ranking } from "./paginas/Operacao";
import { Termos } from "./paginas/Termos";
import type { Pacote } from "./tipos";

const CHAVE = "controleepi-sessao";

function AppInterno() {
  const avisar = useToast();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CHAVE));
  const [pacote, setPacote] = useState<Pacote | null>(null);
  const [tela, setTela] = useState<Tela>("painel");
  const [carregando, setCarregando] = useState(Boolean(token));
  const [falha, setFalha] = useState("");
  const [instalavel, setInstalavel] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const guardar = (evento: Event) => {
      evento.preventDefault();
      setInstalavel(evento as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  const instalar = useCallback(async () => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      avisar("O aplicativo já está instalado.", "aviso");
      return;
    }
    if (!instalavel) {
      avisar("No celular, abra o menu do navegador e escolha Instalar.", "aviso");
      return;
    }
    await instalavel.prompt();
    setInstalavel(null);
  }, [avisar, instalavel]);

  useEffect(() => {
    if (!token) {
      setCarregando(false);
      return;
    }
    api.eu(token)
      .then((dados) => {
        setPacote(dados);
        const primeira = localStorage.getItem(`controleepi-conheceu-${dados.perfil.account_id}`);
        setTela(primeira ? "painel" : "comece");
      })
      .catch((erro: unknown) => {
        localStorage.removeItem(CHAVE);
        setToken(null);
        setFalha(erro instanceof Error ? erro.message : "Sua sessão expirou. Entre de novo.");
      })
      .finally(() => setCarregando(false));
  }, [token]);

  function entrar(novoToken: string, novoPacote: Pacote) {
    localStorage.setItem(CHAVE, novoToken);
    setToken(novoToken);
    setPacote(novoPacote);
    const primeira = localStorage.getItem(`controleepi-conheceu-${novoPacote.perfil.account_id}`);
    setTela(primeira ? "painel" : "comece");
  }

  const sair = useCallback((expirada = false) => {
    if (token) void api.sair(token).catch(() => undefined);
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem("controleepi-ativo-ate");
    setToken(null);
    setPacote(null);
    avisar(expirada ? "Sua sessão expirou. Entre de novo." : "Você saiu.", "aviso");
  }, [avisar, token]);

  if (carregando) {
    return <main className="conteudo" aria-busy="true"><div className="esqueleto" /><div className="esqueleto" /></main>;
  }
  if (!token || !pacote) return <Login entrar={entrar} aviso={falha} />;
  if (!pacote.perfil.terms_accepted_at) {
    return (
      <main className="conteudo">
        <Termos aceitar={async () => {
          const novo = await api.aceitarTermos(token);
          setPacote(novo);
        }} />
      </main>
    );
  }

  function ir(proxima: Tela) {
    if (proxima !== "comece" && pacote) {
      localStorage.setItem(`controleepi-conheceu-${pacote.perfil.account_id}`, "1");
    }
    setTela(proxima);
  }

  const telas: Record<Tela, ReactNode> = {
    comece: <ComeceAqui instalar={instalar} />,
    painel: <Painel />,
    obras: <Obras />,
    estoque: <Estoque />,
    entradas: <Entradas />,
    entregas: <Entregas />,
    colaboradores: <Colaboradores />,
    custos: <Custos />,
    ranking: <Ranking />,
    media: <MediaTroca />,
    avisos: <Avisos />,
    senha: <AlterarSenha />,
    config: <Configuracoes instalar={instalar} />,
    termos: <Termos />,
    usuarios: <Usuarios />,
  };

  return (
    <DadosProvider token={token} pacoteInicial={pacote} aoAtualizar={setPacote}>
      <Shell ir={ir} sair={sair} instalar={instalar}>
        {falha ? <p className="erro">{falha}</p> : null}
        {telas[tela]}
      </Shell>
    </DadosProvider>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInterno />
    </ToastProvider>
  );
}
