-- =====================================================================
--  JLK Fitness e Casual — dados de EXEMPLO
-- =====================================================================
--  ⚠️ Preços, cores e estoque abaixo são EXEMPLOS (os mesmos do site hoje).
--     Substitua pelos valores reais da loja.
--
--  Rodar:  npm run db:seed
--  Pode ser rodado de novo: atualiza os produtos sem duplicar.
-- =====================================================================

-- Esconde avisos informativos ("já existe, pulando")
SET client_min_messages = warning;

BEGIN;

-- Produtos -------------------------------------------------------------
INSERT INTO produtos (slug, nome, descricao, preco, destaque) VALUES
  ('conjunto-calca',   'Conjunto Calça',   'Top e legging de cintura alta com recorte lateral contrastante.', 159.90, true),
  ('conjunto-short',   'Conjunto Short',   'Top nadador e short de compressão com textura canelada.',          119.90, true),
  ('conjunto-bermuda', 'Conjunto Bermuda', 'Top e bermuda ciclista com recorte lateral em tela.',              139.90, true)
ON CONFLICT (slug) DO UPDATE
  SET nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      preco = EXCLUDED.preco,
      destaque = EXCLUDED.destaque;

-- Imagens principais (arquivos em /public/images) ------------------------
DELETE FROM produto_imagens
WHERE produto_id IN (SELECT id FROM produtos WHERE slug IN ('conjunto-calca', 'conjunto-short', 'conjunto-bermuda'));

INSERT INTO produto_imagens (produto_id, url, texto_alt, ordem)
SELECT p.id, v.url, v.alt, 0
FROM (VALUES
  ('conjunto-calca',   '/images/conjunto-calca.jpg',   'Conjunto Calça azul JLK'),
  ('conjunto-short',   '/images/conjunto-short.jpg',   'Conjunto Short azul JLK'),
  ('conjunto-bermuda', '/images/conjunto-bermuda.jpg', 'Conjunto Bermuda azul JLK')
) AS v (slug, url, alt)
JOIN produtos p ON p.slug = v.slug;

-- Variantes (cor x tamanho) e estoque -----------------------------------
INSERT INTO produto_variantes (produto_id, cor, cor_hex, tamanho, estoque)
SELECT p.id, v.cor, v.hex, v.tamanho, v.estoque
FROM (VALUES
  -- Conjunto Calça
  ('conjunto-calca', 'Azul',  '#4a7fd8', 'P', 6), ('conjunto-calca', 'Azul',  '#4a7fd8', 'M', 10),
  ('conjunto-calca', 'Azul',  '#4a7fd8', 'G', 4), ('conjunto-calca', 'Azul',  '#4a7fd8', 'GG', 2),
  ('conjunto-calca', 'Preto', '#111111', 'P', 8), ('conjunto-calca', 'Preto', '#111111', 'M', 12),
  ('conjunto-calca', 'Preto', '#111111', 'G', 7), ('conjunto-calca', 'Preto', '#111111', 'GG', 3),
  ('conjunto-calca', 'Verde', '#9db88f', 'P', 0), ('conjunto-calca', 'Verde', '#9db88f', 'M', 5),
  ('conjunto-calca', 'Verde', '#9db88f', 'G', 2), ('conjunto-calca', 'Verde', '#9db88f', 'GG', 0),
  -- Conjunto Short
  ('conjunto-short', 'Azul',  '#4a7fd8', 'P', 5), ('conjunto-short', 'Azul',  '#4a7fd8', 'M', 9),
  ('conjunto-short', 'Azul',  '#4a7fd8', 'G', 6), ('conjunto-short', 'Azul',  '#4a7fd8', 'GG', 1),
  ('conjunto-short', 'Preto', '#111111', 'P', 3), ('conjunto-short', 'Preto', '#111111', 'M', 0),
  ('conjunto-short', 'Preto', '#111111', 'G', 8), ('conjunto-short', 'Preto', '#111111', 'GG', 4),
  -- Conjunto Bermuda
  ('conjunto-bermuda', 'Azul',  '#4a7fd8', 'P', 7), ('conjunto-bermuda', 'Azul',  '#4a7fd8', 'M', 11),
  ('conjunto-bermuda', 'Azul',  '#4a7fd8', 'G', 5), ('conjunto-bermuda', 'Azul',  '#4a7fd8', 'GG', 2),
  ('conjunto-bermuda', 'Preto', '#111111', 'P', 4), ('conjunto-bermuda', 'Preto', '#111111', 'M', 6),
  ('conjunto-bermuda', 'Preto', '#111111', 'G', 0), ('conjunto-bermuda', 'Preto', '#111111', 'GG', 1),
  ('conjunto-bermuda', 'Verde', '#9db88f', 'P', 2), ('conjunto-bermuda', 'Verde', '#9db88f', 'M', 3),
  ('conjunto-bermuda', 'Verde', '#9db88f', 'G', 3), ('conjunto-bermuda', 'Verde', '#9db88f', 'GG', 0)
) AS v (slug, cor, hex, tamanho, estoque)
JOIN produtos p ON p.slug = v.slug
ON CONFLICT (produto_id, cor, tamanho) DO UPDATE
  SET cor_hex = EXCLUDED.cor_hex,
      estoque = EXCLUDED.estoque;

COMMIT;
