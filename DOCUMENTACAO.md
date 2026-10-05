# Controle EPI

Versão 0.1.0 · 29/09/2026 · Prompt Mestre V2.6

## Índice

1. O que foi feito
2. Como usar
3. Estrutura
4. Cores e layout
5. O que ainda falta ligar
6. Possíveis falhas
7. Melhorias para o próximo app

## 1. O que foi feito

O projeto deixou o esqueleto Next.js e passou a seguir a fábrica Planilha Profissional.

O aplicativo controla EPI por obra. O técnico lança a entrada com o número da requisição, a nota fiscal e o valor. Na entrega, o sistema usa o preço da última entrada, orienta a assinatura da Ficha de EPI e avisa se o CA estiver vencido. Há custo por colaborador (desde o início da obra ou por mês), ranking de quem mais retirou e média de troca por função e por pessoa. O aviso de abafador (6 meses) e plug (15 dias) vale só para quem já recebeu esse tipo de EPI.

O custo por colaborador aparece para o administrador e para quem ele marcar como autorizado.

## 2. Como usar

1. Copie `.env.example` para `.env` e preencha o endereço e a chave pública do hub.
2. Rode a migração `supabase/migrations/20260929181500_controleepi_inicial.sql` no projeto `urmkmlifjetnhamszjri` (organização Franklin SIlvas). Instalação feita em 29/09/2026.
3. Na lista de schemas da API, inclua `controleepi` sem remover os schemas que já estão no ar.
4. Publique a função `controleepi-auth`.
5. Crie o primeiro administrador com `CONTROLEEPI_EMAIL` e `CONTROLEEPI_SENHA` no comando `node scripts/criar-administrador.mjs` e cole o SQL no hub. Não guarde a senha no projeto.
6. `pnpm dev` abre o aplicativo.

## 3. Estrutura

- Tela: `src`, em React e TypeScript, estilo em CSS com as variáveis da paleta.
- Servidor: função `supabase/functions/controleepi-auth`, única porta de entrada. A senha fica só como hash. A chave secreta do hub não vai para o navegador.
- Banco: schema `controleepi`, com contas, perfis, licenças e os dados da obra.

Ferramentas: Vite, React, TypeScript, Supabase, Lucide e PWA.

## 4. Cores e layout

Fundo papel `#FFFCF2`, apoio bege `#ECE4BB` e oliva `#9FA488`, destaque dourado `#CAB77D`, títulos e botões petróleo `#184A4E`. Fonte Tahoma. Saldo zerado usa o rosa `#F4CCCC`. Menu petróleo com textos dourados. Rodapé em todas as telas.

## 5. O que ainda falta ligar

A migração e a função ainda não foram aplicadas no hub: a conexão com o Supabase não respondeu nesta instalação. Sem isso, a tela de entrada avisa que o aplicativo não está ligado ao servidor.

O e-mail de recuperação de senha grava o pedido e ainda não dispara a mensagem. O mesmo vale para o convite depois da compra na Hotmart.

Não houve commit, push nem deploy. Isso fica para depois da validação no hub.

## 6. Possíveis falhas

- Se o schema novo for exposto no lugar dos antigos, os outros apps da fábrica saem do ar. Incluir, não substituir.
- Duas entregas ao mesmo tempo do último item: a função no banco trava o EPI e a segunda recebe a mensagem de saldo insuficiente.
- A planilha antiga não é importada. O conteúdo dela foi tratado como fictício.

## 7. Prompt e próximo app

Prompt usado: `PROMPT_MESTRE_APP.md`, versão 2.6. No próximo app, deixar o envio de e-mail de recuperação pronto junto com a função de acesso, para o primeiro administrador não depender de SQL manual.
