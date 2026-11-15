'use client'

import { useState } from 'react'

// Conteúdo padrão de confirmação de exclusão (usar dentro de <Modal>)
//   aoConfirmar: async () => ({ ok, dados }) — retorno do api()
export default function ConfirmarExclusao({ mensagem, aoConfirmar, aoConcluir, aoCancelar, rotuloBotao = 'Excluir' }) {
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  const confirmar = async () => {
    setExcluindo(true)
    setErro('')
    const { ok, dados } = await aoConfirmar()
    setExcluindo(false)
    if (ok) aoConcluir()
    else setErro(dados?.erro || 'Não foi possível excluir.')
  }

  return (
    <>
      <p className="modal__texto">{mensagem}</p>
      {erro && (
        <p className="aviso aviso--erro" role="alert" style={{ marginBottom: 12 }}>
          {erro}
        </p>
      )}
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
