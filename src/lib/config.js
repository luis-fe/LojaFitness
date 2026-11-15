// Configurações da loja

// Número do WhatsApp que recebe os pedidos: código do país + DDD + número, só dígitos.
// Defina em .env.local (veja .env.example): NEXT_PUBLIC_WHATSAPP_NUMERO=5511987654321
// ⚠️ Enquanto estiver vazio, o WhatsApp abre pedindo para escolher o contato.
export const WHATSAPP_NUMERO = (process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || '').replace(/\D/g, '')

export const NOME_LOJA = 'JLK Fitness e Casual'
