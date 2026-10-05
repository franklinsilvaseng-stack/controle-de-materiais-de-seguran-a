export type Papel = "administrador" | "operador" | "cliente";

export type Perfil = {
  id: string;
  account_id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: Papel;
  pode_ver_custos: boolean;
  terms_accepted_at: string | null;
};

export type Licenca = {
  status: "trial" | "active" | "cancelled" | "expired";
  plan: string;
  started_at: string;
  expires_at: string | null;
};

export type Obra = {
  id: string;
  nome: string;
  data_inicio: string;
  ativo: boolean;
};

export type TipoRuido = "nenhum" | "abafador" | "plug";

export type Epi = {
  id: string;
  obra_id: string;
  nome: string;
  unidade: string;
  ca: string | null;
  validade_ca: string | null;
  validade_na?: boolean;
  tipo_ruido: TipoRuido;
  ativo: boolean;
};

export type CaOficial = {
  ca: string;
  validade: string | null;
  situacao: string;
  equipamento: string | null;
  descricao: string | null;
  fabricante: string | null;
  referencia: string | null;
  atualizado_em: string;
};

export type Colaborador = {
  id: string;
  obra_id: string;
  nome: string;
  matricula: string;
  funcao: string;
  ativo: boolean;
};

export type Entrada = {
  id: string;
  obra_id: string;
  epi_id: string;
  data: string;
  quantidade: number;
  numero_requisicao: string;
  numero_nf: string;
  valor_unitario: number | null;
  ca?: string | null;
  marca?: string | null;
  created_at: string;
};

export type Saida = {
  id: string;
  obra_id: string;
  epi_id: string;
  colaborador_id: string;
  data: string;
  quantidade: number;
  valor_unitario: number | null;
  numero_nf: string;
  numero_requisicao: string;
  entrada_id: string;
  numero_ad?: string | null;
  motivo_ad?: "perda" | "dano" | "extravio" | "nao_devolucao" | null;
  created_at: string;
};

export type Acesso = {
  id: string;
  full_name: string;
  email: string;
  role: Papel;
  pode_ver_custos: boolean;
  is_active: boolean;
  licenca_status: string;
  plan: string;
  expires_at: string | null;
  senha: string | null;
};

export type Pacote = {
  perfil: Perfil;
  licenca: Licenca;
  verCustos: boolean;
  obras: Obra[];
  epis: Epi[];
  colaboradores: Colaborador[];
  entradas: Entrada[];
  saidas: Saida[];
};

export const UNIDADES = ["UN", "PAR", "CX", "KG", "M", "L", "SC"] as const;
