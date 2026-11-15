# JLK Fitness e Casual — Loja virtual

Loja em **Next.js 16** (React 19) com o backend no mesmo projeto (API Routes) e banco **PostgreSQL**.

## Como rodar

Pré-requisitos: **Node.js 20.12+** e **PostgreSQL 14+**.

```bash
npm install
cp .env.example .env.local        # preencha DATABASE_URL e JWT_SECRET

# banco de dados
createdb jlk_loja                 # ou: psql -c "CREATE DATABASE jlk_loja;"
npm run db:setup                  # cria as tabelas e carrega os produtos de exemplo

# primeiro usuário da Área do Vendedor (a senha é pedida no terminal)
npm run usuario:criar

npm run dev                       # http://localhost:3000
```

Para conferir se o banco está conectado: http://localhost:3000/api/saude

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run db:schema` | Cria/atualiza as tabelas (`db/schema.sql`) |
| `npm run db:seed` | Carrega os produtos de exemplo (`db/seed.sql`) |
| `npm run db:setup` | Os dois acima |
| `npm run usuario:criar` | Cria ou redefine a senha de um usuário do vendedor |

## Estrutura

```
db/
  schema.sql            criação do banco (tabelas, regras, view de preços)
  seed.sql              dados de exemplo
scripts/                db.mjs (roda os SQL) e criar-usuario.mjs
src/
  app/                  rotas (páginas e API)
    page.jsx                         /
    produto/[slug]/page.jsx          /produto/conjunto-calca
    carrinho/page.jsx                /carrinho
    area-do-vendedor/login/          /area-do-vendedor/login
    area-do-vendedor/(protegida)/    páginas que exigem login
    api/                             backend (ver abaixo)
  components/           Header, Hero, Carrossel...
  views/                telas (Produto, Carrinho, Login, AreaVendedor)
  context/              Carrinho e Autenticacao (estado no navegador)
  lib/                  db, auth (JWT), senha, pedidos, produtos, whatsapp
```

## API

Rotas marcadas com 🔒 exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Status do servidor e do banco |
| GET | `/api/produtos` | Lista de produtos |
| GET | `/api/produtos/:slug` | Um produto |
| POST | `/api/pedidos` | Confere estoque, recalcula o total e devolve o link do WhatsApp |
| POST | `/api/auth/login` | Usuário e senha → token JWT (expira em 3 h) |
| GET | `/api/auth/eu` 🔒 | Dados do usuário do token |
| GET | `/api/vendedor/resumo` 🔒 | Números da loja e estoque baixo |

### Autenticação (JWT)

```bash
# 1. login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"maria","senha":"sua-senha"}'
# → { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "...", "expiraEmSegundos": 10800, "usuario": {...} }

# 2. chamadas protegidas
curl http://localhost:3000/api/vendedor/resumo -H "Authorization: Bearer eyJ..."
```

- Token assinado com `JWT_SECRET` (HS256), validade definida em `JWT_EXPIRACAO` (padrão `3h`).
- Senhas guardadas apenas como hash **scrypt**.
- Após 5 tentativas erradas, o login é bloqueado por 15 minutos (por IP + usuário).
- Respostas `401` trazem `codigo`: `token_ausente`, `token_invalido` ou `token_expirado`.

Para proteger uma nova rota:

```js
import { exigirAutenticacao } from '@/lib/auth'

export async function GET(request) {
  const auth = await exigirAutenticacao(request) // ou { papeis: ['admin'] }
  if (auth.erro) return auth.erro
  // auth.usuario → { id, usuario, nome, papel, expiraEm }
}
```

## Observações

- Os produtos exibidos no site ainda vêm de `src/lib/produtos.js` (valores de exemplo). O próximo passo é lê-los do banco.
- O número do WhatsApp da loja é configurado em `NEXT_PUBLIC_WHATSAPP_NUMERO`.
