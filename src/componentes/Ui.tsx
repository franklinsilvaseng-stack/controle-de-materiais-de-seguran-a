import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { exportarCsv } from "../lib/formato";

export function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="titulo">{children}</h2>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>;
}

export function Exportar({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    <button className="botao-secundario" type="button" onClick={() => exportarCsv(colunas, linhas)}>
      <Download size={18} aria-hidden="true" /> Exportar
    </button>
  );
}

export function CampoSenha({
  rotulo,
  value,
  onChange,
  autoComplete,
}: {
  rotulo: string;
  value: string;
  onChange: (valor: string) => void;
  autoComplete?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <label className="campo">
      {rotulo}
      <input
        type={visivel ? "text" : "password"}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="link-senha" type="button" onClick={() => setVisivel((atual) => !atual)}>
        {visivel ? "Ocultar senha" : "Mostrar senha"}
      </button>
    </label>
  );
}

export function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="esqueleto" />
      <div className="esqueleto" />
      <div className="esqueleto" />
    </div>
  );
}
