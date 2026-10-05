import type { Acesso, CaOficial, Pacote, Papel } from "../tipos";

type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string; codigo?: string };

function urlFuncao(): string {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error("O aplicativo ainda não está ligado ao servidor. Avise o suporte.");
  }
  return `${base.replace(/\/$/, "")}/functions/v1/controleepi-auth`;
}

export async function chamar<T>(
  action: string,
  payload: Record<string, unknown> = {},
  sessao?: string | null,
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(urlFuncao(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        ...(sessao ? { "x-session": sessao } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new Error("Sem conexão. Verifique a internet e tente de novo.");
  }
  let json: Resposta<T>;
  try {
    json = (await resposta.json()) as Resposta<T>;
  } catch {
    throw new Error("Não foi possível concluir. Tente de novo.");
  }
  if (!json.ok) {
    const erro = new Error(json.erro || "Não foi possível concluir. Tente de novo.") as Error & { codigo?: string };
    erro.codigo = json.codigo;
    throw erro;
  }
  return json.dados;
}

export type LoginDados = { token: string; pacote: Pacote };

export const api = {
  login: (email: string, senha: string) => chamar<LoginDados>("login", { email, senha }),
  recuperar: (email: string) => chamar<{ mensagem: string }>("recuperar", { email }),
  redefinir: (token: string, senha: string) => chamar<{ mensagem: string }>("redefinir", { token, senha }),
  eu: (token: string) => chamar<Pacote>("eu", {}, token),
  sair: (token: string) => chamar<{ ok: boolean }>("sair", {}, token),
  aceitarTermos: (token: string) => chamar<Pacote>("aceitar-termos", {}, token),
  alterarSenha: (token: string, senhaAtual: string, senhaNova: string) =>
    chamar<{ mensagem: string }>("alterar-senha", { senhaAtual, senhaNova }, token),
  salvarObra: (token: string, payload: { id?: string; nome: string; dataInicio: string; ativo: boolean }) =>
    chamar<Pacote>("salvar-obra", payload, token),
  salvarEpi: (
    token: string,
    payload: {
      id?: string;
      obraId: string;
      nome: string;
      unidade: string;
      ca: string;
      validadeCa: string;
      validadeNa?: boolean;
      tipoRuido: string;
      ativo: boolean;
    },
  ) => chamar<Pacote>("salvar-epi", payload, token),
  salvarColaborador: (
    token: string,
    payload: {
      id?: string;
      obraId: string;
      nome: string;
      matricula: string;
      funcao: string;
      ativo: boolean;
    },
  ) => chamar<Pacote>("salvar-colaborador", payload, token),
  salvarEntrada: (
    token: string,
    payload: {
      obraId: string;
      epiId: string;
      data: string;
      quantidade: number;
      numeroRequisicao: string;
      numeroNf: string;
      valorUnitario: number;
      ca?: string;
      marca?: string;
    },
  ) => chamar<Pacote>("salvar-entrada", payload, token),
  salvarSaida: (
    token: string,
    payload: {
      obraId: string;
      epiId: string;
      colaboradorId: string;
      data: string;
      quantidade: number;
      fichaOrientada: boolean;
      numeroAd?: string;
      motivoAd?: string;
    },
  ) => chamar<{ pacote: Pacote; avisoCa: string | null }>("salvar-saida", payload, token),
  excluir: (token: string, tipo: "obra" | "epi" | "colaborador" | "entrada", id: string) =>
    chamar<Pacote>("excluir", { tipo, id }, token),
  consultarCa: (token: string, ca: string) => chamar<CaOficial>("consultar-ca", { ca }, token),
  listarAcessos: (token: string) => chamar<Acesso[]>("listar-acessos", {}, token),
  criarAcesso: (
    token: string,
    payload: {
      nome: string;
      email: string;
      senha: string;
      papel: Papel;
      podeVerCustos: boolean;
      plano: string;
      dias: number | null;
    },
  ) => chamar<Acesso[]>("criar-acesso", payload, token),
  registrarErro: (token: string, tela: string, mensagem: string) =>
    chamar<{ ok: boolean }>("registrar-erro", { tela, mensagem }, token),
};
