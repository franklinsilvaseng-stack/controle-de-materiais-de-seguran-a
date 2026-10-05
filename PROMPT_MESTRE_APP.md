# PROMPT MESTRE V2 — Fábrica de Apps Planilha Profissional

> **planilhaprofissional.com** · Prompt **geral** para **todos** os apps  
> Versão: **2.6** · Uso: preencher só os `{{placeholders}}` e colar no chat  
> Cópia operacional também em: [`PROMPT_MESTRE_v2.md`](../../PROMPT_MESTRE_v2.md) (raiz do repo)

**Referências:** [PRD_MASTER.md](../../PRD_MASTER.md) · [AUTH_ACCOUNTS_PROFILES_LICENSES.md](AUTH_ACCOUNTS_PROFILES_LICENSES.md) · [REQUISITOS_OBRIGATORIOS_APPS.md](REQUISITOS_OBRIGATORIOS_APPS.md)

---

## Como usar (passo a passo)

1. Copie este prompt inteiro.
2. Substitua **apenas** os campos `{{...}}` (nome, slug, segmento, domínio do app, etc.).
3. Cole no chat e diga o **modo**:
   - **MODO CRIAR** — app novo do zero, seguindo 100% deste padrão
   - **MODO CORRIGIR** — só ajuste o que estiver errado/incompleto; preserve o que já está correto
4. Peça: *“execute o Prompt Mestre V2 e liste o que falta vs o que já está ok”*.
5. Valide o checklist de segurança e UX antes de publicar.

### Atenção — qual modo usar

- **MODO CORRIGIR** = alinhar ao padrão **sem** destruir o que funciona. Use nos apps **antigos**.
- **MODO CRIAR** = app **novo** do zero (ou recomeçar do zero — só se você pedir isso de propósito).
- Se o app legado ainda for Next.js / TanStack Start / outro stack: corrija UX, auth e padrão primeiro; **só mude a stack** se você pedir migração explícita.

**Frase pronta para apps antigos (copiar no chat):**  
*“MODO CORRIGIR — só ajuste o que faltar do padrão (menu, rodapé, accounts/profiles/licenses, Alterar Senha, paleta Papel). Não apague o que já está certo. Não reescreva o app do zero.”*

---

## PROMPT PARA COLAR NO CHAT

````markdown
# PROMPT MESTRE V2 — Fábrica de Apps Planilha Profissional

Você é especialista em apps PWA SaaS, Supabase, GitHub, Vercel, Cursor, UX e segurança.

Sua missão: criar/evoluir o app **{{NOME_DO_APP}}** de forma **100% padronizada** (estrutura, cores, layout, stack, formatação e estilo) com a fábrica Planilha Profissional.

Este prompt é **geral para todos os apps**. O que muda por app são só os placeholders `{{...}}` e o domínio de negócio.

---

## 0. Regras absolutas (nunca violar)

1. **Não apague, mude ou altere** código, dados, layout ou informações corretas — só ajuste o que estiver **errado** ou **incompleto**.
2. **Não misture** auth de apps diferentes.
3. **Não use** o schema `public` para dados do app — use schema isolado (`{{schema_minusculo}}`).
4. **Não armazene** senha em texto puro — só hash (**bcrypt** ou **argon2**).
5. **Não exponha** `service_role` no frontend.
6. Fonte padrão: **Tahoma** em todo o app.
7. Paleta oficial (**obrigatória — versão Papel**, inegociável):
   - `#FFFCF2` — **Papel** (fundo principal, base neutra)
   - `#ECE4BB` — bege claro (fundo secundário / apoio claro)
   - `#9FA488` — verde-oliva (secundária / apoio)
   - `#CAB77D` — dourado (destaque / badge **Comece Aqui**)
   - `#184A4E` — verde-petróleo (primária: títulos, botões principais)
   - Positivos → **verde** · Negativos → **vermelho** · Alertas → vermelho/amarelo
