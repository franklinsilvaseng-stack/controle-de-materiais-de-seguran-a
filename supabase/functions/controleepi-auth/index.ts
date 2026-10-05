import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session, x-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const db = () => supabase.schema("controleepi");

function responder(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: cors });
}
function ok(dados: unknown) {
  return responder({ ok: true, dados });
}
function falha(erro: string, status = 400, codigo?: string) {
  return responder({ ok: false, erro, codigo }, status);
}

function senhaForte(senha: string) {
  return senha.length >= 8 && /[A-Za-zÀ-ÿ]/.test(senha) && /\d/.test(senha);
}
function hojeBrasil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function dataAceita(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= "2020-01-01" && iso <= hojeBrasil();
}
async function sha256(texto: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function novoToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Perfil = {
  id: string;
  account_id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: "administrador" | "operador" | "cliente";
  pode_ver_custos: boolean;
  is_active: boolean;
  terms_accepted_at: string | null;
};

async function licencaDaConta(accountId: string) {
  const { data } = await db().from("licenses").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1);
  const licenca = data?.[0];
  if (!licenca) return null;
  if (licenca.expires_at && new Date(licenca.expires_at).getTime() < Date.now() && licenca.status !== "expired") {
    await db().from("licenses").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", licenca.id);
    return { ...licenca, status: "expired" };
  }
  return licenca;
}

function licencaLibera(licenca: { status: string } | null) {
  return Boolean(licenca && (licenca.status === "trial" || licenca.status === "active"));
}

async function montarPacote(perfil: Perfil) {
  const licenca = await licencaDaConta(perfil.account_id);
  const verCustos = perfil.role === "administrador" || perfil.pode_ver_custos;
  const vazio = perfil.role === "cliente";
  const empresa = perfil.company_id;
  const listas = vazio
    ? { obras: [], epis: [], colaboradores: [], entradas: [], saidas: [] }
    : {
        obras: (await db().from("obras").select("id,nome,data_inicio,ativo").eq("company_id", empresa).order("nome")).data ?? [],
        epis: (await db().from("epis").select("id,obra_id,nome,unidade,ca,validade_ca,validade_na,tipo_ruido,ativo").eq("company_id", empresa).order("nome")).data ?? [],
        colaboradores: (await db().from("colaboradores").select("id,obra_id,nome,matricula,funcao,ativo").eq("company_id", empresa).order("nome")).data ?? [],
        entradas: (await db().from("entradas").select("id,obra_id,epi_id,data,quantidade,numero_requisicao,numero_nf,valor_unitario,ca,marca,created_at").eq("company_id", empresa).order("data", { ascending: false })).data ?? [],
        saidas: (await db().from("saidas").select("id,obra_id,epi_id,colaborador_id,data,quantidade,valor_unitario,numero_nf,numero_requisicao,entrada_id,numero_ad,motivo_ad,created_at").eq("company_id", empresa).order("data", { ascending: false })).data ?? [],
      };
  if (!verCustos) {
    listas.saidas = listas.saidas.map((item: { valor_unitario: number | null }) => ({ ...item, valor_unitario: null }));
  }
  return {
    perfil: {
      id: perfil.id,
      account_id: perfil.account_id,
      company_id: perfil.company_id,
      full_name: perfil.full_name,
      email: perfil.email,
      role: perfil.role,
      pode_ver_custos: perfil.pode_ver_custos,
      terms_accepted_at: perfil.terms_accepted_at,
    },
    licenca: licenca
      ? { status: licenca.status, plan: licenca.plan, started_at: licenca.started_at, expires_at: licenca.expires_at }
      : { status: "expired", plan: "sem licença", started_at: new Date().toISOString(), expires_at: null },
    verCustos,
    ...listas,
  };
}

async function perfilDaConta(accountId: string) {
  const { data } = await db().from("profiles").select("*").eq("account_id", accountId).maybeSingle();
  return data as Perfil | null;
}

