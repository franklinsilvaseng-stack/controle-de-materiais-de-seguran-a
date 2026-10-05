import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Download,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  Timer,
  Trophy,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import { BRAND, VERSAO_APP } from "../brand";
import { adicionarDias } from "../lib/calculos";
import { useDados } from "../lib/dados";
import { hojeIso } from "../lib/formato";

const NavegacaoContexto = createContext<(tela: Tela) => void>(() => undefined);

export function useNavegar() {
  return useContext(NavegacaoContexto);
}

export type Tela =
  | "comece"
  | "painel"
  | "obras"
  | "estoque"
  | "entradas"
  | "entregas"
  | "colaboradores"
  | "custos"
  | "ranking"
  | "media"
  | "avisos"
  | "senha"
  | "config"
  | "termos"
  | "usuarios";

const ROTULOS: Record<Tela, string> = {
  comece: "Comece Aqui",
  painel: "Painel",
  obras: "Obras",
  estoque: "Estoque de EPI",
  entradas: "Entradas",
  entregas: "Entregas",
  colaboradores: "Colaboradores",
  custos: "Custo por colaborador",
  ranking: "Ranking",
  media: "Média de troca",
  avisos: "Avisos de troca",
  senha: "Alterar Senha",
  config: "Configurações",
  termos: "Termos / LGPD",
  usuarios: "Acessos",
};

export function Shell({
  ir,
  sair,
  instalar,
  children,
}: {
  ir: (tela: Tela) => void;
  sair: (expirada?: boolean) => void;
  instalar: () => void;
  children: ReactNode;
}) {
  const { pacote, obraId, definirObra } = useDados();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    document.documentElement.classList.add("menu-aberto");
    return () => document.documentElement.classList.remove("menu-aberto");
  }, [aberto]);
  const verCustos = pacote.verCustos;
  const admin = pacote.perfil.role === "administrador";
  const operar = admin || pacote.perfil.role === "operador";

  useEffect(() => {
    const marcar = () => {
      const limite = Date.now() + 30 * 60 * 1000;
      sessionStorage.setItem("controleepi-ativo-ate", String(limite));
    };
    marcar();
    const eventos = ["click", "keydown", "touchstart"] as const;
    eventos.forEach((evento) => window.addEventListener(evento, marcar));
    const relogio = window.setInterval(() => {
      const limite = Number(sessionStorage.getItem("controleepi-ativo-ate") ?? "0");
      if (limite && Date.now() > limite) sair(true);
    }, 15000);
    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, marcar));
      window.clearInterval(relogio);
    };
  }, [sair]);

  function navegar(proxima: Tela) {
    setAberto(false);
    ir(proxima);
  }

  const licenca = pacote.licenca;
  const avisoTrial =
    licenca.status === "trial" && licenca.expires_at && licenca.expires_at.slice(0, 10) <= adicionarDias(hojeIso(), 3);

  const item = (id: Tela, icone: ReactNode) => (
    <button type="button" className={id === "comece" ? "inicio" : undefined} onClick={() => navegar(id)}>
      {icone}
      {ROTULOS[id]}
      {id === "comece" ? <span className="badge">INÍCIO</span> : null}
    </button>
  );

  return (
    <div className="aplicacao">
      <header className="topo">
        <button type="button" aria-label="Abrir menu" onClick={() => setAberto(true)}>
          <Menu aria-hidden="true" />
        </button>
        <h1>{BRAND.nome}</h1>
      </header>
      {aberto ? (
        <div className="menu-overlay" onClick={() => setAberto(false)}>
          <nav className="menu" aria-label="Menu principal" onClick={(evento) => evento.stopPropagation()}>
            <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)}>
              <X aria-hidden="true" /> Fechar
            </button>
            {item("comece", <Home size={18} aria-hidden="true" />)}
            {operar ? (
              <>
                <div className="grupo">Obra</div>
                {item("painel", <Warehouse size={18} aria-hidden="true" />)}
                {item("obras", <Warehouse size={18} aria-hidden="true" />)}
                {item("estoque", <Package size={18} aria-hidden="true" />)}
                {item("entradas", <Package size={18} aria-hidden="true" />)}
                {item("entregas", <Package size={18} aria-hidden="true" />)}
                {item("colaboradores", <Users size={18} aria-hidden="true" />)}
                <div className="grupo">Consultas</div>
                {item("avisos", <Bell size={18} aria-hidden="true" />)}
                {item("media", <Timer size={18} aria-hidden="true" />)}
                {item("ranking", <Trophy size={18} aria-hidden="true" />)}
                {verCustos ? item("custos", <Wallet size={18} aria-hidden="true" />) : null}
              </>
            ) : null}
            {admin ? item("usuarios", <Shield size={18} aria-hidden="true" />) : null}
            {item("senha", <KeyRound size={18} aria-hidden="true" />)}
            {item("config", <Settings size={18} aria-hidden="true" />)}
            {item("termos", <Shield size={18} aria-hidden="true" />)}
            <button type="button" onClick={instalar}>
              <Download size={18} aria-hidden="true" /> Instalar App
            </button>
            <div className="menu-rodape">
              <button type="button" onClick={() => sair(false)}>
                <LogOut size={18} aria-hidden="true" /> Sair
              </button>
            </div>
          </nav>
        </div>
      ) : null}
      <main className="conteudo">
        {avisoTrial ? (
          <div className="banner">
            Seu período de teste termina em {licenca.expires_at?.slice(0, 10).split("-").reverse().join("/")}.
            {BRAND.hotmartUrl ? (
              <>
                {" "}
                <a href={BRAND.hotmartUrl}>Renovar acesso</a>
              </>
            ) : null}
          </div>
        ) : null}
        {operar && pacote.obras.length ? (
          <div className="abas" role="tablist" aria-label="Obras">
            {pacote.obras.filter((obra) => obra.ativo).map((obra) => (
              <button
                key={obra.id}
                type="button"
                className={obra.id === obraId ? "aba ativa" : "aba"}
                onClick={() => definirObra(obra.id)}
              >
                {obra.nome}
              </button>
            ))}
          </div>
        ) : null}
        <NavegacaoContexto.Provider value={navegar}>{children}</NavegacaoContexto.Provider>
      </main>
      <footer className="rodape">
        <p>Desenvolvido por planilhaprofissional.com</p>
        <p>
          WhatsApp: <a href={`https://wa.me/${BRAND.whatsapp.replace("+", "")}`}>{BRAND.whatsappDisplay}</a>
        </p>
        <p>
          Suporte: <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
        </p>
        <p>Versão {VERSAO_APP}</p>
      </footer>
    </div>
  );
}