8. **Regra de ouro:** se tudo chama atenção, nada chama atenção.
9. Todo app deve ter obrigatoriamente:
   - Tela **"Comece Aqui"** (orientações específicas)
   - Tela **"Termos de Uso / Licença / Privacidade"**
10. **Nunca** usar cores fora da paleta oficial, exceto se explicitamente solicitado.
11. Em **MODO CORRIGIR**: nunca inventar escopo além do pedido. Em **MODO CRIAR**: implementar o padrão completo deste prompt + domínio do app.

---

## 1. Identidade do app (preencher — o resto é padrão fábrica)

| Campo | Valor | Regra |
|-------|-------|-------|
| Nome do app | `{{NOME_DO_APP}}` | Exibição em CamelCase / nome de marca (ex.: PetCare, GalõesPro) |
| Segmento | `{{SEGMENTO}}` | Ex.: PWA SaaS Agro, PWA SaaS Financeiro |
| Público-alvo | `{{PUBLICO_ALVO}}` | Define tom e complexidade da UI |
| Tom de voz | `{{TOM_DE_VOZ}}` | Ex.: Profissional e seguro |
| Slogan (opcional) | `{{SLOGAN}}` | Login / splash |
| Schema Supabase | `{{schema_minusculo}}` | Sempre minúsculo, sem acento (ex.: `petcare`) |
| Slug | `{{slug_minusculo}}` | Sempre minúsculo; usado em URL, Edge Function e Storage |
| URL produção | `{{slug_minusculo}}.planilhaprofissional.com` | — |
| **Hub Supabase (INEGOCIÁVEL)** | `planilhaprofissional-hub` · Project ID `cqirovvxtyreuvucosol` | **Todos** os apps neste hub |
| GitHub | `https://github.com/planilhaprofissionalmba/{{repositorio}}` | Org `planilhaprofissionalmba` |
| Vercel | `https://vercel.com/planilhaprofissionalmba/{{repositorio}}` | Mesma org |
| **E-mail padrão deploy (INEGOCIÁVEL)** | `planilhaprofissionalmba@gmail.com` | Git + Vercel + Supabase — evita conflito e falha de deploy |
| YouTube Comece Aqui | env `VITE_YOUTUBE_COMECE_AQUI` | — |
| Hotmart | env `VITE_HOTMART_URL` | — |
| **Stack oficial (única)** | **Vite + React + TypeScript + Supabase + PWA** | Obrigatória em **todos** os apps novos |
| Versão inicial | `0.1.0` | Subir a cada entrega validada |

### Stack — regra única

- Apps **novos**: sempre **Vite + React + TypeScript + Supabase + PWA**.
- **Não** misturar Next.js, TanStack Start ou Apps Script em app novo.
- Apps legados: só migrar quando houver tarefa explícita; até lá, não quebrar o que funciona.

### Atenção — MODO CRIAR vs MODO CORRIGIR

- **MODO CORRIGIR** = alinhar ao padrão **sem** destruir o que funciona (apps antigos).
- **MODO CRIAR** = app novo do zero (ou recomeçar do zero — só se pedido de propósito).
- Legado em Next.js / TanStack / outro: corrigir UX, auth e padrão primeiro; **só mudar a stack** com migração explícita pedida pelo usuário.
- Frase típica em apps antigos: *“MODO CORRIGIR — só ajuste o que faltar do padrão. Não apague o que já está certo. Não reescreva o app do zero.”*

---

## 2. Auth e acesso (obrigatório — igual para todos)

Use **três tabelas** com papéis distintos — **nunca misturar**:

### A) `{{schema_minusculo}}.accounts` — LOGIN / SENHA
- Credenciais **isoladas deste app** (não valem em outros apps).
- Campos mínimos: `id`, `email` (unique), `password_hash`, `is_active`, `password_changed_at`, `created_at`, `updated_at`.
- Login, logout, recuperar senha e alterar senha usam **somente** esta tabela (+ sessão do app).
- **NÃO** usar senha do Supabase Auth compartilhado (`auth.users`) para este app.

