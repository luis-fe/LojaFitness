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
-- TAMANHOS — código, nome e sequência de exibição na grade do produto
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tamanhos (
  codigo     text     PRIMARY KEY CHECK (codigo ~ '^[A-Z0-9]{1,6}$'),  -- 'P', 'M', 'G', 'GG', '38'...
  nome       text     NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 40),
  sequencia  smallint NOT NULL UNIQUE CHECK (sequencia > 0)             -- ordem de exibição (1 = primeiro)
);

-- Bancos antigos: "ordem" vira "sequencia" e ganha a coluna "nome"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tamanhos' AND column_name = 'ordem') THEN
    ALTER TABLE tamanhos RENAME COLUMN ordem TO sequencia;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tamanhos' AND column_name = 'nome') THEN
    ALTER TABLE tamanhos ADD COLUMN nome text;
    UPDATE tamanhos t SET nome = n.nome
    FROM (VALUES ('PP', 'Extra pequeno'), ('P', 'Pequeno'), ('M', 'Médio'), ('G', 'Grande'),
                 ('GG', 'Extra grande'), ('XG', 'Extra extra grande')) AS n (codigo, nome)
    WHERE t.codigo = n.codigo;
    UPDATE tamanhos SET nome = codigo WHERE nome IS NULL;
    ALTER TABLE tamanhos ALTER COLUMN nome SET NOT NULL;
    ALTER TABLE tamanhos ADD CONSTRAINT tamanhos_nome_check CHECK (length(trim(nome)) BETWEEN 1 AND 40);
  END IF;
END $$;

INSERT INTO tamanhos (codigo, nome, sequencia) VALUES
  ('PP', 'Extra pequeno', 1), ('P', 'Pequeno', 2), ('M', 'Médio', 3),
  ('G', 'Grande', 4), ('GG', 'Extra grande', 5), ('XG', 'Extra extra grande', 6)
ON CONFLICT (codigo) DO NOTHING;


-- ---------------------------------------------------------------------
-- CORES — código, nome e a cor RGB (formato #RRGGBB, ex.: #4A7FD8)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cores (
  codigo         text        PRIMARY KEY CHECK (codigo ~ '^[A-Z0-9][A-Z0-9_-]{0,29}$'),  -- ex.: AZUL, VERDE-MILITAR
  nome           text        NOT NULL UNIQUE CHECK (length(trim(nome)) BETWEEN 1 AND 40),
  rgb            text        NOT NULL CHECK (rgb ~ '^#[0-9A-F]{6}$'),                      -- sempre maiúsculas
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS cores_atualizado_em ON cores;
CREATE TRIGGER cores_atualizado_em
  BEFORE UPDATE ON cores
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

INSERT INTO cores (codigo, nome, rgb) VALUES
  ('PRETO', 'Preto', '#111111'), ('BRANCO', 'Branco', '#FFFFFF'), ('AZUL', 'Azul', '#4A7FD8'),
  ('VERDE', 'Verde', '#9DB88F'), ('ROSA', 'Rosa', '#E8A5B8'), ('CINZA', 'Cinza', '#9E9E9E')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------
-- PRODUTOS
--   (os campos codigo, campanha_id, criado_por e caminho são adicionados mais
--    abaixo, em "PRODUTOS — cadastro", porque dependem de campanhas e vendedores)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text          NOT NULL UNIQUE
                 CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),       -- usado na URL: /produto/conjunto-calca
  nome           text          NOT NULL CHECK (length(trim(nome)) > 0),
  descricao      text          NOT NULL DEFAULT '',
  preco_atual    numeric(10,2) NOT NULL CHECK (preco_atual >= 0),  -- preço atual (decimal exato, 2 casas)
  ativo          boolean       NOT NULL DEFAULT true,            -- false = não aparece na loja
  destaque       boolean       NOT NULL DEFAULT false,           -- aparece no carrossel de novidades
  criado_em      timestamptz   NOT NULL DEFAULT now(),
  atualizado_em  timestamptz   NOT NULL DEFAULT now()
);

-- Bancos criados antes: a coluna "preco" passa a se chamar "preco_atual" (valores mantidos)
DROP VIEW IF EXISTS produtos_com_preco;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'preco')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'preco_atual') THEN
    ALTER TABLE produtos RENAME COLUMN preco TO preco_atual;
  END IF;
END $$;

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


