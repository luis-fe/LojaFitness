'use client'

import PaginaVendedor from '@/components/PaginaVendedor'
import { IconeVendas } from '@/components/Icones'
import './RegistroVendas.css'

// Registro de Vendas — tela criada no menu; o cadastro das vendas será construído aqui.
export default function RegistroVendas() {
  return (
    <PaginaVendedor titulo="Registro de Vendas" largura={960}>
      <div className="vendas-vazio">
        <span className="vendas-vazio__icone" aria-hidden="true">
          <IconeVendas />
        </span>
        <h2>Nenhuma venda registrada ainda</h2>
        <p>Esta tela está em construção. Em breve você poderá registrar e consultar as vendas da loja por aqui.</p>
      </div>
    </PaginaVendedor>
  )
}