async function sessaoAtual(req: Request) {
  const token = req.headers.get("x-session") ?? "";
  if (!token) return { erro: falha("Sua sessão expirou. Entre de novo.", 401, "sessao") };
  const tokenHash = await sha256(token);
  const { data: sessao } = await db().from("sessions").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (!sessao || new Date(sessao.expires_at).getTime() < Date.now()) {
    if (sessao) await db().from("sessions").delete().eq("id", sessao.id);
    return { erro: falha("Sua sessão expirou. Entre de novo.", 401, "sessao") };
  }
  const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db().from("sessions").update({ last_seen_at: expira, expires_at: expira }).eq("id", sessao.id);
  const perfil = await perfilDaConta(sessao.account_id);
  if (!perfil || !perfil.is_active) return { erro: falha("Seu acesso está inativo.", 403) };
  const licenca = await licencaDaConta(perfil.account_id);
  if (!licencaLibera(licenca)) {
    return { erro: falha("Sua licença não está ativa. Renove o acesso para continuar.", 403, "licenca") };
  }
  return { perfil };
}

function podeOperar(perfil: Perfil) {
  return perfil.role === "administrador" || perfil.role === "operador";
}

async function abrirSessao(accountId: string) {
  const token = novoToken();
  const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db().from("sessions").insert({ account_id: accountId, token_hash: await sha256(token), expires_at: expira, last_seen_at: expira });
  return token;
}

