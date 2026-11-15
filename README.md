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

# primeiro vendedor ADMINISTRADOR (a senha é pedida no terminal)
npm run vendedor:criar -- --papel admin

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
| `npm run vendedor:criar` | Cria ou atualiza um vendedor direto no banco (use `-- --papel admin` para o primeiro) |

## Estrutura

```
db/
  schema.sql            criação do banco (tabelas, regras, view de preços)
  seed.sql              dados de exemplo
scripts/                db.mjs (roda os SQL) e criar-vendedor.mjs
src/
  app/                  rotas (páginas e API)
    page.jsx                         /
    produto/[slug]/page.jsx          /produto/conjunto-calca
    carrinho/page.jsx                /carrinho
    area-do-vendedor/login/          /area-do-vendedor/login
    area-do-vendedor/(protegida)/    páginas que exigem login:
      perfil/                        /area-do-vendedor/perfil      (meus dados e senha)
      vendedores/                    /area-do-vendedor/vendedores  (gestão, só admin)
    api/                             backend (ver abaixo)
  components/           Header, Hero, Carrossel, Campo, Modal, PaginaVendedor...
  views/                telas (Produto, Carrinho, Login, AreaVendedor, Perfil, Vendedores)
  context/              Carrinho e Autenticacao (estado no navegador)
  lib/                  db, auth (JWT), vendedores, validacao, senha, pedidos, produtos, whatsapp
```

## API

Rotas marcadas com 🔒 exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| GET | `/api/saude` | público | Status do servidor e do banco |
| GET | `/api/produtos` | público | Lista de produtos |
| GET | `/api/produtos/:slug` | público | Um produto |
| POST | `/api/pedidos` | público | Confere estoque, recalcula o total e devolve o link do WhatsApp |
| POST | `/api/auth/login` | público | Login e senha → token JWT (expira em 3 h) |
| GET | `/api/auth/eu` 🔒 | logado | Vendedor da sessão |
| GET | `/api/vendedor/resumo` 🔒 | logado | Números da loja e estoque baixo |
| GET | `/api/vendedores/eu` 🔒 | logado | Meu cadastro |
| PATCH | `/api/vendedores/eu` 🔒 | logado | Editar meu nome, telefone, CPF/CNPJ, nome fantasia |
| PUT | `/api/vendedores/eu/senha` 🔒 | logado | Trocar minha senha (`senhaAtual`, `novaSenha`) |
| GET | `/api/vendedores` 🔒 | admin | Listar (`?busca=&ativo=true&pagina=1&porPagina=20`) |
| POST | `/api/vendedores` 🔒 | admin | Cadastrar vendedor |
| GET | `/api/vendedores/:id` 🔒 | admin ou o próprio | Ver cadastro |
| PATCH | `/api/vendedores/:id` 🔒 | admin ou o próprio | Editar (o próprio não altera login, papel nem ativo) |
| DELETE | `/api/vendedores/:id` 🔒 | admin | Desativar (não apaga) e derrubar as sessões dele |
| PUT | `/api/vendedores/:id/senha` 🔒 | admin ou o próprio | Admin redefine sem a senha atual |

### Telas da Área do Vendedor

| Tela | Quem vê | O que faz |
|---|---|---|
| **Meu perfil** | todos | Editar nome, telefone, CPF/CNPJ e nome fantasia; trocar a senha (continua conectado, outras sessões caem) |
| **Vendedores** | só admin | Lista com busca e filtro (todos/ativos/inativos), cadastrar, editar, redefinir senha, desativar e reativar |

### Vendedores — campos e regras

| Campo | Obrigatório | Regra |
|---|---|---|
| `login` | sim | 3–40 caracteres: letras minúsculas, números, `.` `-` `_` · único · convertido para minúsculas |
| `nome` | sim | 2–120 caracteres |
| `senha` | sim (no cadastro) | mínimo 8 caracteres · guardada só como hash scrypt · nunca volta nas respostas |
| `telefone` | sim | DDD + número (com ou sem 55) · guardado só com dígitos |
| `cpf_cnpj` | não | dígitos verificadores conferidos · único · guardado só com dígitos · `tipo_documento` é calculado (`cpf`/`cnpj`) |
| `nome_fantasia` | não | 2–120 caracteres · enviar vazio ou `null` remove |
| `papel` | não | `vendedor` (padrão) ou `admin` — só admin altera |
| `ativo` | — | só admin altera · desativar bloqueia o login e derruba as sessões |

Outras regras:
- Vendedor nunca é apagado, só desativado (preserva o histórico de pedidos).
- A loja sempre mantém **pelo menos um administrador ativo**; ninguém remove o próprio acesso de admin.
- Trocar a senha invalida todos os tokens anteriores daquele vendedor.
- Mudanças de papel valem na hora (o papel é lido do banco a cada requisição).
- Erros de validação voltam como `422` com `campos: { campo: "mensagem" }`; login/CPF repetido volta `409`.

### Autenticação (JWT)

```bash
# 1. login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"maria","senha":"sua-senha"}'
# → { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "...", "expiraEmSegundos": 10800, "vendedor": {...} }

# 2. chamadas protegidas
curl http://localhost:3000/api/vendedor/resumo -H "Authorization: Bearer eyJ..."
```

- Token assinado com `JWT_SECRET` (HS256), validade definida em `JWT_EXPIRACAO` (padrão `3h`).
- Senhas guardadas apenas como hash **scrypt**.
- Após 5 tentativas erradas, o login é bloqueado por 15 minutos (por IP + usuário).
- Respostas `401` trazem `codigo`: `token_ausente`, `token_invalido`, `token_expirado`, `token_revogado` (senha trocada) ou `conta_inativa`.

Para proteger uma nova rota:

```js
import { exigirAutenticacao } from '@/lib/auth'

export async function GET(request) {
  const auth = await exigirAutenticacao(request) // ou { papeis: ['admin'] }
  if (auth.erro) return auth.erro
  // auth.vendedor → { id, login, nome, nome_fantasia, papel, expiraEm }
}
```

## Observações

- Os produtos exibidos no site ainda vêm de `src/lib/produtos.js` (valores de exemplo). O próximo passo é lê-los do banco.
- O número do WhatsApp da loja é configurado em `NEXT_PUBLIC_WHATSAPP_NUMERO`.
