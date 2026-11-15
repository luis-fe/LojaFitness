-- =====================================================================
--  JLK Fitness e Casual — criação do banco de dados (PostgreSQL 14+)
-- =====================================================================
--
--  COMO USAR
--
--  1) Crie o banco (só na primeira vez; em Supabase/Neon o banco já existe):
--
--       psql -U postgres -c "CREATE DATABASE jlk_loja WITH ENCODING 'UTF8' TEMPLATE template0;"
--
--  2) Rode este arquivo dentro do banco:
--
--       psql "postgresql://usuario:senha@localhost:5432/jlk_loja" -f db/schema.sql
--
--     ou, usando o DATABASE_URL do .env.local:
--
--       npm run db:schema
--
--  3) (Opcional) Carregue os produtos de exemplo:
--
--       npm run db:seed
--
--  O script pode ser rodado mais de uma vez sem apagar dados
--  (usa IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- Esconde avisos informativos ("já existe, pulando")
SET client_min_messages = warning;

BEGIN;

-- ---------------------------------------------------------------------
-- Função utilitária: mantém a coluna "atualizado_em" sempre em dia
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION definir_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- TAMANHOS — lista de tamanhos e a ordem em que aparecem na grade
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tamanhos (
  codigo  text     PRIMARY KEY,                 -- 'P', 'M', 'G', 'GG'...
  ordem   smallint NOT NULL UNIQUE
);

INSERT INTO tamanhos (codigo, ordem) VALUES
  ('PP', 1), ('P', 2), ('M', 3), ('G', 4), ('GG', 5), ('XG', 6)
ON CONFLICT (codigo) DO NOTHING;


-- ---------------------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text          NOT NULL UNIQUE
                 CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),       -- usado na URL: /produto/conjunto-calca
  nome           text          NOT NULL CHECK (length(trim(nome)) > 0),
  descricao      text          NOT NULL DEFAULT '',
  preco          numeric(10,2) NOT NULL CHECK (preco >= 0),
  ativo          boolean       NOT NULL DEFAULT true,            -- false = não aparece na loja
  destaque       boolean       NOT NULL DEFAULT false,           -- aparece no carrossel de novidades
  criado_em      timestamptz   NOT NULL DEFAULT now(),
  atualizado_em  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produtos_ativos_idx ON produtos (ativo, destaque);

DROP TRIGGER IF EXISTS produtos_atualizado_em ON produtos;
CREATE TRIGGER produtos_atualizado_em
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- IMAGENS DOS PRODUTOS (tela "Carregar imagens" da Área do Vendedor)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto_imagens (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id  bigint      NOT NULL REFERENCES produtos (id) ON DELETE CASCADE,
  url         text        NOT NULL,
  texto_alt   text        NOT NULL DEFAULT '',                   -- descrição para acessibilidade e Google
  cor         text,                                              -- NULL = vale para todas as cores
  ordem       smallint    NOT NULL DEFAULT 0,                    -- 0 = imagem principal
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produto_imagens_produto_idx ON produto_imagens (produto_id, ordem);


-- ---------------------------------------------------------------------
-- VARIANTES = combinação cor x tamanho, com o estoque disponível
-- (é a grade "cores nas linhas, tamanhos nas colunas" da página do produto)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto_variantes (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id     bigint      NOT NULL REFERENCES produtos (id) ON DELETE CASCADE,
  cor            text        NOT NULL CHECK (length(trim(cor)) > 0),
  cor_hex        text        NOT NULL DEFAULT '#000000'
                 CHECK (cor_hex ~ '^#[0-9a-fA-F]{6}$'),
  tamanho        text        NOT NULL REFERENCES tamanhos (codigo),
  estoque        integer     NOT NULL DEFAULT 0 CHECK (estoque >= 0),   -- nunca fica negativo
  sku            text        UNIQUE,                                     -- código interno (opcional)
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, cor, tamanho)
);

CREATE INDEX IF NOT EXISTS produto_variantes_produto_idx ON produto_variantes (produto_id);

DROP TRIGGER IF EXISTS produto_variantes_atualizado_em ON produto_variantes;
CREATE TRIGGER produto_variantes_atualizado_em
  BEFORE UPDATE ON produto_variantes
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- CAMPANHAS (tela "Cadastrar Campanhas" da Área do Vendedor)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanhas (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome                 text         NOT NULL CHECK (length(trim(nome)) > 0),   -- ex.: 'Black Friday 2026'
  desconto_percentual  numeric(5,2) NOT NULL CHECK (desconto_percentual > 0 AND desconto_percentual < 100),
  inicio               timestamptz  NOT NULL,
  fim                  timestamptz  NOT NULL,
  ativa                boolean      NOT NULL DEFAULT true,
  criado_em            timestamptz  NOT NULL DEFAULT now(),
  atualizado_em        timestamptz  NOT NULL DEFAULT now(),
  CHECK (fim > inicio)
);

