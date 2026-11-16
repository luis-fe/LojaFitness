'use client'

import { useState } from 'react'
import { useErro } from '@/context/Erro'

// Conteúdo padrão de confirmação de exclusão (usar dentro de <Modal>)
//   aoConfirmar: async () => ({ ok, dados }) — retorno do api()
export default function ConfirmarExclusao({ mensagem, aoConfirmar, aoConcluir, aoCancelar, rotuloBotao = 'Excluir' }) {
  const { mostrarErro } = useErro()
  const [excluindo, setExcluindo] = useState(false)

  const confirmar = async () => {
    setExcluindo(true)
    const { ok, dados } = await aoConfirmar()
    setExcluindo(false)
    if (ok) aoConcluir()
    else {
      aoCancelar() // fecha a confirmação e mostra só o erro
      mostrarErro(dados?.erro || 'Não foi possível excluir.')
    }
  }

  return (
    <>
      <p className="modal__texto">{mensagem}</p>
      <div className="acoes-form">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="botao botao--perigo" onClick={confirmar} disabled={excluindo}>
          {excluindo ? 'Excluindo…' : rotuloBotao}
        </button>
      </div>
    </>
  )
}
