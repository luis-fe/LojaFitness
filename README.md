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
| `npm run db:deploy` | Usado no deploy: tabelas + exemplos (se vazio) + primeiro admin (se não houver vendedores) |
| `npm run vendedor:criar` | Cria ou atualiza um vendedor direto no banco (use `-- --papel admin` para o primeiro) |

## Estrutura

Arquitetura em camadas (MVC) — detalhes em [`src/server/README.md`](src/server/README.md).

```
db/
  schema.sql            criação/migração do banco (tabelas, regras, view de preços)
  seed.sql              dados de exemplo
scripts/                db.mjs (roda os SQL / pré-deploy) e criar-vendedor.mjs
src/
  server/               BACKEND (só servidor)
    config/             BancoDeDados (conexão PostgreSQL)
    erros/              classes de erro (404, 409, 422...)
    http/               Rota (login, corpo, erros) e Autenticador (JWT Bearer)
    repositorios/       Model — SQL: Vendedor, Imagem, Layout, Tamanho, Cor, Produto, Campanha, Painel
    servicos/           Model — regras: Auth, Vendedor, Imagem, Armazenamento, Layout, Tamanho, Cor, Produto, Pedido, Painel
    controllers/        Controller — Auth, Vendedor, Imagem, Layout, Tamanho, Cor, Produto, Loja
    utils/              LimiteTentativas, senha (scrypt), validacao
    container.js        liga todas as classes (injeção de dependências)
  app/                  rotas Next.js — páginas e api/**/route.js (só apontam para os controllers)
    area-do-vendedor/(protegida)/    páginas que exigem login (perfil, produtos, tamanhos, cores,
                                     cadastro-produtos, carregar-imagens, vendedores, layout-site)
  views/                VIEW — telas (Produto, Carrinho, Login, AreaVendedor, Tamanhos, Cores, CadastroProdutos...)
  components/           VIEW — peças reutilizáveis (ListaDados, Campo, Modal, CardsMenu, SeletorImagens, blocos/...)
  context/              estado no navegador (Carrinho, Autenticacao)
  lib/                  código compartilhado navegador + servidor (formatos, layoutModelos, produtos, whatsapp)
```

### Padrão de listas

Use `src/components/ListaDados.jsx` para qualquer lista: no computador é uma tabela em que clicar no
cabeçalho ordena A→Z / Z→A; no celular cada linha vira um card, com o seletor "Ordenar por".

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
| GET | `/api/imagens` 🔒 | logado | Listar imagens (`?busca=&pagina=&porPagina=`) |
| POST | `/api/imagens` 🔒 | logado | Enviar imagem (multipart: `arquivo`, `codigo`, `descricao`) |
| GET/PATCH/DELETE | `/api/imagens/:id` 🔒 | quem enviou ou admin | Ver, editar código/descrição, excluir (apaga o arquivo) |
| GET | `/api/tamanhos` | público | Tamanhos na sequência de exibição |
| POST | `/api/tamanhos` 🔒 | logado | Cadastrar `{ codigo, nome, sequencia? }` |
| PATCH/DELETE | `/api/tamanhos/:codigo` 🔒 | logado | Editar / excluir (recusa se estiver em uso) |
| PUT | `/api/tamanhos/ordem` 🔒 | logado | Nova sequência `{ codigos: [...] }` |
| GET | `/api/cores` | público | Cores (código, nome, RGB) |
| POST | `/api/cores` 🔒 | logado | Cadastrar `{ nome, rgb, codigo? }` |
| PATCH/DELETE | `/api/cores/:codigo` 🔒 | logado | Editar / excluir (recusa se estiver em uso) |
| GET/POST | `/api/cadastro/produtos` 🔒 | logado | Listar / cadastrar produto com variações `filhos` |
| GET/PATCH/DELETE | `/api/cadastro/produtos/:codigo` 🔒 | logado | Ver, editar, excluir produto e variações |
| GET | `/api/campanhas` 🔒 | logado | Campanhas (para o cadastro de produtos) |
| GET | `/arquivos/:nome` | público | Entrega a imagem guardada no volume |
| GET/PUT | `/api/layout` 🔒 | admin | Ler layout (rascunho e publicado) / salvar rascunho `{ camadas }` |
| POST | `/api/layout/publicar` 🔒 | admin | Publicar `{ camadas }` na página inicial |

