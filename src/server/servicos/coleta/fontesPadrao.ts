import type { TipoFonte } from '../../dominio/entidades.js'

// Fontes internas: identificam como o edital entrou (PDF enviado, link colado, cadastro à mão). Não são
// monitoradas, não aparecem em Configurações › Fontes e não podem ser pausadas nem excluídas.
// Fontes monitoradas, só as que o usuário cadastrar.
export const FONTE_UPLOAD = 'Upload manual'
export const FONTE_LINK = 'URL manual'
export const FONTE_CADASTRO = 'Cadastro manual'

export const FONTES_ENTRADA_MANUAL: { nome: string; tipo: TipoFonte }[] = [
  { nome: FONTE_UPLOAD, tipo: 'UPLOAD_MANUAL' },
  { nome: FONTE_LINK, tipo: 'URL_MANUAL' },
  // O banco só conhece dois tipos de entrada manual; o cadastro à mão usa o de link.
  { nome: FONTE_CADASTRO, tipo: 'URL_MANUAL' },
]

export const ehFonteInterna = (fonte: { tipo: TipoFonte }) => fonte.tipo === 'UPLOAD_MANUAL' || fonte.tipo === 'URL_MANUAL'