### B) `{{schema_minusculo}}.profiles` — QUEM É O USUÁRIO
- Campos mínimos: `id`, `account_id`, `company_id`, `full_name`, `email`, `role` (`administrador` | `operador` | `cliente`), `is_active`, `password_changed_at`, `terms_accepted_at`, `created_at`, `updated_at`.
- **Não** guarda senha.

### C) `{{schema_minusculo}}.licenses` — QUEM PODE ACESSAR
- `status`: `trial` | `active` | `cancelled` | `expired`.
- Sem licença `trial` ou `active` válida = **sem painel**, mesmo com senha correta.
- **Venda (obrigatória em todos os apps):** integração **Hotmart** (`VITE_HOTMART_URL` + webhook) — todo app entra na venda.
- **Manual (desenvolvedor):** quantidade **livre**, prazo **livre** (inclusive **indeterminado**), plano **livre** (inclusive **premium / vitalícia**) em **cada app** onde incluir o usuário. Uso: teste, suporte, uso próprio, cortesia. **Não** substitui a Hotmart para o cliente que compra.

### Fluxo de acesso (ordem obrigatória)
1. Validar e-mail + senha em `accounts`
2. Verificar `profiles.is_active`
3. Verificar licença ativa em `licenses`
4. Abrir sessão do app
5. Aplicar **RLS** por `company_id` / `account_id` (políticas fortes)

### Senha — regras claras
| Situação | Exigir senha atual? |
|----------|---------------------|
| **Alterar Senha** (usuário logado — menu ou Configurações) | **SIM** — senha atual + nova + confirmação |
| **Recuperar senha** / esqueci (tela de login, sem sessão) | **NÃO** — fluxo de recuperação (token/link), sem pedir senha antiga |
| Sem permissão de acesso | Mensagem leve + link de aquisição |

### Obrigatório sempre
- Campo `password_changed_at` em `accounts` e `profiles`
- Tabela `password_change_log`
- Tela **Alterar Senha** no **menu sanduíche** **e** dentro de **Configurações**

---

## 3. Isolamento Supabase (hub único)

- 1 app = 1 schema: `{{schema_minusculo}}.*`
- Tudo no hub **`cqirovvxtyreuvucosol`** (inegociável)
- Expor schema na API + **RLS em todas as tabelas**
- Tabelas extras mínimas: `companies`, `audit_logs`, `password_change_log`
- Edge Function: `{{slug_minusculo}}-auth`
- Storage: `{{slug_minusculo}}-docs`
- Service Role **somente** no backend / Edge Functions

**Atenção crítica:** ao expor um schema novo, **manter todos os schemas dos apps já em produção** na lista de schemas expostos. Nunca remover o que já está no ar.

---

## 4. Domínio de negócio (único bloco variável por app)

> Preencher: o que o app resolve, módulos, cadastros, dashboards e regras de negócio.

`{{DESCREVER_DOMINIO_DO_APP}}`

*(Exemplos de agrupamento no menu são só ilustrativos — ex.: “Cadastro” com itens do domínio. Não copiar módulos de outro app.)*

---

## 5. UX padronizada (todos os apps)

### Menu sanduíche (PC + celular) — ordem fixa
1. **Comece Aqui** (badge **INÍCIO**, destaque `#CAB77D`)
2. Telas funcionais (agrupadas por categoria do domínio)
3. **Alterar Senha** (também disponível em Configurações)
4. **Configurações**
5. **Termos / LGPD**
6. **Instalar App** (PWA)
7. **Sair** (único item fixo no rodapé do menu)

- Fundo do menu: `#184A4E` · textos/destaques: `#CAB77D`
- 1º acesso → **Comece Aqui**; demais acessos → **Dashboard**
- **Nunca** usar jargão técnico para o usuário final (nada de “schema”, “Supabase Auth”, etc. na UI)

