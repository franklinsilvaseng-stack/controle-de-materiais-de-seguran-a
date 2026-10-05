import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Pacote } from "../tipos";

type DadosContexto = {
  token: string;
  pacote: Pacote;
  obraId: string;
  definirObra: (id: string) => void;
  atualizar: (pacote: Pacote) => void;
  recarregar: () => Promise<void>;
  carregando: boolean;
};

const Contexto = createContext<DadosContexto | null>(null);
const CHAVE_OBRA = "controleepi-obra";

export function DadosProvider({
  token,
  pacoteInicial,
  children,
  aoAtualizar,
}: {
  token: string;
  pacoteInicial: Pacote;
  children: ReactNode;
  aoAtualizar: (pacote: Pacote) => void;
}) {
  const [pacote, setPacote] = useState(pacoteInicial);
  const [obraId, setObraId] = useState(() => localStorage.getItem(CHAVE_OBRA) ?? pacoteInicial.obras[0]?.id ?? "");
  const [carregando, setCarregando] = useState(false);
  const definirObra = useCallback((id: string) => {
    localStorage.setItem(CHAVE_OBRA, id);
    setObraId(id);
  }, []);
  const atualizar = useCallback((novo: Pacote) => {
    setPacote(novo);
    aoAtualizar(novo);
  }, [aoAtualizar]);
  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const novo = await api.eu(token);
      setPacote(novo);
      aoAtualizar(novo);
    } finally {
      setCarregando(false);
    }
  }, [token, aoAtualizar]);

  const valor = useMemo<DadosContexto>(() => {
    const obraValida = pacote.obras.some((obra) => obra.id === obraId) ? obraId : pacote.obras[0]?.id ?? "";
    return {
      token,
      pacote,
      obraId: obraValida,
      carregando,
      definirObra,
      atualizar,
      recarregar,
    };
  }, [token, pacote, obraId, carregando, definirObra, atualizar, recarregar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados(): DadosContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("Dados indisponíveis");
  return valor;
}
