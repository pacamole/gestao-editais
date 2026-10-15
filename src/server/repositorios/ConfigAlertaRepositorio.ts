import type { ConfigAlerta, TipoNotificacao } from '../dominio/entidades.js'
import { normalizarParametros, PARAMETROS_PADRAO, type ParametrosAlerta } from '../notificacao/parametros.js'
import { Repositorio } from './repositorio.js'

export type ConfigAlertaTipada<T extends TipoNotificacao> = Omit<ConfigAlerta, 'parametros'> & {
  parametros: ParametrosAlerta[T]
}

// Uma linha por tipo de notificação (P09).
export class ConfigAlertaRepositorio extends Repositorio<
  ConfigAlerta,
  TipoNotificacao,
  'ativo' | 'destinatarios' | 'parametros'
> {
  protected readonly tabela = 'config_alerta'
  protected readonly chave = 'tipo'
  protected readonly gerarId = false
  protected readonly colunasJson = ['destinatarios', 'parametros'] as const
  protected readonly colunasBooleanas = ['ativo'] as const
  protected readonly ordemPadrao = 'tipo'

  /** Configuração do tipo, com os parâmetros completados pelos valores padrão. */
  obter<T extends TipoNotificacao>(tipo: T): ConfigAlertaTipada<T> {
    const config = this.buscarPorId(tipo)
    const padrao = PARAMETROS_PADRAO[tipo]
    if (!config) return { tipo, ativo: true, destinatarios: [], parametros: padrao }
    return { ...config, parametros: parametrosGravados(tipo, config.parametros) }
  }
}

// Converte valores gravados como texto pela tela antiga ("15,7,2", "1").
// Se mesmo assim forem inválidos, valem os padrões: um alerta nunca quebra por configuração ruim.
function parametrosGravados<T extends TipoNotificacao>(tipo: T, gravados: Record<string, unknown>): ParametrosAlerta[T] {
  try {
    return normalizarParametros(tipo, gravados)
  } catch {
    return PARAMETROS_PADRAO[tipo]
  }
}