### Aba Configurações (obrigatória)
- E-mail de acesso
- **Alterar senha** (com senha atual + nova + confirmação)
- Data de aquisição
- Tipo de licença (anual, semestral, vitalícia, teste)
- Vencimento do plano
- Link de renovação/upgrade (exceto vitalícia)
- Botão instalar app
- Versão do app (atualizar a cada release)

### Rodapé (100% das telas)
**Desenvolvido por planilhaprofissional.com**  
WhatsApp: **+55 66 99238-8026**  
Suporte: **suporte@planilhaprofissional.com**

### Constantes de marca
```ts
export const BRAND = {
  site: "https://planilhaprofissional.com",
  supportEmail: "suporte@planilhaprofissional.com",
  deployEmail: "planilhaprofissionalmba@gmail.com",
  whatsapp: "+5566992388026",
  whatsappDisplay: "+55 66 99238-8026",
  hotmartUrl: import.meta.env.VITE_HOTMART_URL ?? "#",
  supabaseHubId: "cqirovvxtyreuvucosol",
} as const
```

---

## 6. PWA (obrigatório)

- `manifest` + service worker
- Ícones 192 e 512
- Botão **Instalar App** no menu, no Comece Aqui e em Configurações
- Funcionar em PC e celular

---

## 7. Padronização de código e operação

1. Componentes/páginas em **PascalCase** (`Login.tsx`, `ComeceAqui.tsx`) — sem `Dashboard2.tsx` / `App_novo.tsx`.
2. Código completo e pronto para produção — sem placeholders `// ... resto`.
3. Entrega em blocos Markdown com linguagem correta (ex.: bloco de código marcado como `typescript`).
4. Respostas objetivas, em **português BR**, passos numerados.
5. Comentários curtos no código só quando a alteração for complexa.
6. Banco **sempre** no Supabase (hub); nunca só local. Backup/salvamento sem sobrescrever indevidamente.
7. Conta padrão de integração: **`planilhaprofissionalmba@gmail.com`** (GitHub + Vercel + Supabase) — **inegociável**.
8. Após **tarefa validada**: commit + push no GitHub + deploy na Vercel; subir versionamento; registrar **nota do dia**.
9. Não fazer deploy a cada microedição instável — só após validação.

---

## 8. Documentação técnica (obrigatória a cada entrega)

Explicar de forma simples e clara (como se fosse para quem não é técnico):

- Capa e índice
- O que foi feito
- Possíveis falhas e correções
- Estrutura front / back / arquivos
- Ferramentas usadas (Vite, React, TS, Supabase, Vercel…)
- Cores e layouts (paleta Papel)
- Prompt mestre usado + melhorias sugeridas para o próximo app
- **Não** gravar senhas nem `service_role` no documento — só e-mails de conta/acesso quando necessário

---

## 9. Modelo LGPD (Termos — todos os apps)

**{{NOME_DO_APP}} · Planilha Profissional · Última atualização: {{MES_ANO}}**

### 1. Licença de uso
O {{NOME_DO_APP}} é licenciado de forma **não exclusiva**, pessoal e intransferível pela planilhaprofissional.com. Não transfere propriedade intelectual. Acesso vinculado ao e-mail liberado; senha própria deste app.

### 2. Permitido
Uso em dispositivos pessoais; cadastrar/editar/consultar próprios dados; exportar cópias para uso próprio; instalar PWA; consultar Comece Aqui e estes termos.

### 3. Não permitido
Revender, sublicenciar, distribuir; copiar código, layout, marca, prompts ou metodologia; remover créditos/rodapé; compartilhar acesso; publicar o produto sem autorização; uso comercial em consultoria sem licença específica; comercializar, registrar ou explorar o projeto além do escopo da licença.

### 4. Sanções
Cancelamento da licença sem reembolso, bloqueio em atualizações/produtos futuros e medidas da Lei nº 9.610/98.

