import { connection } from 'next/server'
import RenderizadorLayout from '@/components/blocos/RenderizadorLayout'
import { layoutServico } from '@/server/container'

// A página inicial é montada a partir do layout publicado no construtor (Área do Vendedor)
export default async function Inicio() {
  await connection() // lê o layout a cada visita (muda quando o admin publica)
  const camadas = await layoutServico.obterPublicado()
  return <RenderizadorLayout camadas={camadas} />
}
