// Configurações da loja

// Número do WhatsApp que recebe os pedidos: código do país + DDD + número, só dígitos.
// Defina em .env.local (veja .env.example): NEXT_PUBLIC_WHATSAPP_NUMERO=5511987654321
// ⚠️ Enquanto estiver vazio, o WhatsApp abre pedindo para escolher o contato.
export const WHATSAPP_NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || '').replace(/\D/g, '')

export const NOME_LOJA = 'JLK Fitness e Casual'

// Contato e identificação da loja (Política de Privacidade e rodapé).
// Defina em .env.local / Railway: NEXT_PUBLIC_EMAIL_CONTATO e NEXT_PUBLIC_CNPJ
export const EMAIL_CONTATO = process.env.NEXT_PUBLIC_EMAIL_CONTATO || ''
export const CNPJ_LOJA = process.env.NEXT_PUBLIC_CNPJ || ''