### 5. Privacidade (LGPD — Lei nº 13.709/2018)
Dados: e-mail e informações cadastradas. Ficam na nuvem, privados. Finalidade: login e uso do serviço. Não vendemos dados para marketing. Direitos: acesso, correção, exclusão, portabilidade — contato abaixo.

### 6. Garantias e limitação de responsabilidade
O {{NOME_DO_APP}} é fornecido "como está", como ferramenta de organização/gestão. Não substitui assessoria contábil, fiscal ou jurídica.

**Decisões operacionais:** esta ferramenta é um auxílio organizacional. A Planilha Profissional não se responsabiliza por decisões administrativas ou comerciais tomadas com base nos dados aqui inseridos.

**Erros de preenchimento:** a precisão dos resultados (relatórios, totais e indicadores) depende integralmente da corretude dos dados inseridos pelo usuário.

### 7. Propriedade intelectual e uso restrito
- Os **dados inseridos pelo usuário** continuam dele.
- Código, layout, marca, prompts, paleta e método do app são da **Planilha Profissional**.
- O usuário **não** pode comercializar, sublicenciar, copiar ou registrar o projeto ou material derivado do app.
- Melhorias do **software** pertencem à Planilha Profissional; o conteúdo que o usuário cadastrou **não**.
- Informações do serviço devem ser usadas só para o fim da licença; divulgação a terceiros só com autorização ou exigência legal.

### 8. Aceite
Ao usar o {{NOME_DO_APP}}, o usuário concorda com estes termos.

### 9. Contato
WhatsApp +55 66 99238-8026 · suporte@planilhaprofissional.com · planilhaprofissional.com

---

## 10. Checklist rápido (antes de publicar)

- [ ] Schema isolado no hub `cqirovvxtyreuvucosol`
- [ ] `accounts` + `profiles` + `licenses` + RLS
- [ ] `password_changed_at` + `password_change_log`
- [ ] Alterar Senha no **menu** e em **Configurações** (com senha atual)
- [ ] Recuperar senha só no login (sem senha antiga)
- [ ] Comece Aqui + Termos/LGPD + rodapé + Tahoma + paleta Papel
- [ ] PWA instalável
- [ ] Sem `service_role` no client
- [ ] Conta `planilhaprofissionalmba@gmail.com` no Git/Vercel/Supabase
- [ ] Stack Vite + React + TypeScript + Supabase + PWA
- [ ] Máscaras BR (moeda, data, %) e estados vazio / carregando / erro
- [ ] Contraste: texto escuro `#184A4E` sobre Papel / bege
- [ ] Banco em `snake_case` (tabelas no plural)
- [ ] CSS + variáveis da paleta (sem Tailwind/Bootstrap em app novo)
- [ ] `CHANGELOG.md` com versão + data
- [ ] Ícones só **Lucide**
- [ ] Toast (sucesso/erro/aviso) no canto superior direito
- [ ] Breakpoints: mobile ≤767 · tablet 768–1023 · desktop ≥1024
- [ ] pt-BR apenas
- [ ] QA: login/logout · lento · celular real · PWA instalado · sem dado sensível no console em produção
- [ ] Senha mínima: 8 caracteres, 1 letra + 1 número
- [ ] Bloqueio de login após 5 tentativas (Edge Function)
- [ ] `.env` fora do Git + `.env.example` no repositório
- [ ] A11y: teclado, alt/aria-label, botão ≥ 44×44 px
- [ ] Exportar CSV nas listagens de negócio
- [ ] Aceite de termos no 1º acesso (`terms_accepted_at`)
- [ ] Matriz de permissões por `role` + RLS
- [ ] Trial 7 dias; aviso 3 dias antes; vencido = bloqueia (não apaga)
- [ ] Sessão encerra após 30 min de inatividade
- [ ] Hotmart na venda + liberação manual (qtde/prazo/plano livres, inclusive premium indeterminado)
- [ ] `error_logs` em produção (sem senha / sem stack para o cliente)
- [ ] Commits no padrão `feat:` / `fix:` / `docs:` / `chore:`
- [ ] Chrome, Edge e Safari — últimas 2 versões

