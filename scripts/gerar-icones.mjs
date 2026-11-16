// Gera os ícones do site e a imagem de prévia de compartilhamento a partir da logo.
//   node scripts/gerar-icones.mjs
// Saída (convenções do Next.js em src/app/, viram <link rel="icon">, apple-touch-icon e og:image):
//   icon.png (512), apple-icon.png (180), opengraph-image.png (1200×630)
import sharp from 'sharp'

const LOGO = 'src/assets/logo-jlk.png' // branca com fundo transparente (440 px de largura — para uma prévia mais nítida, troque por uma versão maior)
const PRETO = { r: 0, g: 0, b: 0, alpha: 1 }

async function quadrado(tamanho, arquivo) {
  const logo = await sharp(LOGO).resize({ width: Math.round(tamanho * 0.74) }).toBuffer()
  await sharp({ create: { width: tamanho, height: tamanho, channels: 4, background: PRETO } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(arquivo)
}

async function previa(arquivo) {
  const [L, A] = [1200, 630]
  const logo = await sharp(LOGO).resize({ width: 440 }).toBuffer()
  const { height: altLogo } = await sharp(logo).metadata()
  const topoLogo = Math.round(A / 2 - altLogo / 2 - 40)
  const texto = Buffer.from(`<svg width="${L}" height="${A}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${L / 2 - 60}" y="${topoLogo + altLogo + 44}" width="120" height="4" fill="#fff"/>
    <text x="50%" y="${topoLogo + altLogo + 112}" text-anchor="middle" fill="#fff"
      font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="10">FITNESS E CASUAL</text>
  </svg>`)
  await sharp({ create: { width: L, height: A, channels: 4, background: PRETO } })
    .composite([
      { input: logo, top: topoLogo, left: Math.round((L - 440) / 2) },
      { input: texto, top: 0, left: 0 },
    ])
    .png()
    .toFile(arquivo)
}

await quadrado(512, 'src/app/icon.png')
await quadrado(180, 'src/app/apple-icon.png')
await previa('src/app/opengraph-image.png')
console.log('✔ ícones e prévia gerados em src/app/')