async function login(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");
  const { data: conta } = await db().from("accounts").select("*").eq("email", email).maybeSingle();
  if (!conta || !conta.is_active) return falha("E-mail ou senha não conferem.", 401);
  if (conta.locked_until && new Date(conta.locked_until).getTime() > Date.now()) {
    return falha("Muitas tentativas. Tente de novo em alguns minutos.", 429);
  }
  const confere = bcrypt.compareSync(senha, conta.password_hash);
  if (!confere) {
    const failed = Number(conta.failed_count ?? 0) + 1;
    const locked = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await db().from("accounts").update({ failed_count: failed >= 5 ? 0 : failed, locked_until: locked, updated_at: new Date().toISOString() }).eq("id", conta.id);
    return falha(failed >= 5 ? "Muitas tentativas. Tente de novo em alguns minutos." : "E-mail ou senha não conferem.", failed >= 5 ? 429 : 401);
  }
  const perfil = await perfilDaConta(conta.id);
  if (!perfil?.is_active) return falha("Seu acesso está inativo.", 403);
  const licenca = await licencaDaConta(conta.id);
  if (!licencaLibera(licenca)) return falha("Sua licença não está ativa. Renove o acesso para continuar.", 403, "licenca");
  await db().from("accounts").update({ failed_count: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("id", conta.id);
  const token = await abrirSessao(conta.id);
  return ok({ token, pacote: await montarPacote(perfil) });
}

async function recuperar(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const mensagem = "Se o e-mail existir, enviaremos as instruções.";
  const { data: conta } = await db().from("accounts").select("id,is_active").eq("email", email).maybeSingle();
  if (conta?.is_active) {
    const token = novoToken();
    await db().from("recovery_tokens").insert({
      account_id: conta.id,
      token_hash: await sha256(token),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    await db().from("audit_logs").insert({ account_id: conta.id, action: "recuperar-senha-pendente-email", entity: "accounts", entity_id: conta.id });
  }
  return ok({ mensagem });
}

async function redefinir(body: Record<string, unknown>) {
  const token = String(body.token ?? "").trim();
  const senha = String(body.senha ?? "");
  if (!senhaForte(senha)) return falha("A senha precisa ter 8 caracteres, com letra e número.");
  const tokenHash = await sha256(token);
  const { data: registro } = await db().from("recovery_tokens").select("*").eq("token_hash", tokenHash).is("used_at", null).maybeSingle();
  if (!registro || new Date(registro.expires_at).getTime() < Date.now()) return falha("Código inválido ou vencido.");
  const hash = bcrypt.hashSync(senha, 10);
  const agora = new Date().toISOString();
  await db().from("accounts").update({ password_hash: hash, senha_admin: senha, password_changed_at: agora, failed_count: 0, locked_until: null, updated_at: agora }).eq("id", registro.account_id);
  await db().from("profiles").update({ password_changed_at: agora, updated_at: agora }).eq("account_id", registro.account_id);
  await db().from("recovery_tokens").update({ used_at: agora }).eq("id", registro.id);
  await db().from("sessions").delete().eq("account_id", registro.account_id);
  await db().from("password_change_log").insert({ account_id: registro.account_id, channel: "recuperar" });
  return ok({ mensagem: "Senha alterada. Entre com a nova senha." });
}

async function alterarSenha(perfil: Perfil, body: Record<string, unknown>) {
  const atual = String(body.senhaAtual ?? "");
  const nova = String(body.senhaNova ?? "");
  if (!senhaForte(nova)) return falha("A senha precisa ter 8 caracteres, com letra e número.");
  const { data: conta } = await db().from("accounts").select("password_hash").eq("id", perfil.account_id).single();
  if (!conta || !bcrypt.compareSync(atual, conta.password_hash)) return falha("A senha atual não confere.");
  const agora = new Date().toISOString();
  await db().from("accounts").update({ password_hash: bcrypt.hashSync(nova, 10), senha_admin: nova, password_changed_at: agora, updated_at: agora }).eq("id", perfil.account_id);
  await db().from("profiles").update({ password_changed_at: agora, updated_at: agora }).eq("id", perfil.id);
  await db().from("password_change_log").insert({ account_id: perfil.account_id, channel: "alterar" });
  return ok({ mensagem: "Senha alterada." });
}

async function obraDaEmpresa(perfil: Perfil, obraId: string) {
  const { data } = await db().from("obras").select("id,company_id").eq("id", obraId).eq("company_id", perfil.company_id).maybeSingle();
  return data;
}

async function salvarObra(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode alterar este cadastro.", 403);
  const nome = String(body.nome ?? "").trim();
  const dataInicio = String(body.dataInicio ?? "");
  if (!nome || !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || dataInicio < "2020-01-01") {
    return falha("Informe o nome e uma data de início a partir de 01/01/2020.");
  }
  const payload = { nome, data_inicio: dataInicio, ativo: Boolean(body.ativo), updated_at: new Date().toISOString() };
  if (body.id) {
    const { error } = await db().from("obras").update(payload).eq("id", String(body.id)).eq("company_id", perfil.company_id);
    if (error) return falha("Não foi possível salvar a obra.");
  } else {
    const { error } = await db().from("obras").insert({ ...payload, company_id: perfil.company_id });
    if (error) return falha("Não foi possível salvar a obra.");
  }
  return ok(await montarPacote(perfil));
}

async function salvarEpi(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode alterar este cadastro.", 403);
  const obraId = String(body.obraId ?? "");
  if (!(await obraDaEmpresa(perfil, obraId))) return falha("Obra não encontrada.");
  const nome = String(body.nome ?? "").trim();
  const unidade = String(body.unidade ?? "");
  const tipoRuido = String(body.tipoRuido ?? "nenhum");
  const unidades = ["UN", "PAR", "CX", "KG", "M", "L", "SC"];
  if (!nome || !unidades.includes(unidade) || !["nenhum", "abafador", "plug"].includes(tipoRuido)) {
    return falha("Confira nome, unidade e tipo de proteção.");
  }
  const caBruto = String(body.ca ?? "").trim();
  const ca = semCertificado(caBruto) ? "N/A" : caBruto.slice(0, 40) || null;
  let validade = String(body.validadeCa ?? "").trim();
  const validadeNa = ca === "N/A" || Boolean(body.validadeNa) || semCertificado(validade);
  if (validadeNa) validade = "";
  else if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) return falha("A validade precisa ser uma data ou N/A.");
  const numeroCa = ca && ca !== "N/A" ? normalizarCa(ca) : "";
  if (numeroCa && !validadeNa) {
    const { data: oficial } = await db().from("ca_base").select("validade").eq("ca", numeroCa).maybeSingle();
    if (oficial?.validade) validade = oficial.validade;
  }
  const payload = {
    nome,
    unidade,
    ca,
    validade_ca: validade || null,
    validade_na: validadeNa,
    tipo_ruido: tipoRuido,
    ativo: Boolean(body.ativo),
    updated_at: new Date().toISOString(),
  };
  if (body.id) {
    const { error } = await db().from("epis").update(payload).eq("id", String(body.id)).eq("company_id", perfil.company_id);
    if (error) return falha("Não foi possível salvar o EPI.");
  } else {
    const { error } = await db().from("epis").insert({ ...payload, company_id: perfil.company_id, obra_id: obraId });
    if (error) return falha("Não foi possível salvar o EPI.");
  }
  return ok(await montarPacote(perfil));
}

async function salvarColaborador(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode alterar este cadastro.", 403);
  const obraId = String(body.obraId ?? "");
  if (!(await obraDaEmpresa(perfil, obraId))) return falha("Obra não encontrada.");
  const nome = String(body.nome ?? "").trim();
  const matricula = String(body.matricula ?? "").trim();
  const funcao = String(body.funcao ?? "").trim();
  if (!nome || !matricula || !funcao) return falha("Informe nome, matrícula e função.");
  const payload = { nome, matricula, funcao, ativo: Boolean(body.ativo), updated_at: new Date().toISOString() };
  const consulta = body.id
    ? db().from("colaboradores").update(payload).eq("id", String(body.id)).eq("company_id", perfil.company_id)
    : db().from("colaboradores").insert({ ...payload, company_id: perfil.company_id, obra_id: obraId });
  const { error } = await consulta;
  if (error) return falha("Não foi possível salvar. Confira se a matrícula já existe nesta obra.");
  return ok(await montarPacote(perfil));
}

async function salvarEntrada(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode lançar entrada.", 403);
  const obraId = String(body.obraId ?? "");
  const epiId = String(body.epiId ?? "");
  const data = String(body.data ?? "");
  const quantidade = Number(body.quantidade);
  const numeroRequisicao = String(body.numeroRequisicao ?? "").trim();
  const numeroNf = String(body.numeroNf ?? "").trim();
  const valor = Math.round(Number(body.valorUnitario) * 100) / 100;
  if (!(await obraDaEmpresa(perfil, obraId))) return falha("Obra não encontrada.");
  const { data: epi } = await db().from("epis").select("id").eq("id", epiId).eq("obra_id", obraId).eq("company_id", perfil.company_id).eq("ativo", true).maybeSingle();
  if (!epi) return falha("Material não encontrado nesta obra.");
  if (!Number.isInteger(quantidade) || quantidade <= 0) return falha("Informe uma quantidade inteira maior que zero.");
  if (!dataAceita(data)) return falha("Use uma data entre 01/01/2020 e hoje.");
  if (!numeroRequisicao || !numeroNf) return falha("Informe a requisição e a nota fiscal.");
  if (!Number.isFinite(valor) || valor < 0 || valor >= 10000) return falha("O valor precisa ser o preço da nota, menor que 10.000.");
  const caBruto = String(body.ca ?? "").trim();
  const ca = semCertificado(caBruto) ? "N/A" : caBruto.slice(0, 40) || null;
  const marca = String(body.marca ?? "").trim().slice(0, 80) || null;
  const { error } = await db().from("entradas").insert({
    company_id: perfil.company_id,
    obra_id: obraId,
    epi_id: epiId,
    data,
    quantidade,
    numero_requisicao: numeroRequisicao,
    numero_nf: numeroNf,
    valor_unitario: valor,
    ca,
    marca,
  });
  if (error) return falha("Não foi possível lançar a entrada.");
  return ok(await montarPacote(perfil));
}

async function salvarSaida(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode registrar entrega.", 403);
  if (body.fichaOrientada !== true) return falha("Confirme que orientou a assinatura da Ficha de EPI.");
  const { data, error } = await db().rpc("registrar_saida", {
    p_company_id: perfil.company_id,
    p_obra_id: String(body.obraId ?? ""),
    p_epi_id: String(body.epiId ?? ""),
    p_colaborador_id: String(body.colaboradorId ?? ""),
    p_data: String(body.data ?? ""),
    p_quantidade: Number(body.quantidade),
    p_numero_ad: String(body.numeroAd ?? ""),
    p_motivo_ad: String(body.motivoAd ?? ""),
  });
  if (error || !data?.ok) return falha(data?.erro ?? "Não foi possível registrar a entrega.");
  return ok({ pacote: await montarPacote(perfil), avisoCa: data.aviso ?? null });
}

async function listarAcessos(perfil: Perfil) {
  if (perfil.role !== "administrador") return falha("Somente o administrador gerencia acessos.", 403);
  const { data: perfis } = await db().from("profiles").select("id,full_name,email,role,pode_ver_custos,is_active,account_id").eq("company_id", perfil.company_id);
  const { data: licencas } = await db().from("licenses").select("account_id,status,plan,expires_at").eq("company_id", perfil.company_id);
  const contasIds = (perfis ?? []).map((item) => item.account_id);
  const { data: contas } = contasIds.length
    ? await db().from("accounts").select("id,senha_admin").in("id", contasIds)
    : { data: [] as { id: string; senha_admin: string | null }[] };
  const lista = (perfis ?? []).map((item) => {
    const licenca = (licencas ?? []).find((atual) => atual.account_id === item.account_id);
    const conta = (contas ?? []).find((atual) => atual.id === item.account_id);
    return {
      id: item.id,
      full_name: item.full_name,
      email: item.email,
      role: item.role,
      pode_ver_custos: item.pode_ver_custos,
      is_active: item.is_active,
      licenca_status: licenca?.status ?? "expired",
      plan: licenca?.plan ?? "",
      expires_at: licenca?.expires_at ?? null,
      senha: conta?.senha_admin ?? null,
    };
  });
  return ok(lista);
}

async function criarAcesso(perfil: Perfil, body: Record<string, unknown>) {
  if (perfil.role !== "administrador") return falha("Somente o administrador cria acessos.", 403);
  const email = String(body.email ?? "").trim().toLowerCase();
  const nome = String(body.nome ?? "").trim();
  const senha = String(body.senha ?? "");
  const papel = String(body.papel ?? "operador");
  const plano = String(body.plano ?? "teste");
  if (!nome || !email.includes("@")) return falha("Informe nome e e-mail.");
  if (!senhaForte(senha)) return falha("A senha precisa ter 8 caracteres, com letra e número.");
  if (!["administrador", "operador", "cliente"].includes(papel)) return falha("Papel inválido.");
  const { data: existe } = await db().from("accounts").select("id").eq("email", email).maybeSingle();
  if (existe) return falha("Já existe um acesso com este e-mail.");
  const agora = new Date();
  const dias = body.dias == null || body.dias === "" ? null : Number(body.dias);
  const indeterminado = dias == null || !Number.isFinite(dias);
  const expira = indeterminado ? null : new Date(agora.getTime() + Number(dias) * 86400000).toISOString();
  const status = plano === "teste" ? "trial" : "active";
  const { data: conta, error } = await db().from("accounts").insert({ email, password_hash: bcrypt.hashSync(senha, 10), senha_admin: senha }).select("id").single();
  if (error || !conta) return falha("Não foi possível criar o acesso.");
  await db().from("profiles").insert({
    account_id: conta.id,
    company_id: perfil.company_id,
    full_name: nome,
    email,
    role: papel,
    pode_ver_custos: papel === "administrador" || Boolean(body.podeVerCustos),
  });
  await db().from("licenses").insert({
    account_id: conta.id,
    company_id: perfil.company_id,
    status,
    plan: plano,
    started_at: agora.toISOString(),
    expires_at: plano === "vitalicia" || indeterminado && plano !== "teste" ? null : expira ?? new Date(agora.getTime() + 7 * 86400000).toISOString(),
  });
  return listarAcessos(perfil);
}

async function definirSenhaAcesso(perfil: Perfil, body: Record<string, unknown>) {
  if (perfil.role !== "administrador") return falha("Somente o administrador altera estas senhas.", 403);
  const senha = String(body.senha ?? "");
  if (!senhaForte(senha)) return falha("A senha precisa ter 8 caracteres, com letra e número.");
  const { data: alvo } = await db().from("profiles").select("id,account_id").eq("id", String(body.id ?? "")).eq("company_id", perfil.company_id).maybeSingle();
  if (!alvo) return falha("Acesso não encontrado.");
  const agora = new Date().toISOString();
  await db().from("accounts").update({
    password_hash: bcrypt.hashSync(senha, 10),
    senha_admin: senha,
    password_changed_at: agora,
    failed_count: 0,
    locked_until: null,
    updated_at: agora,
  }).eq("id", alvo.account_id);
  await db().from("profiles").update({ password_changed_at: agora, updated_at: agora }).eq("id", alvo.id);
  await db().from("password_change_log").insert({ account_id: alvo.account_id, channel: "alterar" });
  if (alvo.account_id !== perfil.account_id) await db().from("sessions").delete().eq("account_id", alvo.account_id);
  return listarAcessos(perfil);
}

async function garantirComprador(email: string, nome: string) {
  const { data: conta } = await db().from("accounts").select("id").eq("email", email).maybeSingle();
  const agora = new Date().toISOString();
  const expira = new Date(Date.now() + 365 * 86400000).toISOString();
  if (conta) {
    await db().from("licenses").update({ status: "active", plan: "anual", expires_at: expira, updated_at: agora }).eq("account_id", conta.id);
    return;
  }
  const { data: empresa } = await db().from("companies").insert({ name: nome || email }).select("id").single();
  if (!empresa) return;
  const senha = novoToken();
  const { data: criada } = await db().from("accounts").insert({ email, password_hash: bcrypt.hashSync(senha, 10), senha_admin: senha }).select("id").single();
  if (!criada) return;
  await db().from("profiles").insert({ account_id: criada.id, company_id: empresa.id, full_name: nome || email, email, role: "administrador", pode_ver_custos: true });
  await db().from("licenses").insert({ account_id: criada.id, company_id: empresa.id, status: "active", plan: "anual", started_at: agora, expires_at: expira });
  const token = novoToken();
  await db().from("recovery_tokens").insert({ account_id: criada.id, token_hash: await sha256(token), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
  await db().from("audit_logs").insert({ company_id: empresa.id, account_id: criada.id, action: "hotmart-acesso-criado", entity: "accounts", entity_id: criada.id });
}

async function excluirEntrada(perfil: Perfil, id: string) {
  if (!id) return falha("Cadastro inválido.");
  const { data: entrada } = await db().from("entradas").select("id,obra_id,epi_id,quantidade").eq("id", id).eq("company_id", perfil.company_id).maybeSingle();
  if (!entrada) return falha("Entrada não encontrada.");
  const { data: entradas } = await db().from("entradas").select("id,quantidade,data,created_at").eq("company_id", perfil.company_id).eq("obra_id", entrada.obra_id).eq("epi_id", entrada.epi_id);
  const { data: saidas } = await db().from("saidas").select("quantidade,entrada_id").eq("company_id", perfil.company_id).eq("obra_id", entrada.obra_id).eq("epi_id", entrada.epi_id);
  const totalEntradas = (entradas ?? []).reduce((total, item) => total + Number(item.quantidade), 0);
  const totalSaidas = (saidas ?? []).reduce((total, item) => total + Number(item.quantidade), 0);
  if (totalEntradas - Number(entrada.quantidade) < totalSaidas) {
    return falha("Esta entrada já cobre entregas. Apagá-la deixaria o saldo negativo.");
  }
  const apontadas = (saidas ?? []).some((item) => item.entrada_id === entrada.id);
  if (apontadas) {
    const outra = (entradas ?? [])
      .filter((item) => item.id !== entrada.id)
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.created_at).localeCompare(String(a.created_at)))[0];
    if (!outra) return falha("Esta entrada já cobre entregas. Apagá-la deixaria o saldo negativo.");
    const { error: erroVinculo } = await db().from("saidas").update({ entrada_id: outra.id }).eq("entrada_id", entrada.id).eq("company_id", perfil.company_id);
    if (erroVinculo) return falha("Não foi possível excluir a entrada.");
  }
  const { error } = await db().from("entradas").delete().eq("id", id).eq("company_id", perfil.company_id);
  if (error) return falha("Não foi possível excluir a entrada.");
  await db().from("audit_logs").insert({ company_id: perfil.company_id, account_id: perfil.account_id, action: "excluir-entrada", entity: "entradas", entity_id: id });
  return ok(await montarPacote(perfil));
}

async function excluir(perfil: Perfil, body: Record<string, unknown>) {
  if (!podeOperar(perfil)) return falha("Você não pode excluir cadastros.", 403);
  const tipo = String(body.tipo ?? "");
  const id = String(body.id ?? "");
  if (tipo === "entrada") return await excluirEntrada(perfil, id);
  const tabelas: Record<string, { tabela: string; dependencias: [string, string][] }> = {
    obra: { tabela: "obras", dependencias: [["epis", "obra_id"], ["colaboradores", "obra_id"], ["entradas", "obra_id"]] },
    epi: { tabela: "epis", dependencias: [["entradas", "epi_id"], ["saidas", "epi_id"]] },
    colaborador: { tabela: "colaboradores", dependencias: [["saidas", "colaborador_id"]] },
  };
  const alvo = tabelas[tipo];
  if (!alvo || !id) return falha("Cadastro inválido.");
  const { data: registro } = await db().from(alvo.tabela).select("id").eq("id", id).eq("company_id", perfil.company_id).maybeSingle();
  if (!registro) return falha("Cadastro não encontrado.");
  for (const [tabela, coluna] of alvo.dependencias) {
    const { count } = await db().from(tabela).select("id", { count: "exact", head: true }).eq(coluna, id);
    if (count) {
      return falha(tipo === "obra"
        ? "Esta obra já tem EPIs, colaboradores ou entradas. Use Inativar para manter o histórico."
        : "Este cadastro já tem movimentação. Use Inativar para manter o histórico.");
    }
  }
  const { error } = await db().from(alvo.tabela).delete().eq("id", id).eq("company_id", perfil.company_id);
  if (error) return falha("Não foi possível excluir.");
  await db().from("audit_logs").insert({ company_id: perfil.company_id, account_id: perfil.account_id, action: `excluir-${tipo}`, entity: alvo.tabela, entity_id: id });
  return ok(await montarPacote(perfil));
}

function normalizarCa(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "").replace(/^0+/, "");
}

function semCertificado(valor: string) {
  const texto = valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return texto === "na" || texto === "semca" || texto === "naoseaplica" || texto === "semcertificado";
}

async function sincronizarCa(req: Request, body: Record<string, unknown>) {
  const { data: integracao } = await db().from("integracoes").select("token_hash").eq("nome", "caepi").maybeSingle();
  const recebido = await sha256(req.headers.get("x-sync-token") ?? "");
  if (!integracao || !igual(integracao.token_hash, recebido)) return falha("Não autorizado.", 401);
  const linhas = Array.isArray(body.linhas) ? body.linhas.slice(0, 5000) : [];
  const registros = linhas
    .map((item: Record<string, unknown>) => ({
      ca: normalizarCa(item.ca),
      validade: /^\d{4}-\d{2}-\d{2}$/.test(String(item.validade ?? "")) ? String(item.validade) : null,
      situacao: String(item.situacao ?? "").slice(0, 40),
      equipamento: String(item.equipamento ?? "").slice(0, 300) || null,
      descricao: String(item.descricao ?? "").slice(0, 600) || null,
      fabricante: String(item.fabricante ?? "").slice(0, 200) || null,
      referencia: String(item.referencia ?? "").slice(0, 200) || null,
      atualizado_em: new Date().toISOString(),
    }))
    .filter((item) => item.ca && item.situacao);
  if (registros.length) {
    const { error } = await db().from("ca_base").upsert(registros, { onConflict: "ca" });
    if (error) return falha("Não foi possível gravar a base de CA.", 500);
  }
  if (body.final === true) {
    const { data: alterados, error } = await db().rpc("aplicar_base_ca", { p_total: Number(body.total) || 0 });
    if (error) return falha("Não foi possível aplicar a base de CA.", 500);
    return ok({ gravados: registros.length, episAtualizados: alterados });
  }
  return ok({ gravados: registros.length });
}

async function consultarCa(body: Record<string, unknown>) {
  const ca = normalizarCa(body.ca);
  if (!ca) return falha("Informe o número do CA.");
  const { data } = await db().from("ca_base").select("ca,validade,situacao,equipamento,descricao,fabricante,referencia,atualizado_em").eq("ca", ca).maybeSingle();
  if (!data) return falha("CA não encontrado na base do Ministério do Trabalho.", 404);
  return ok(data);
}

async function hotmart(body: Record<string, unknown>) {
  const secret = Deno.env.get("HOTMART_WEBHOOK_SECRET") ?? "";
  const recebido = String(body.hottok ?? "");
  if (!secret || !igual(secret, recebido)) return falha("Não autorizado.", 401);
  const email = String((body.data as { buyer?: { email?: string; name?: string } } | undefined)?.buyer?.email ?? "").trim().toLowerCase();
  const nome = String((body.data as { buyer?: { name?: string } } | undefined)?.buyer?.name ?? "");
  const event = String(body.event ?? "");
  if (email && (event === "PURCHASE_APPROVED" || event === "PURCHASE_COMPLETE")) await garantirComprador(email, nome);
  if (email && (event === "PURCHASE_CANCELED" || event === "PURCHASE_REFUNDED" || event === "PURCHASE_PROTEST")) {
    const { data: conta } = await db().from("accounts").select("id").eq("email", email).maybeSingle();
    if (conta) await db().from("licenses").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("account_id", conta.id);
  }
  return ok({ recebido: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return falha("Método não aceito.", 405);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return falha("Não foi possível ler os dados.");
  }
  try {
    if (body.hottok) return await hotmart(body);
    const action = String(body.action ?? "");
    if (action === "login") return await login(body);
    if (action === "recuperar") return await recuperar(body);
    if (action === "redefinir") return await redefinir(body);
    if (action === "sincronizar-ca") return await sincronizarCa(req, body);
    const sessao = await sessaoAtual(req);
    if (sessao.erro) return sessao.erro;
    const perfil = sessao.perfil as Perfil;
    if (action === "sair") {
      const token = req.headers.get("x-session") ?? "";
      await db().from("sessions").delete().eq("token_hash", await sha256(token));
      return ok({ ok: true });
    }
    if (action === "eu") return ok(await montarPacote(perfil));
    if (action === "aceitar-termos") {
      await db().from("profiles").update({ terms_accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", perfil.id);
      return ok(await montarPacote({ ...perfil, terms_accepted_at: new Date().toISOString() }));
    }
    if (action === "alterar-senha") return await alterarSenha(perfil, body);
    if (action === "consultar-ca") return await consultarCa(body);
    if (action === "salvar-obra") return await salvarObra(perfil, body);
    if (action === "salvar-epi") return await salvarEpi(perfil, body);
    if (action === "salvar-colaborador") return await salvarColaborador(perfil, body);
    if (action === "salvar-entrada") return await salvarEntrada(perfil, body);
    if (action === "salvar-saida") return await salvarSaida(perfil, body);
    if (action === "excluir") return await excluir(perfil, body);
    if (action === "listar-acessos") return await listarAcessos(perfil);
    if (action === "criar-acesso") return await criarAcesso(perfil, body);
    if (action === "definir-senha-acesso") return await definirSenhaAcesso(perfil, body);
    if (action === "registrar-erro") {
      const mensagem = String(body.mensagem ?? "").replace(/senha/gi, "[omitido]").slice(0, 300);
      await db().from("error_logs").insert({ company_id: perfil.company_id, account_id: perfil.account_id, tela: String(body.tela ?? "").slice(0, 80), mensagem });
      return ok({ ok: true });
    }
    return falha("Ação desconhecida.");
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro";
    await db().from("error_logs").insert({ mensagem: mensagem.slice(0, 300), tela: "servidor" }).catch(() => undefined);
    return falha("Não foi possível concluir. Tente de novo.", 500);
  }
});

