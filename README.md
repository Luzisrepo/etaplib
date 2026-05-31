# ETAP Biblioteca

Aplicacao web para centralizar a partilha de materiais de estudo da ETAP, com autenticacao restrita a `@etap.pt`, Supabase Storage privado e policies RLS para proteger edicao e eliminacao por proprietario.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase Auth, Database e Storage
- UI inspirada no GitHub: tema escuro, sidebar fixa, topbar com pesquisa, cards subtis e acoes rápidas

## Configuracao Supabase

1. Abre o projeto Supabase.
2. Vai a **SQL Editor**.
3. Executa o ficheiro [`supabase/schema.sql`](./supabase/schema.sql).
4. Em **Authentication > URL Configuration**, adiciona o URL local:

```txt
http://localhost:3000
http://localhost:3000/auth/callback
```

5. Em producao, adiciona tambem o dominio final da escola aos redirect URLs permitidos:

```txt
https://etaplib-bt1v.vercel.app
https://etaplib-bt1v.vercel.app/auth/callback
```

O SQL cria:

- `profiles`, `categories`, `documents`
- categorias iniciais
- bucket privado `biblioteca`
- triggers para criar perfis e bloquear emails fora de `@etap.pt`
- policies RLS nas tabelas
- policies no Supabase Storage

Se o login devolver `Database error saving new user`, executa o hotfix
[`supabase/fix-auth-trigger.sql`](./supabase/fix-auth-trigger.sql) no SQL Editor.
Esse erro acontece quando um trigger em `auth.users` levanta exceção durante o
fluxo de OTP do Supabase Auth.

## Variaveis de ambiente

O ficheiro `.env.local` ja esta configurado com os dados fornecidos:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wspwshnguqdnelydoeft.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dSU_bXE2V0zRPfOMl942TQ_nryxgkth
```

Na Vercel, confirma que estas variaveis existem em **Project Settings > Environment Variables**.
A app tambem aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY` como alias, mas o nome recomendado e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Para outro ambiente, usa `.env.example` como referencia.

## Instalar e correr

```bash
npm install
npm run dev
```

A app fica disponivel em:

```txt
http://localhost:3000
```

## Build de producao

```bash
npm run build
npm run start
```

## Fluxo da aplicacao

- Registo e login por email/palavra-passe com contas `@etap.pt`
- Confirmacao de email via Supabase Auth com callback em `/auth/callback`
- Upload para `storage/biblioteca/{user_id}/ficheiro`
- Registo dos metadados em `documents`
- Listagem pesquisavel por titulo, ficheiro, categoria, autor e tags
- Visualizacao/download por signed URL temporario
- Edicao e eliminacao disponiveis apenas ao proprietario do documento

## Notas de seguranca

- A publishable key pode estar no frontend; a protecao real esta nas policies RLS e Storage.
- O trigger em `auth.users` rejeita novas contas fora do dominio `@etap.pt`.
- O path do ficheiro e obrigado a comecar com o `auth.uid()`, garantindo isolamento de escrita/remocao no bucket.
- Todos os utilizadores autenticados da ETAP podem consultar materiais, mas apenas o proprietario pode atualizar ou eliminar os seus documentos.
