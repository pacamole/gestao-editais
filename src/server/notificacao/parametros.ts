import type { TipoNotificacao } from '../entidades.js'

// Parâmetros configuráveis de cada notificação (P09), guardados em config_alerta.parametros.
export type ParametrosAlerta = {
  E01: { nota_minima: number }
  E02: { dias_antecedencia: number[] }
  E03: Record<string, never>
  E04: { dia_semana: number; hora: string } // dia_semana: 0 = domingo … 6 = sábado
  E05: { variacao_minima_nota: number }
  E06: { falhas_consecutivas: number }
}

export const PARAMETROS_PADRAO: ParametrosAlerta = {
  E01: { nota_minima: 70 },
  E02: { dias_antecedencia: [15, 7, 2] },
  E03: {},
  E04: { dia_semana: 1, hora: '08:00' },
  E05: { variacao_minima_nota: 10 },
  E06: { falhas_consecutivas: 2 },
}

export const TIPOS_NOTIFICACAO = Object.keys(PARAMETROS_PADRAO) as TipoNotificacao[]