### Telas da Área do Vendedor

Menu principal em cards: **Perfil** (Novo Vendedor · Alterar Perfil), **Produtos** (Carregar imagens · Cadastrar Campanhas) e **Meu Site** (construtor de layout). Cards exclusivos de administrador aparecem bloqueados para vendedores.

| Tela | Quem vê | O que faz |
|---|---|---|
| **Meu perfil** | todos | Editar nome, telefone, CPF/CNPJ e nome fantasia; trocar a senha (continua conectado, outras sessões caem) |
| **Carregar imagens** | todos | Arrastar/escolher várias fotos, dar código e descrição a cada uma, ver o progresso; galeria com busca, copiar link, editar e excluir |
| **Construção Layout Site** | só admin | Monta a página inicial com camadas (Imagem destacada, Cascata de imagens, Imagens lado a lado, Vitrine de produtos); prévia ao vivo em computador/celular; rascunho e publicar |
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

Para proteger uma rota, use a opção `autenticar` (ou `papeis`) no controller:

```js
this.listar = rota(async ({ vendedor }) => ({ ... }), { autenticar: true })   // qualquer vendedor logado
this.criar  = rota(async ({ corpo }) => ({ ... }), { papeis: ['admin'], corpo: 'json' }) // só admin
// vendedor → { id, login, nome, nome_fantasia, papel, expiraEm }
```

## Deploy (Docker / Railway)

O `Dockerfile` gera uma imagem de produção enxuta (Next.js `standalone`, usuário sem privilégios).

```bash
docker build -t jlk-loja .
docker run -p 3000:3000 --env-file .env.local jlk-loja
```

No **Railway**:
1. Serviço a partir do repositório GitHub (o `Dockerfile` é detectado automaticamente) + um banco **PostgreSQL**.
2. Variáveis do serviço: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_WHATSAPP_NUMERO` e, para o primeiro acesso, `ADMIN_LOGIN` / `ADMIN_TELEFONE` / `ADMIN_SENHA_INICIAL`.
3. Comando de pré-deploy: `node scripts/db.mjs deploy` (prepara o banco antes de cada publicação).
4. Healthcheck: `/api/saude`.
5. Imagens enviadas: volume montado em `/data`, com `UPLOADS_DIR=/data/imagens` e `RAILWAY_RUN_UID=0`
   (o volume pertence ao root; sem isso o servidor não consegue gravar).

### Layout da página inicial

- A página inicial é montada a partir do layout **publicado** (tabela `layout_paginas`); sem layout salvo, usa o padrão (banner + vitrine).
- Camada = `{ id, tipo, visivel, dados }`, tipos `destaque`, `cascata`, `lado-a-lado`, `produtos` (modelos em `src/lib/layoutModelos.js`).
- O servidor valida tudo antes de salvar: até 20 camadas, imagens só do próprio site (`/arquivos/...` ou `/images/...`), links `/...` ou `https://...`.
- A prévia do construtor é a página `/previa-layout` dentro de um iframe, recebendo o rascunho por `postMessage`.

### Imagens

- Aceita **JPG, PNG e WEBP** até `IMAGEM_TAMANHO_MAX_MB` (padrão 5 MB). O tipo é conferido pelo conteúdo do arquivo.
- Cada imagem tem **código único** (normalizado: `conj calça azul` → `CONJ-CALCA-AZUL`) e **descrição**.
- O arquivo é salvo com nome aleatório em `UPLOADS_DIR` (local: `./uploads`) e registrado na tabela `imagens`.

## Observações

- A vitrine e a página de produto da loja ainda usam `src/lib/produtos.js` (exemplos). O cadastro novo (tabelas `produtos` / `produtos_filho`) já está pronto para substituí-los.
- O número do WhatsApp da loja é configurado em `NEXT_PUBLIC_WHATSAPP_NUMERO`.