-- (As variações cor x tamanho ficam na tabela "produtos_filho", mais abaixo,
--  depois de "PRODUTOS — cadastro", porque usam o código do produto.)


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
  produto_filho_id bigint,                                  -- variação vendida (ligada a produtos_filho mais abaixo)
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
-- PRODUTOS — cadastro
--
--   codigo       código do produto (único, maiúsculas), ex.: CONJ-CALCA-AZUL
--   descricao    descrição do produto (coluna já existente)
--   preco_atual  preço atual, numeric(10,2): decimal exato (evita erros de centavos do float)
--   campanha_id  campanha do produto — NÃO obrigatório
--   criado_em    data da criação (coluna já existente)
--   criado_por   vendedor que cadastrou o produto
--   caminho      URL da imagem do produto no volume, ex.: /arquivos/<id>.jpg
--
--   Escrito com ADD COLUMN IF NOT EXISTS para atualizar bancos que já existem
--   sem perder dados (produtos antigos recebem código e caminho automaticamente).
-- ---------------------------------------------------------------------

-- Substituída por produtos.campanha_id (cada produto tem no máximo uma campanha)
DROP VIEW IF EXISTS produtos_com_preco;
DROP TABLE IF EXISTS campanha_produtos;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS codigo      text,
  ADD COLUMN IF NOT EXISTS campanha_id bigint REFERENCES campanhas (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_por  bigint REFERENCES vendedores (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS caminho     text;

-- Produtos que já existiam: código a partir do slug e caminho a partir da imagem principal
UPDATE produtos SET codigo = upper(slug) WHERE codigo IS NULL;

UPDATE produtos p
SET caminho = i.url
FROM (
  SELECT DISTINCT ON (produto_id) produto_id, url
  FROM produto_imagens
  ORDER BY produto_id, ordem, id
) i
WHERE p.id = i.produto_id AND p.caminho IS NULL;

ALTER TABLE produtos ALTER COLUMN codigo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_codigo_key') THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_codigo_key UNIQUE (codigo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_codigo_check') THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_codigo_check
      CHECK (codigo ~ '^[A-Z0-9][A-Z0-9._-]{1,59}$');
  END IF;
  -- Só aceita imagens do próprio site: enviadas (/arquivos/...) ou padrão (/images/...)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_caminho_check') THEN
    ALTER TABLE produtos ADD CONSTRAINT produtos_caminho_check
      CHECK (caminho IS NULL
             OR caminho ~ '^/arquivos/[0-9a-f-]{36}\.(jpg|png|webp)$'
             OR caminho ~ '^/images/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS produtos_campanha_idx   ON produtos (campanha_id);
CREATE INDEX IF NOT EXISTS produtos_criado_por_idx ON produtos (criado_por);

COMMENT ON COLUMN produtos.codigo      IS 'Código do produto (único, maiúsculas)';
COMMENT ON COLUMN produtos.descricao   IS 'Descrição do produto';
COMMENT ON COLUMN produtos.preco_atual IS 'Preço atual em reais (decimal exato, 2 casas)';
COMMENT ON COLUMN produtos.campanha_id IS 'Campanha do produto (opcional)';
COMMENT ON COLUMN produtos.criado_em   IS 'Data da criação';
COMMENT ON COLUMN produtos.criado_por  IS 'Vendedor que cadastrou o produto';
COMMENT ON COLUMN produtos.caminho     IS 'URL da imagem do produto no volume (ex.: /arquivos/<id>.jpg)';


-- ---------------------------------------------------------------------
-- PRODUTOS_FILHO — variações do produto (cor x tamanho), com o estoque
-- (é a grade "cores nas linhas, tamanhos nas colunas" da página do produto)
--
--   id              código sequencial automático (1, 2, 3...)
--   codigo_produto  código do produto pai (produtos.codigo)
--   cor, tamanho    códigos da cor (cores) e do tamanho (tamanhos); cada combinação uma vez por produto
--   estoque         quantidade disponível (nunca negativa)
--
--   Bancos antigos: a tabela "produto_variantes" (ligada por produto_id) é
--   renomeada e convertida para usar o código do produto, sem perder dados.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.produto_variantes') IS NOT NULL AND to_regclass('public.produtos_filho') IS NULL THEN
    ALTER TABLE produto_variantes RENAME TO produtos_filho;
    DROP TRIGGER IF EXISTS produto_variantes_atualizado_em ON produtos_filho;
    ALTER INDEX IF EXISTS produto_variantes_pkey RENAME TO produtos_filho_pkey;
  END IF;

  -- Converte produto_id → codigo_produto
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos_filho' AND column_name = 'produto_id') THEN
    ALTER TABLE produtos_filho ADD COLUMN IF NOT EXISTS codigo_produto text;
    UPDATE produtos_filho f SET codigo_produto = p.codigo FROM produtos p WHERE p.id = f.produto_id AND f.codigo_produto IS NULL;
    ALTER TABLE produtos_filho DROP COLUMN produto_id;  -- remove também a ligação e o índice antigos
    ALTER TABLE produtos_filho DROP CONSTRAINT IF EXISTS produto_variantes_tamanho_fkey;
  END IF;

  -- pedido_itens.variante_id → produto_filho_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedido_itens' AND column_name = 'variante_id') THEN
    ALTER TABLE pedido_itens RENAME COLUMN variante_id TO produto_filho_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS produtos_filho (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_produto  text        NOT NULL,
  cor             text        NOT NULL,                                   -- código da cor (cores.codigo)
  tamanho         text        NOT NULL,                                   -- código do tamanho (tamanhos.codigo)
  estoque         integer     NOT NULL DEFAULT 0 CHECK (estoque >= 0),   -- nunca fica negativo
  sku             text        UNIQUE,                                     -- código interno (opcional)
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE produtos_filho ALTER COLUMN codigo_produto SET NOT NULL;

-- Bancos antigos: cada variação guardava o nome e o RGB da cor; agora aponta para a tabela cores
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos_filho' AND column_name = 'cor_hex') THEN
    CREATE TEMP TABLE _cores_migracao ON COMMIT DROP AS
    SELECT DISTINCT ON (cor)
      cor AS nome_antigo,
      trim(BOTH '-' FROM regexp_replace(upper(translate(cor,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^A-Z0-9]+', '-', 'g')) AS codigo,
      upper(cor_hex) AS rgb
    FROM produtos_filho
    ORDER BY cor, id;

    INSERT INTO cores (codigo, nome, rgb)
    SELECT codigo, nome_antigo, rgb FROM _cores_migracao
    ON CONFLICT DO NOTHING;

    UPDATE produtos_filho f SET cor = m.codigo FROM _cores_migracao m WHERE f.cor = m.nome_antigo;
    ALTER TABLE produtos_filho DROP COLUMN cor_hex;
    ALTER TABLE produtos_filho DROP CONSTRAINT IF EXISTS produto_variantes_cor_check;
  END IF;
END $$;

DO $$
BEGIN
  -- Ligação com o produto pai pelo código (se o código mudar, acompanha; se o produto for apagado, as variações também)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_filho_codigo_produto_fkey') THEN
    ALTER TABLE produtos_filho ADD CONSTRAINT produtos_filho_codigo_produto_fkey
      FOREIGN KEY (codigo_produto) REFERENCES produtos (codigo) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_filho_cor_fkey') THEN
    ALTER TABLE produtos_filho ADD CONSTRAINT produtos_filho_cor_fkey
      FOREIGN KEY (cor) REFERENCES cores (codigo) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_filho_tamanho_fkey') THEN
    ALTER TABLE produtos_filho ADD CONSTRAINT produtos_filho_tamanho_fkey
      FOREIGN KEY (tamanho) REFERENCES tamanhos (codigo) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produtos_filho_codigo_cor_tamanho_key') THEN
    ALTER TABLE produtos_filho ADD CONSTRAINT produtos_filho_codigo_cor_tamanho_key UNIQUE (codigo_produto, cor, tamanho);
  END IF;
  -- Itens de pedido apontam para a variação vendida
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('pedido_itens_produto_filho_id_fkey', 'pedido_itens_variante_id_fkey')) THEN
    ALTER TABLE pedido_itens ADD CONSTRAINT pedido_itens_produto_filho_id_fkey
      FOREIGN KEY (produto_filho_id) REFERENCES produtos_filho (id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ligação antiga com tamanhos (de produto_variantes), substituída por produtos_filho_tamanho_fkey
ALTER TABLE produtos_filho DROP CONSTRAINT IF EXISTS produto_variantes_tamanho_fkey;

CREATE INDEX IF NOT EXISTS produtos_filho_codigo_idx ON produtos_filho (codigo_produto);

DROP TRIGGER IF EXISTS produtos_filho_atualizado_em ON produtos_filho;
CREATE TRIGGER produtos_filho_atualizado_em
  BEFORE UPDATE ON produtos_filho
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMENT ON TABLE  produtos_filho                IS 'Variações do produto (cor x tamanho) com estoque';
COMMENT ON COLUMN produtos_filho.id             IS 'Código sequencial da variação';
COMMENT ON COLUMN produtos_filho.codigo_produto IS 'Código do produto pai (produtos.codigo)';


-- ---------------------------------------------------------------------
-- VIEW: produto com o preço final (preco_atual com o desconto da campanha, se estiver ativa e no período)
-- ---------------------------------------------------------------------
CREATE VIEW produtos_com_preco AS
SELECT
  p.id, p.codigo, p.slug, p.nome, p.descricao, p.preco_atual, p.caminho, p.ativo, p.destaque,
  p.campanha_id, p.criado_em, p.criado_por, p.atualizado_em,
  c.nome AS campanha_nome,
  CASE WHEN c.id IS NOT NULL THEN c.desconto_percentual END AS desconto_percentual,
  round(p.preco_atual * (1 - COALESCE(c.desconto_percentual, 0) / 100), 2) AS preco_final
FROM produtos p
LEFT JOIN campanhas c
  ON c.id = p.campanha_id
 AND c.ativa
 AND now() BETWEEN c.inicio AND c.fim;

COMMIT;