---

## 11. Ordem de implementação (MODO CRIAR)

1. Schema `{{schema_minusculo}}` no hub + RLS
2. Tabelas auth (`accounts`, `profiles`, `licenses`, `companies`, logs)
3. Edge Function `{{slug_minusculo}}-auth` + sessão
4. Gate por licença
5. Shell: menu + rodapé + paleta Papel + Tahoma
6. Comece Aqui + Termos/LGPD
7. Alterar Senha (menu + Configurações) + logs
8. Configurações (licença, versão, instalar)
9. PWA
10. Módulos do domínio `{{DESCREVER_DOMINIO_DO_APP}}`
11. Checklist + nota do dia + commit/push/deploy

---

## 12. Padrões complementares

### Formato de dados e máscaras (padrão BR)
- Moeda: `R$ 1.234,56` (vírgula decimal, ponto de milhar)
- Data: `dd/mm/aaaa`
- Percentual: `0,0%`
- Telefone: máscara BR **quando houver** campo de telefone
- CPF/CNPJ: máscara padrão **somente se o domínio exigir** documento brasileiro (não é obrigatório em todo app)

### Estados de tela (obrigatórios em toda listagem/formulário)
- **Vazio:** mensagem orientativa do **domínio deste app**, sem jargão. Exemplo genérico: *“Nenhum registro ainda — cadastre o primeiro.”*
- **Carregando:** skeleton ou spinner padrão — **nunca** tela em branco
- **Erro:** mensagem amigável, sem termo técnico, com opção de tentar novamente

### Contraste de texto sobre a paleta Papel
- Texto sobre fundo Papel (`#FFFCF2`) ou bege claro (`#ECE4BB`) → **sempre** `#184A4E`
- **Nunca** usar cor clara/pastel para texto sobre esses fundos

### Nomenclatura no banco de dados (Supabase)
- Tabelas e colunas em `snake_case` (ex.: `created_at`, `full_name`)
- Nomes de tabela no **plural** (ex.: `companies`, `licenses`) — nomes do domínio no plural, em português sem acento quando possível

### Versionamento (semver)
- **Patch** (`0.1.1`): correção de bug, sem mudança de comportamento
- **Minor** (`0.2.0`): nova funcionalidade, compatível com o que já existe
- **Major** (`1.0.0`): mudança que quebra compatibilidade ou reestrutura o app

### Registro de notas do dia
- Arquivo: `CHANGELOG.md` na raiz do repositório de cada app
- Formato: `## [0.1.1] — AAAA-MM-DD` + uma linha objetiva da alteração

### Stack de estilização (única — apps novos)
- **CSS nativo + variáveis CSS** da paleta Papel (`--pp-papel`, `--pp-bege`, `--pp-oliva`, `--pp-dourado`, `--pp-petroleo`)
- Fonte: **Tahoma** via CSS global
- **Não** usar Tailwind, Bootstrap ou outra lib de UI em app **novo**
- Apps legados: não migrar o CSS sem pedido explícito (MODO CORRIGIR)

---

## 13. Padrões complementares II

### Biblioteca de ícones
- Padrão único para todos os apps: **Lucide**
- Não misturar bibliotecas de ícones diferentes entre apps ou dentro do mesmo app

### Notificações / toast
- Posição: canto superior direito
- Duração padrão: **4 segundos**
- Erros críticos: podem exigir fechamento manual
- Cores (paleta):
  - Sucesso → **verde**
  - Erro → **vermelho**
  - Aviso / info → **dourado** `#CAB77D` ou **petróleo** `#184A4E` (nunca azul padrão)
- Texto de erro genérico de API: mensagem amigável, **sem** código técnico ou stack trace

### Breakpoints de responsividade (fixos, todos os apps)
- Mobile: até **767px**
- Tablet: **768px – 1023px**
- Desktop: a partir de **1024px**

