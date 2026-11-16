# Backend — arquitetura em camadas (MVC)

Todo o código que roda **só no servidor** fica em `src/server`. As telas (View) ficam em
`src/views` e `src/components`; os arquivos `src/app/api/**/route.js` apenas ligam cada
endereço ao controller correspondente.

```
Requisição HTTP
   │
   ▼
src/app/api/.../route.js      2–5 linhas: export const GET = tamanhoController.listar
   │
   ▼
controllers/   (Controller)   lê parâmetros/corpo, chama o serviço, monta a resposta
   │
   ▼
servicos/      (Model)        regras de negócio e validações — não conhece SQL nem HTTP
   │
   ▼
repositorios/  (Model)        somente SQL; traduz erros do banco em erros de negócio
   │
   ▼
config/BancoDeDados.js        conexão (pool), consultas e transações
```

## Pastas

| Pasta | Conteúdo |
|---|---|
| `config/` | `BancoDeDados` — pool do PostgreSQL, `consultar()`, `transacao()` |
| `erros/` | `ErroAplicacao` e filhas (`ErroValidacao` 422, `ErroConflito` 409, `ErroNaoEncontrado` 404, `ErroPermissao` 403, `ErroNaoAutenticado` 401…) |
| `http/` | `Rota` (login, leitura do corpo, erros → JSON) e `Autenticador` (token Bearer) |
| `repositorios/` | `VendedorRepositorio`, `ImagemRepositorio`, `LayoutRepositorio`, `TamanhoRepositorio`, `CorRepositorio`, `ProdutoRepositorio`, `CampanhaRepositorio`, `PainelRepositorio`, `VisitaRepositorio`, `ClienteRepositorio`, `PedidoRepositorio` |
| `servicos/` | `AuthServico`, `VendedorServico`, `ImagemServico`, `ArmazenamentoServico`, `LayoutServico`, `TamanhoServico`, `CorServico`, `ProdutoServico`, `PedidoServico`, `PainelServico`, `VisitaServico`, `CatalogoServico` |
| `controllers/` | `AuthController`, `VendedorController`, `ImagemController`, `LayoutController`, `TamanhoController`, `CorController`, `ProdutoController`, `LojaController`, `VisitaController` |
| `utils/` | `LimiteTentativas`, `senha` (hash scrypt) e `validacao` (também usados pelos scripts de terminal) |
| `container.js` | cria todas as instâncias e liga as dependências (injeção de dependências) |

Código usado **também no navegador** continua em `src/lib` (`formatos`, `layoutModelos`, `produtos`, `whatsapp`, `config`).

## Regras de cada camada

- **Controller** não tem regra de negócio nem SQL. Usa `rota(acao, opções)`:
  ```js
  this.criar = rota(async ({ corpo, vendedor }) => Resposta.criado({ cor: await s.criar(corpo) }),
    { autenticar: true, corpo: 'json', rotulo: 'POST /api/cores' })
  ```
  Opções: `autenticar`, `papeis: ['admin']`, `corpo: 'json' | 'formulario'`, `rotulo` (para logs).
- **Serviço** valida, decide e lança erros da pasta `erros/`. Recebe repositórios no construtor.
- **Repositório** só executa SQL **parametrizado** (`$1, $2…`) e devolve linhas. Nomes de coluna
  em `UPDATE` dinâmico vêm sempre de listas fixas do serviço, nunca do usuário.
- Erros lançados em qualquer camada viram resposta JSON automaticamente:
  `{ "erro": "mensagem", "campos": { "campo": "mensagem" }, "codigo": "..." }`.

## Como adicionar um novo recurso (ex.: Campanhas)

1. `repositorios/CampanhaRepositorio.js` — consultas SQL.
2. `servicos/CampanhaServico.js` — validações e regras.
3. `controllers/CampanhaController.js` — `this.listar = rota(...)`, `this.criar = rota(...)`.
4. Registrar as três classes em `container.js`.
5. `src/app/api/campanhas/route.js`:
   ```js
   import { campanhaController } from '@/server/container'
   export const dynamic = 'force-dynamic'
   export const GET = campanhaController.listar
   export const POST = campanhaController.criar
   ```
