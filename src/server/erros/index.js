// Erros da aplicação. Cada classe já sabe o status HTTP que gera.
// Lance-os em qualquer camada; a Rota (src/server/http/Rota.js) transforma em resposta JSON:
//   { erro: "mensagem", campos?: { campo: "mensagem" }, codigo?: "..." }

export class ErroAplicacao extends Error {
  constructor(status, mensagem, { campos, codigo, cabecalhos } = {}) {
    super(mensagem)
    this.name = this.constructor.name
    this.status = status
    this.campos = campos
    this.codigo = codigo
    this.cabecalhos = cabecalhos
  }
}

// 400 — requisição mal formada (JSON inválido, campo não permitido...)
export class ErroRequisicao extends ErroAplicacao {
  constructor(mensagem = 'Requisição inválida.', extras) {
    super(400, mensagem, extras)
  }
}

// 401 — sem login, token inválido/expirado
export class ErroNaoAutenticado extends ErroAplicacao {
  constructor(mensagem, codigo) {
    super(401, mensagem, { codigo, cabecalhos: { 'WWW-Authenticate': `Bearer realm="jlk", error="${codigo}"` } })
  }
}

// 403 — logado, mas sem permissão
export class ErroPermissao extends ErroAplicacao {
  constructor(mensagem = 'Sem permissão para este recurso.', codigo = 'sem_permissao') {
    super(403, mensagem, { codigo })
  }
}

// 404
export class ErroNaoEncontrado extends ErroAplicacao {
  constructor(mensagem = 'Não encontrado.') {
    super(404, mensagem)
  }
}

// 409 — conflito (código repetido, item em uso...)
export class ErroConflito extends ErroAplicacao {
  constructor(mensagem, campos) {
    super(409, mensagem, { campos })
  }
}

// 422 — dados inválidos (mensagens por campo)
export class ErroValidacao extends ErroAplicacao {
  constructor(campos, mensagem) {
    super(422, mensagem ?? Object.values(campos ?? {})[0] ?? 'Dados inválidos.', { campos })
  }
}

// 413 / 415 / 429 — usados no envio de imagens e no login
export class ErroArquivoGrande extends ErroAplicacao {
  constructor(mensagem, campos) {
    super(413, mensagem, { campos })
  }
}

export class ErroFormato extends ErroAplicacao {
  constructor(mensagem, campos) {
    super(415, mensagem, { campos })
  }
}

export class ErroMuitasTentativas extends ErroAplicacao {
  constructor(mensagem, segundos) {
    super(429, mensagem, { cabecalhos: { 'Retry-After': String(segundos) } })
  }
}

// Lança ErroValidacao se houver erros por campo
export function validarOuFalhar(erros, mensagem) {
  if (erros && Object.keys(erros).length) throw new ErroValidacao(erros, mensagem)
}
