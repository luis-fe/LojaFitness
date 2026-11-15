import conjuntoCalca from '../assets/conjunto-calca.jpg'
import conjuntoShort from '../assets/conjunto-short.jpg'
import conjuntoBermuda from '../assets/conjunto-bermuda.jpg'

// ⚠️ PREÇOS, CORES E ESTOQUE ABAIXO SÃO EXEMPLOS — substitua pelos valores reais da loja.

export const TAMANHOS = ['P', 'M', 'G', 'GG']

// Abaixo desta quantidade, o estoque aparece como "Últimas unidades"
export const ESTOQUE_BAIXO = 3

export const produtos = [
  {
    slug: 'conjunto-calca',
    nome: 'Conjunto Calça',
    descricao: 'Top e legging de cintura alta com recorte lateral contrastante.',
    imagem: conjuntoCalca,
    preco: 159.9,
    cores: [
      { nome: 'Azul', hex: '#4a7fd8' },
      { nome: 'Preto', hex: '#111111' },
      { nome: 'Verde', hex: '#9db88f' },
    ],
    estoque: {
      Azul: { P: 6, M: 10, G: 4, GG: 2 },
      Preto: { P: 8, M: 12, G: 7, GG: 3 },
      Verde: { P: 0, M: 5, G: 2, GG: 0 },
    },
  },
  {
    slug: 'conjunto-short',
    nome: 'Conjunto Short',
    descricao: 'Top nadador e short de compressão com textura canelada.',
    imagem: conjuntoShort,
    preco: 119.9,
    cores: [
      { nome: 'Azul', hex: '#4a7fd8' },
      { nome: 'Preto', hex: '#111111' },
    ],
    estoque: {
      Azul: { P: 5, M: 9, G: 6, GG: 1 },
      Preto: { P: 3, M: 0, G: 8, GG: 4 },
    },
  },
  {
    slug: 'conjunto-bermuda',
    nome: 'Conjunto Bermuda',
    descricao: 'Top e bermuda ciclista com recorte lateral em tela.',
    imagem: conjuntoBermuda,
    preco: 139.9,
    cores: [
      { nome: 'Azul', hex: '#4a7fd8' },
      { nome: 'Preto', hex: '#111111' },
      { nome: 'Verde', hex: '#9db88f' },
    ],
    estoque: {
      Azul: { P: 7, M: 11, G: 5, GG: 2 },
      Preto: { P: 4, M: 6, G: 0, GG: 1 },
      Verde: { P: 2, M: 3, G: 3, GG: 0 },
    },
  },
]

export const buscarProduto = (slug) => produtos.find((p) => p.slug === slug)

export const formatarPreco = (valor) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
