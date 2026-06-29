# ⚽ Quarentiners Soccer
**Bolão da Copa do Mundo 2026** — entre amigos, com chaveamento, pontuação automática e muito drama!

---

## 🚀 Como colocar no ar (passo a passo)

### 1. Criar conta no Supabase (grátis)
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Defina nome: `quarentiners-soccer`, senha e região (South America ideal)
4. Aguarde o projeto ser criado (~1 min)

### 2. Rodar o schema no Supabase
1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**
4. Pronto! Todos os times, jogos e tabelas serão criados.

### 3. Pegar as chaves do Supabase
1. Vá em **Settings > API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Criar repositório no GitHub
```bash
# Na pasta do projeto:
git init
git add .
git commit -m "🚀 Quarentiners Soccer - inicial"
git remote add origin https://github.com/SEU-USUARIO/quarentiners-soccer.git
git push -u origin main
```

### 5. Deploy no Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New Project** e selecione o repositório
3. Em **Environment Variables**, adicione:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (sua URL do Supabase)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (sua anon key)
   ```
4. Clique em **Deploy** — pronto em ~1 min! 🎉

### 6. Tornar-se admin
1. Registre-se no app pelo link do Vercel
2. No Supabase, vá em **Table Editor > profiles**
3. Encontre seu usuário e mude `is_admin` para `true`
4. Agora você verá o menu "🔧 Admin" no app

---

## 🎮 Como usar

### Participantes
1. Acessam o link do Vercel
2. Criam conta com apelido e emoji
3. Passam pelo onboarding (3 passos)
4. Preenchem os palpites para os jogos disponíveis
5. Acompanham o ranking em tempo real

### Admin
1. Após cada jogo, acessa o painel admin
2. Insere o placar (ex: 2×1) e marca se foi pênaltis
3. Seleciona o classificado
4. Clica em **Salvar** → pontos calculados automaticamente para todos!

---

## 📊 Sistema de pontuação

| Acerto | Original | Atualizado |
|--------|----------|------------|
| 🎯 Placar exato | 10 pts | 6 pts |
| ⚖️ Diferença de gols | 7 pts | 4 pts |
| ✅ Só o classificado | 4 pts | 2 pts |
| 🟡 Bônus pênaltis | +2 pts | +2 pts |

**Multiplicadores por fase:**
- 16avos: ×1 | Oitavas: ×1.5 | Quartas: ×2 | Semi: ×3 | Final: ×4

---

## 🛠️ Tecnologias
- **Next.js 15** (App Router)
- **Supabase** (banco de dados + autenticação)
- **Tailwind CSS** (estilização)
- **Vercel** (hospedagem)

---

## 📝 Desenvolvimento local
```bash
npm install
cp .env.local.example .env.local
# Preencha as variáveis no .env.local
npm run dev
# Abra http://localhost:3000
```

---

Feito com ☕ e muito amor ao futebol 🇧🇷
