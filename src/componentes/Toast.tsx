import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tipo = "sucesso" | "erro" | "aviso";
type Item = { id: number; tipo: Tipo; texto: string };

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const avisar = useCallback((texto: string, tipo: Tipo = "sucesso") => {
    const id = Date.now() + Math.random();
    setItens((lista) => [...lista, { id, tipo, texto }]);
    if (tipo !== "erro") {
      window.setTimeout(() => setItens((lista) => lista.filter((item) => item.id !== id)), 4000);
    }
  }, []);
  const valor = useMemo(() => avisar, [avisar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="toasts" aria-live="polite">
        {itens.map((item) => (
          <div key={item.id} className={`toast ${item.tipo}`} role="status">
            {item.texto}
            {item.tipo === "erro" ? (
              <button className="botao-secundario" type="button" onClick={() => setItens((lista) => lista.filter((atual) => atual.id !== item.id))}>
                Fechar
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): (texto: string, tipo?: Tipo) => void {
  return useContext(Contexto);
}
