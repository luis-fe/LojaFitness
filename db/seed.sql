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
INSERT INTO produtos (slug, codigo, nome, descricao, preco_atual, destaque, caminho) VALUES
  ('conjunto-calca',   'CONJUNTO-CALCA',   'Conjunto Calça',   'Top e legging de cintura alta com recorte lateral contrastante.', 159.90, true, '/images/conjunto-calca.jpg'),
  ('conjunto-short',   'CONJUNTO-SHORT',   'Conjunto Short',   'Top nadador e short de compressão com textura canelada.',          119.90, true, '/images/conjunto-short.jpg'),
  ('conjunto-bermuda', 'CONJUNTO-BERMUDA', 'Conjunto Bermuda', 'Top e bermuda ciclista com recorte lateral em tela.',              139.90, true, '/images/conjunto-bermuda.jpg')
ON CONFLICT (slug) DO UPDATE
  SET codigo = EXCLUDED.codigo,
      nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      preco_atual = EXCLUDED.preco_atual,
      destaque = EXCLUDED.destaque,
      caminho = EXCLUDED.caminho;

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

-- Produtos filho: variações (cor x tamanho) e estoque -----------------------------------
INSERT INTO produtos_filho (codigo_produto, cor, tamanho, estoque)
SELECT p.codigo, v.cor, v.tamanho, v.estoque
FROM (VALUES
  -- Conjunto Calça
  ('conjunto-calca', 'AZUL', 'P', 6), ('conjunto-calca', 'AZUL', 'M', 10),
  ('conjunto-calca', 'AZUL', 'G', 4), ('conjunto-calca', 'AZUL', 'GG', 2),
  ('conjunto-calca', 'PRETO', 'P', 8), ('conjunto-calca', 'PRETO', 'M', 12),
  ('conjunto-calca', 'PRETO', 'G', 7), ('conjunto-calca', 'PRETO', 'GG', 3),
  ('conjunto-calca', 'VERDE', 'P', 0), ('conjunto-calca', 'VERDE', 'M', 5),
  ('conjunto-calca', 'VERDE', 'G', 2), ('conjunto-calca', 'VERDE', 'GG', 0),
  -- Conjunto Short
  ('conjunto-short', 'AZUL', 'P', 5), ('conjunto-short', 'AZUL', 'M', 9),
  ('conjunto-short', 'AZUL', 'G', 6), ('conjunto-short', 'AZUL', 'GG', 1),
  ('conjunto-short', 'PRETO', 'P', 3), ('conjunto-short', 'PRETO', 'M', 0),
  ('conjunto-short', 'PRETO', 'G', 8), ('conjunto-short', 'PRETO', 'GG', 4),
  -- Conjunto Bermuda
  ('conjunto-bermuda', 'AZUL', 'P', 7), ('conjunto-bermuda', 'AZUL', 'M', 11),
  ('conjunto-bermuda', 'AZUL', 'G', 5), ('conjunto-bermuda', 'AZUL', 'GG', 2),
  ('conjunto-bermuda', 'PRETO', 'P', 4), ('conjunto-bermuda', 'PRETO', 'M', 6),
  ('conjunto-bermuda', 'PRETO', 'G', 0), ('conjunto-bermuda', 'PRETO', 'GG', 1),
  ('conjunto-bermuda', 'VERDE', 'P', 2), ('conjunto-bermuda', 'VERDE', 'M', 3),
  ('conjunto-bermuda', 'VERDE', 'G', 3), ('conjunto-bermuda', 'VERDE', 'GG', 0)
) AS v (slug, cor, tamanho, estoque)
JOIN produtos p ON p.slug = v.slug
ON CONFLICT (codigo_produto, cor, tamanho) DO UPDATE
  SET estoque = EXCLUDED.estoque;

COMMIT;
