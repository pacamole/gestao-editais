import type { PerfilEmpresa } from './entidades.js'

export const MOTIVO_PERFIL_PROVISORIO =
  'Aguardando o perfil real da empresa: informe o CNPJ em Configurações › Perfil para os editais serem avaliados.'

/**
 * O perfil criado automaticamente numa base nova traz valores provisórios (CNPJ zerado).
 * Avaliar editais com ele produziria notas sem sentido, então o processamento espera o perfil real.
 */
export function perfilProvisorio(perfil: Pick<PerfilEmpresa, 'cnpj'>): boolean {
  return perfil.cnpj.replace(/\D/g, '').replace(/0/g, '') === ''
}
