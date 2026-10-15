import { useState, type FormEvent } from 'react'
import type { ResultadoImportacao } from '../../../shared/api'
import { base } from '../../api/base'
import { ErroApi } from '../../api/cliente'

type Estado =
  | { tipo: 'ocioso' }
  | { tipo: 'importando' }
  | { tipo: 'sucesso'; resultado: ResultadoImportacao }
  | { tipo: 'erro'; mensagem: string }

// Compartilhamento da base entre integrantes da equipe.
export function SecaoBase() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>({ tipo: 'ocioso' })

  async function importar(evento: FormEvent) {
    evento.preventDefault()
    if (!arquivo) return
    const confirmou = window.confirm(
      `Importar "${arquivo.name}"?\n\nTodos os dados atuais serão substituídos pelos do arquivo. ` +
        'Um backup da base atual é gravado antes, na pasta backups ao lado do banco.',
    )
    if (!confirmou) return

    setEstado({ tipo: 'importando' })
    try {
      setEstado({ tipo: 'sucesso', resultado: await base.importar(arquivo) })
    } catch (erro) {
      // Erro do servidor traz o motivo; qualquer outro é falha de comunicação.
      const mensagem = erro instanceof ErroApi ? erro.message : 'Não foi possível falar com o servidor.'
      setEstado({ tipo: 'erro', mensagem })
    }
  }

  return (
    <div className="pilha">
      <div className="card">
        <div className="card__cabecalho"><h2>Exportar</h2></div>
        <div className="card__corpo">
          <p className="discreto">Baixa um arquivo .db com todos os dados (editais, avaliações, perfil, critérios, usuários…).</p>
        </div>
        <div className="card__rodape">
          <a className="btn btn--primario" href={base.urlExportar} download>
            Baixar base
          </a>
        </div>
      </div>

      <form className="card" onSubmit={importar}>
        <div className="card__cabecalho"><h2>Importar</h2></div>
        <div className="card__corpo pilha">
          <p className="discreto">Substitui todos os dados atuais pelos do arquivo. Um backup da base atual é gravado antes.</p>
          <input
            type="file"
            accept=".db"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null)
              setEstado({ tipo: 'ocioso' })
            }}
          />
        </div>
        <div className="card__rodape">
          <button className="btn btn--perigo" type="submit" disabled={!arquivo || estado.tipo === 'importando'}>
            {estado.tipo === 'importando' ? 'Importando…' : 'Importar base'}
          </button>
        </div>
      </form>

      {estado.tipo === 'erro' && (
        <p className="aviso aviso--erro" role="alert">Importação cancelada, nada foi alterado: {estado.mensagem}</p>
      )}

      {estado.tipo === 'sucesso' && (
        <div className="card" role="status">
          <div className="card__corpo pilha">
            <p className="aviso aviso--sucesso">
              Base importada. Todos precisarão entrar de novo no sistema. Backup da base anterior: {estado.resultado.backup}
            </p>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Tabela</th>
                  <th className="tabela__num">Registros</th>
                </tr>
              </thead>
              <tbody>
                {estado.resultado.tabelas.map((t) => (
                  <tr key={t.nome}>
                    <td>{t.nome}</td>
                    <td className="tabela__num">{t.registros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
