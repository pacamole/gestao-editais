// Erros de negócio lançados pelos services. O tratador de erros do Express traduz cada classe
// no status HTTP correspondente; os controllers não precisam capturá-los.
export abstract class ErroNegocio extends Error {
  abstract readonly status: number
  constructor(
    mensagem: string,
    readonly dados?: Record<string, unknown>,
  ) {
    super(mensagem)
    this.name = this.constructor.name
  }
}

export class ErroValidacao extends ErroNegocio {
  readonly status = 400
}

export class ErroNaoEncontrado extends ErroNegocio {
  readonly status = 404
}

export class ErroConflito extends ErroNegocio {
  readonly status = 409
}

export class ErroRegraNegocio extends ErroNegocio {
  readonly status = 422
}

export class ErroLimiteExcedido extends ErroNegocio {
  readonly status = 429
}

// Falha de um sistema externo (portal, IA, e-mail).
export class ErroServicoExterno extends ErroNegocio {
  readonly status = 502
}

export class ErroNaoAutenticado extends ErroNegocio {
  readonly status = 401
}