DROP TRIGGER IF EXISTS campanhas_atualizado_em ON campanhas;
CREATE TRIGGER campanhas_atualizado_em
  BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

-- Quais produtos participam de cada campanha
CREATE TABLE IF NOT EXISTS campanha_produtos (
  campanha_id  bigint NOT NULL REFERENCES campanhas (id) ON DELETE CASCADE,
  produto_id   bigint NOT NULL REFERENCES produtos (id) ON DELETE CASCADE,
  PRIMARY KEY (campanha_id, produto_id)
);


-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       text,
  telefone   text UNIQUE,                    -- WhatsApp, só dígitos: 5511987654321
  email      text UNIQUE,
  criado_em  timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo         text GENERATED ALWAYS AS ('JLK-' || lpad(id::text, 6, '0')) STORED UNIQUE,  -- ex.: JLK-000042
  cliente_id     bigint REFERENCES clientes (id) ON DELETE SET NULL,
  canal          text          NOT NULL DEFAULT 'whatsapp'
                 CHECK (canal IN ('whatsapp', 'site')),
  status         text          NOT NULL DEFAULT 'aguardando_pagamento'
                 CHECK (status IN ('aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado', 'expirado')),
  total          numeric(10,2) NOT NULL CHECK (total >= 0),
  observacao     text,
  pago_em        timestamptz,
  criado_em      timestamptz   NOT NULL DEFAULT now(),
  atualizado_em  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedidos_status_idx ON pedidos (status, criado_em DESC);
CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON pedidos (cliente_id);

DROP TRIGGER IF EXISTS pedidos_atualizado_em ON pedidos;
CREATE TRIGGER pedidos_atualizado_em
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

