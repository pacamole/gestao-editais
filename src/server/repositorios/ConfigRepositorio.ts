import type { Config } from '../entidades.js'
import { Repositorio } from './repositorio.js'

// Configurações gerais chave/valor.
export class ConfigRepositorio extends Repositorio<Config, string> {
  protected readonly tabela = 'config'
  protected readonly chave = 'chave'
  protected readonly gerarId = false
  protected readonly ordemPadrao = 'chave'

  obter(chave: string): string | undefined {
    return this.buscarPorId(chave)?.valor
  }

  obterNumero(chave: string, padrao: number): number {
    const valor = Number(this.obter(chave))
    return Number.isFinite(valor) ? valor : padrao
  }

  definir(chave: string, valor: string): void {
    this.executar(
      'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor',
      chave,
      valor,
    )
  }
}
