import type { PerfilEmpresa } from './entidades.js'

export const MOTIVO_PERFIL_PROVISORIO =
  'Aguardando o perfil da empresa: cadastre-o em Configurações › Perfil para os editais serem avaliados.'

/**
 * Perfil com CNPJ zerado é um resto de bases antigas (valores de exemplo). Avaliar com ele daria notas sem sentido,
 * então o processamento espera o perfil real.
 */
export function perfilProvisorio(perfil: Pick<PerfilEmpresa, 'cnpj'>): boolean {
  return perfil.cnpj.replace(/\D/g, '').replace(/0/g, '') === ''
}
