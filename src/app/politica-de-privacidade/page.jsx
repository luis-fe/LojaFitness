import Link from 'next/link'
import './Politica.css'
import { NOME_LOJA, CNPJ_LOJA, EMAIL_CONTATO, WHATSAPP_NUMERO } from '@/lib/config'

export const metadata = {
  title: 'Política de Privacidade',
  description: `Como a ${NOME_LOJA} coleta, usa e protege seus dados pessoais, conforme a LGPD (Lei 13.709/2018).`,
}

// ⚠️ Ao mudar o que o site coleta, atualize este texto e a data abaixo.
const ATUALIZADA_EM = '16 de novembro de 2026'

function Contato() {
  const itens = []
  if (EMAIL_CONTATO)
    itens.push(
      <li key="email">
        E-mail: <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>
      </li>
    )
  if (WHATSAPP_NUMERO)
    itens.push(
      <li key="whats">
        WhatsApp:{' '}
        <a href={`https://wa.me/${WHATSAPP_NUMERO}`} target="_blank" rel="noopener noreferrer">
          fale com a loja
        </a>
      </li>
    )
  if (!itens.length) return <p>Fale com a loja pelos canais de atendimento informados no site.</p>
  return <ul>{itens}</ul>
}

export default function PoliticaPrivacidade() {
  return (
    <article className="politica">
      <header className="politica__topo">
        <h1>Política de Privacidade</h1>
        <p className="politica__data">Última atualização: {ATUALIZADA_EM}</p>
      </header>

      <p className="politica__resumo">
        <strong>Resumo:</strong> guardamos o mínimo possível. Registramos o endereço IP das visitas por
        no máximo 30 dias, só para saber quantas pessoas visitam a loja. Seu carrinho fica salvo no seu
        próprio aparelho. Os dados do pedido (nome, endereço, telefone) você envia pelo WhatsApp, e eles
        são usados só para entregar sua compra. Não usamos cookies de publicidade nem vendemos seus dados.
      </p>

      <section>
        <h2>1. Quem é responsável pelos seus dados</h2>
        <p>
          A <strong>{NOME_LOJA}</strong>
          {CNPJ_LOJA && <> (CNPJ {CNPJ_LOJA})</>} é a controladora dos dados pessoais tratados neste site,
          nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
      </section>

      <section>
        <h2>2. Quais dados coletamos</h2>
        <table className="politica__tabela">
          <thead>
            <tr>
              <th scope="col">Dado</th>
              <th scope="col">Quando</th>
              <th scope="col">Para quê</th>
              <th scope="col">Por quanto tempo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-rotulo="Dado">Endereço IP, data e hora da visita</td>
              <td data-rotulo="Quando">Ao abrir a loja (uma vez a cada 30 minutos)</td>
              <td data-rotulo="Para quê">Contar visitantes e proteger o site contra abusos</td>
              <td data-rotulo="Por quanto tempo">30 dias — depois é apagado automaticamente</td>
            </tr>
            <tr>
              <td data-rotulo="Dado">Itens do carrinho</td>
              <td data-rotulo="Quando">Ao adicionar produtos</td>
              <td data-rotulo="Para quê">Manter seu carrinho entre uma visita e outra</td>
              <td data-rotulo="Por quanto tempo">Fica só no seu navegador, até você limpar ou finalizar a compra</td>
            </tr>
            <tr>
              <td data-rotulo="Dado">Nome, telefone, endereço e itens do pedido</td>
              <td data-rotulo="Quando">Quando você envia o pedido pelo WhatsApp</td>
              <td data-rotulo="Para quê">Confirmar, cobrar e entregar a compra</td>
              <td data-rotulo="Por quanto tempo">Pelo prazo exigido pela legislação fiscal e de defesa do consumidor</td>
            </tr>
          </tbody>
        </table>
        <p>
          Não coletamos dados sensíveis (como saúde, religião ou biometria) e a loja não é direcionada a
          menores de 18 anos.
        </p>
      </section>

      <section>
        <h2>3. Bases legais (por que podemos tratar esses dados)</h2>
        <ul>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX): estatística de visitas e segurança do site,
            com o mínimo de dados e prazo curto de guarda.
          </li>
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V): dados necessários para vender e entregar o
            seu pedido.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): emissão de nota fiscal e guarda
            de registros exigidos por lei.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Cookies e armazenamento no navegador</h2>
        <p>
          Usamos apenas o armazenamento local do navegador para funções essenciais (carrinho e controle
          para não contar a mesma visita duas vezes). <strong>Não usamos</strong> cookies de publicidade,
          redes sociais ou rastreamento de terceiros. Se isso mudar, pediremos o seu consentimento antes.
        </p>
      </section>

      <section>
        <h2>5. Com quem compartilhamos</h2>
        <ul>
          <li>
            <strong>WhatsApp (Meta):</strong> quando você escolhe finalizar o pedido, a mensagem é enviada
            pelo aplicativo WhatsApp, que tem sua própria política de privacidade.
          </li>
          <li>
            <strong>Hospedagem:</strong> o site e o banco de dados ficam em provedor de nuvem com servidores
            nos Estados Unidos, que segue padrões de segurança reconhecidos internacionalmente (transferência
            internacional conforme o art. 33 da LGPD).
          </li>
          <li>
            <strong>Autoridades:</strong> somente quando houver obrigação legal ou ordem judicial.
          </li>
        </ul>
        <p>Nunca vendemos ou alugamos seus dados.</p>
      </section>

      <section>
        <h2>6. Seus direitos</h2>
        <p>Pelo art. 18 da LGPD, você pode, a qualquer momento e sem custo:</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
          <li>pedir a portabilidade dos dados a outro fornecedor;</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>revogar um consentimento, quando ele for a base do tratamento;</li>
          <li>
            reclamar à Autoridade Nacional de Proteção de Dados (ANPD) em{' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
              gov.br/anpd
            </a>
            .
          </li>
        </ul>
        <p>Respondemos aos pedidos em até 15 dias.</p>
      </section>

      <section>
        <h2>7. Como protegemos seus dados</h2>
        <p>
          Conexão criptografada (HTTPS), senhas da equipe guardadas com criptografia, acesso restrito à
          Área do Vendedor e exclusão automática dos registros de visita após 30 dias.
        </p>
      </section>

      <section>
        <h2>8. Contato</h2>
        <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade:</p>
        <Contato />
      </section>

      <section>
        <h2>9. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política quando o site mudar. A data no topo da página sempre indica a
          versão em vigor.
        </p>
      </section>

      <p className="politica__voltar">
        <Link href="/">← Voltar para a loja</Link>
      </p>
    </article>
  )
}