### Isolamento de dados (já definido no §2 e §3)
- Manter **`company_id` + RLS** em todas as tabelas
- O isolamento **não pode depender só do frontend**
- Também filtrar por `account_id` quando o dado for do usuário (fluxo de acesso do §2)

### QA manual antes de publicar (checklist funcional)
- [ ] Login e logout funcionando
- [ ] Conexão lenta: loading não trava a tela
- [ ] Responsivo em **celular real** (não só redimensionar o navegador)
- [ ] App funciona **instalado como PWA**, não só no navegador
- [ ] Em **produção**: sem `console.log` nem dado sensível no console do navegador

### Git e deploy
- Trabalho na branch **`main`**, como já está
- Commit + push + deploy na Vercel **após tarefa validada** e checklist deste prompt
- Não exigir `dev`/`staging` por padrão

### Idioma
- Todos os apps da fábrica são **pt-BR apenas**
- Não implementar internacionalização (i18n) a menos que solicitado explicitamente

---

## 15. Segurança, dados e operação (fábrica)

### Política de senha (força mínima)
- Mínimo **8 caracteres**, com pelo menos **1 letra** e **1 número**
- Não exigir símbolo (facilita o público da fábrica)
- Vale na criação, em **Alterar Senha** e em **Recuperar senha**

### Proteção contra força bruta (login)
- Após **5 senhas erradas** seguidas: bloqueio de **15 minutos**
- Implementar na Edge Function `{{slug_minusculo}}-auth` — **não** só no frontend
- Mensagem: *“Muitas tentativas. Tente de novo em alguns minutos.”*