-- Itens do pedido: guardam nome, cor, tamanho e preço do MOMENTO da compra
-- (se o preço mudar depois, o pedido antigo não muda)
CREATE TABLE IF NOT EXISTS pedido_itens (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id       bigint        NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
  variante_id     bigint        REFERENCES produto_variantes (id) ON DELETE SET NULL,
  produto_nome    text          NOT NULL,
  cor             text          NOT NULL,
  tamanho         text          NOT NULL,
  quantidade      integer       NOT NULL CHECK (quantidade > 0),
  preco_unitario  numeric(10,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal        numeric(10,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
);

CREATE INDEX IF NOT EXISTS pedido_itens_pedido_idx ON pedido_itens (pedido_id);


-- ---------------------------------------------------------------------
-- PAGAMENTOS (preparado para Pix dinâmico com expiração)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamentos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id      bigint        NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
  metodo         text          NOT NULL DEFAULT 'pix' CHECK (metodo IN ('pix')),
  provedor       text,                                   -- ex.: 'mercadopago', 'asaas', 'efi'
  txid           text UNIQUE,                            -- identificador da cobrança no provedor
  valor          numeric(10,2) NOT NULL CHECK (valor > 0),
  status         text          NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente', 'pago', 'expirado', 'cancelado', 'estornado')),
  copia_e_cola   text,                                   -- código "Pix copia e cola"
  expira_em      timestamptz,                            -- quando o QR Code deixa de valer
  pago_em        timestamptz,
  resposta       jsonb,                                  -- resposta bruta do provedor (para auditoria)
  criado_em      timestamptz   NOT NULL DEFAULT now(),
  atualizado_em  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagamentos_pedido_idx ON pagamentos (pedido_id);
CREATE INDEX IF NOT EXISTS pagamentos_pendentes_idx ON pagamentos (expira_em) WHERE status = 'pendente';

DROP TRIGGER IF EXISTS pagamentos_atualizado_em ON pagamentos;
CREATE TRIGGER pagamentos_atualizado_em
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- VENDEDORES — quem acessa a Área do Vendedor (login + senha → token JWT)
--
--   • A senha NUNCA é guardada: só o hash (scrypt) em senha_hash.
--   • Telefone e CPF/CNPJ são guardados só com dígitos.
--   • CPF/CNPJ e nome fantasia são opcionais.
--   • Vendedor não é apagado: é desativado (ativo = false), preservando o histórico.
--
--   Crie o primeiro (administrador) com:
--     npm run vendedor:criar -- --papel admin
-- ---------------------------------------------------------------------

-- A tabela "usuarios" da versão anterior foi substituída por "vendedores"
DROP TABLE IF EXISTS usuarios;

CREATE TABLE IF NOT EXISTS vendedores (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login              text        NOT NULL UNIQUE
                     CHECK (login ~ '^[a-z0-9._-]{3,40}$'),            -- sempre em minúsculas
  nome               text        NOT NULL
                     CHECK (length(trim(nome)) BETWEEN 2 AND 120),
  senha_hash         text        NOT NULL,                              -- senha criptografada (scrypt)
  telefone           text        NOT NULL
                     CHECK (telefone ~ '^[0-9]{10,13}$'),               -- ex.: 11987654321 ou 5511987654321
  cpf_cnpj           text        UNIQUE
                     CHECK (cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'),      -- opcional: 11 dígitos (CPF) ou 14 (CNPJ)
  tipo_documento     text GENERATED ALWAYS AS (
                       CASE length(cpf_cnpj) WHEN 11 THEN 'cpf' WHEN 14 THEN 'cnpj' END
                     ) STORED,
  nome_fantasia      text
                     CHECK (nome_fantasia IS NULL OR length(trim(nome_fantasia)) BETWEEN 2 AND 120),  -- opcional
  papel              text        NOT NULL DEFAULT 'vendedor'
                     CHECK (papel IN ('vendedor', 'admin')),          -- admin gerencia os outros vendedores
  ativo              boolean     NOT NULL DEFAULT true,                -- false = não consegue entrar
  senha_alterada_em  timestamptz NOT NULL DEFAULT now(),               -- tokens emitidos antes disso deixam de valer
  ultimo_login_em    timestamptz,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendedores_ativos_idx ON vendedores (ativo, nome);

DROP TRIGGER IF EXISTS vendedores_atualizado_em ON vendedores;
CREATE TRIGGER vendedores_atualizado_em
  BEFORE UPDATE ON vendedores
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- IMAGENS (tela "Carregar imagens" da Área do Vendedor)
--
--   • O arquivo fica no volume do servidor (pasta UPLOADS_DIR); aqui fica o registro.
--   • Cada imagem tem um CÓDIGO único (ex.: CONJ-CALCA-AZUL) e uma DESCRIÇÃO.
--   • O nome do arquivo no disco é aleatório, para ninguém adivinhar endereços.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imagens (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo         text        NOT NULL UNIQUE
                 CHECK (codigo ~ '^[A-Z0-9][A-Z0-9._-]{1,59}$'),      -- maiúsculas, números, . _ -
  descricao      text        NOT NULL
                 CHECK (length(trim(descricao)) BETWEEN 2 AND 200),
  arquivo        text        NOT NULL UNIQUE,                          -- nome do arquivo no volume
  tipo_mime      text        NOT NULL
                 CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  tamanho_bytes  integer     NOT NULL CHECK (tamanho_bytes > 0),
  largura        integer     CHECK (largura > 0),
  altura         integer     CHECK (altura > 0),
  vendedor_id    bigint      REFERENCES vendedores (id) ON DELETE SET NULL,  -- quem enviou
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS imagens_criado_idx ON imagens (criado_em DESC);

DROP TRIGGER IF EXISTS imagens_atualizado_em ON imagens;
CREATE TRIGGER imagens_atualizado_em
  BEFORE UPDATE ON imagens
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- LAYOUT DO SITE (tela "Construção Layout Site" da Área do Vendedor)
--
--   • camadas da página em JSON: [{ id, tipo, visivel, dados }]
--   • rascunho = o que está sendo editado · publicado = o que os clientes veem
--   • sem linha aqui, o site usa o layout padrão definido no código
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS layout_paginas (
  pagina          text        PRIMARY KEY CHECK (pagina IN ('inicio')),
  rascunho        jsonb       NOT NULL CHECK (jsonb_typeof(rascunho) = 'array'),
  publicado       jsonb       NOT NULL CHECK (jsonb_typeof(publicado) = 'array'),
  atualizado_por  bigint      REFERENCES vendedores (id) ON DELETE SET NULL,
  publicado_por   bigint      REFERENCES vendedores (id) ON DELETE SET NULL,
  publicado_em    timestamptz,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS layout_paginas_atualizado_em ON layout_paginas;
CREATE TRIGGER layout_paginas_atualizado_em
  BEFORE UPDATE ON layout_paginas
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();


-- ---------------------------------------------------------------------
-- VIEW: preço final de cada produto, já com a melhor campanha ativa
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW produtos_com_preco AS
SELECT
  p.*,
  c.id                  AS campanha_id,
  c.nome                AS campanha_nome,
  c.desconto_percentual,
  round(p.preco * (1 - COALESCE(c.desconto_percentual, 0) / 100), 2) AS preco_final
FROM produtos p
LEFT JOIN LATERAL (
  SELECT c.*
  FROM campanha_produtos cp
  JOIN campanhas c ON c.id = cp.campanha_id
  WHERE cp.produto_id = p.id
    AND c.ativa
    AND now() BETWEEN c.inicio AND c.fim
  ORDER BY c.desconto_percentual DESC
  LIMIT 1
) c ON true;

COMMIT;
