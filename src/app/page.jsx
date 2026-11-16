import { connection } from 'next/server'
import RenderizadorLayout from '@/components/blocos/RenderizadorLayout'
import { layoutServico, catalogoServico } from '@/server/container'

// A página inicial é montada a partir do layout publicado no construtor (Área do Vendedor)
// e a vitrine mostra os produtos do cadastro (banco).
export default async function Inicio() {
  await connection() // lê layout e produtos a cada visita
  const [camadas, produtos] = await Promise.all([
    layoutServico.obterPublicado(),
    catalogoServico.listar().catch((erro) => {
      console.error('[catálogo]', erro.message)
      return []
    }),
  ])
  return <RenderizadorLayout camadas={camadas} produtos={produtos} />
}