### Variáveis de ambiente e segredos
- Segredos só em `.env` local, secrets da **Vercel** e secrets do **Supabase**
- **Nunca** commitar `.env` no Git
- Todo app novo tem `.env.example` **sem valores secretos** (só nomes das chaves)
- Chaves públicas do app: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_HOTMART_URL`, `VITE_YOUTUBE_COMECE_AQUI`
- `service_role` **nunca** usa prefixo `VITE_` (iria para o navegador)

### Acessibilidade básica
- Navegação por **teclado** (Tab / Enter) nos fluxos principais
- Imagens e ícones com sentido: texto alternativo ou `aria-label` no botão
- Área clicável mínima **44×44 px** no celular

### Exportação de dados
- Toda **listagem de dados de negócio** tem botão **Exportar**
- Formato padrão: **CSV** (abre no Excel)
- Nome do arquivo: `{{slug_minusculo}}-export-AAAA-MM-DD.csv`
- Excel (`.xlsx`) só se o domínio do app pedir
- Telas Comece Aqui, Termos, Login e Configurações **não** precisam de export

### Aceite de termos no primeiro acesso
- No 1º login: checkbox obrigatório dos Termos / LGPD
- Gravar `terms_accepted_at` (timestamptz) em `profiles`
- Sem aceite → **não** liberar o Dashboard
- Reaceite só se houver pedido explícito após mudança dos termos

### Backup automático do hub (sem ação manual no dia a dia)
- Backup é do **projeto hub** `cqirovvxtyreuvucosol` — não criar job de backup no código de cada app
- Hub **já está no plano Pro** — backup **diário automático**, retenção **7 dias**, **sem clique diário** e sem job no código do app
- Plano **Free** **não** tem backup automático; a fábrica **mantém o hub em Pro**
- PITR (ponto no tempo) é extra e opcional — não é obrigatório
- Arquivos do Storage não entram no backup do banco; documentos importantes também devem poder ser exportados pelo usuário (CSV)

---

## 17. Perfis, licença, sessão e operação

### Matriz de permissões por `role` (igual em todos os apps)

| Ação | administrador | operador | cliente |
|------|:---:|:---:|:---:|
| Ver próprios dados | Sim | Sim | Sim |
| Cadastrar / editar o dia a dia | Sim | Sim | Não (só se o domínio pedir e for dado dele) |
| Excluir registros | Sim | Não (só se o PRD do app pedir) | Não |
| Usuários, licença e Config avançada | Sim | Não | Não |
| Alterar a própria senha | Sim | Sim | Sim |
| Exportar CSV da listagem que pode ver | Sim | Sim | Só os próprios dados |

A permissão vale no **RLS e na tela**. Esconder botão sem RLS **não** basta.

### Trial (7 dias)
- Duração padrão: **7 dias** a partir de `started_at` (outro prazo só se pedido explícito)
- Aviso **3 dias antes** do vencimento (banner no app)
- Ao vencer: `status` → `expired` · **bloqueia o painel** · mensagem leve + link Hotmart / compra
- **Não apagar** dados do usuário

### Hotmart (venda) + liberação manual (desenvolvedor)
- **Obrigatório em todos os apps:** fluxo de compra **Hotmart** (todo app é para venda — cliente final)
- **Manual:** o desenvolvedor inclui o e-mail direto em `{schema}.licenses`, **sem** passar pela Hotmart
- No manual **não há teto**: quantos usuários precisar · prazo que quiser · **indeterminado** (`status = active` e `expires_at` vazio) · plano que quiser, inclusive **premium / vitalícia**
- Vale **por app**: incluir na mão no schema A não libera o schema B
- Usos típicos: teste, homologação, suporte, uso próprio, cortesia
- **Cliente que compra** continua só pela Hotmart / site

**Premium indeterminado (manual):** `status = active` · `plan` = premium ou vitalícia · `expires_at` = vazio

### Timeout de sessão
- **30 minutos** sem uso → encerrar sessão
- Mensagem: *“Sua sessão expirou. Entre de novo.”*

### Erros em produção
- Tabela `{schema}.error_logs`: data, tela, mensagem (sem senha, sem dado sensível)
- Cliente vê só mensagem amigável — **sem** stack trace
- Consulta no Table Editor do hub; Sentry só se pedido explícito

### Padrão de commit (todos os apps)
- `feat:` nova função · `fix:` correção · `docs:` documentação · `chore:` config/versão/deploy
- Uma linha objetiva, em português

### Navegadores (mínimo garantido)
- **Últimas 2 versões** de **Chrome**, **Edge** e **Safari** (PC e celular)
- Firefox: melhor esforço, sem obrigação
- Sem suporte a Internet Explorer nem navegador muito antigo

---

## 18. Comando final

Com base neste Prompt Mestre V2, **implemente / revise** o app **{{NOME_DO_APP}}** agora.
Preserve o que estiver correto. Corrija só gaps de padrão, segurança ou UX.
Responda em **português brasileiro**, de forma objetiva, em **passos numerados**.
````

---

## Decisões oficiais desta versão (resumo)

| Item | Decisão |
|------|---------|
| E-mail deploy | `planilhaprofissionalmba@gmail.com` — **inegociável** |
| Hub Supabase | `cqirovvxtyreuvucosol` — **inegociável** |
| Stack única | **Vite + React + TypeScript + Supabase + PWA** |
| Estilo (apps novos) | **CSS + variáveis** da paleta — sem Tailwind/Bootstrap |
| Paleta | **Papel** `#FFFCF2` (não usar gelo `#F8F9FA`) |
| Alterar Senha | Menu **e** Configurações; **exige senha atual** |
| Recuperar senha | Só no login; **não** exige senha antiga |
| Ícones | **Lucide** (única biblioteca) |
| Git | Branch **`main`** (como já está) |
| Senha | 8 caracteres, 1 letra + 1 número |
| Backup hub | **Pro** (já ativo) — diário automático, 7 dias, sem rotina manual |
| Trial | **7 dias** · aviso 3 dias · vence = bloqueia, não apaga |
| Sessão | **30 min** sem uso → desloga |
| Venda | **Hotmart** obrigatória (cliente) · **manual** livre (qtde, prazo, premium) |

---

*Documento oficial V2 — planilhaprofissional.com · Fábrica de Apps*
