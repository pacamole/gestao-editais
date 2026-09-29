import { useState, type FormEvent } from 'react'
import type { ErroApi, ResultadoImportacao } from '../../shared/api'

type Estado =
  | { tipo: 'ocioso' }
  | { tipo: 'importando' }
  | { tipo: 'sucesso'; resultado: ResultadoImportacao }
  | { tipo: 'erro'; mensagem: string }

// Compartilhamento da base entre integrantes da equipe.
export function BasePage() {
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
      const resposta = await fetch('/api/base/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arquivo,
      })
      const corpo = (await resposta.json()) as ResultadoImportacao | ErroApi
      if ('erro' in corpo) setEstado({ tipo: 'erro', mensagem: corpo.erro })
      else setEstado({ tipo: 'sucesso', resultado: corpo })
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Não foi possível falar com o servidor.' })
    }
  }

  return (
    <section>
      <h1>Base de dados</h1>
      <p>Leve a base inteira de um computador para outro: exporte aqui e importe lá.</p>

      <h2>Exportar</h2>
      <p>Baixa um arquivo .db com todos os dados (editais, avaliações, perfil, critérios, usuários…).</p>
      <a href="/api/base/exportar" download>
        Baixar base
      </a>

      <h2>Importar</h2>
      <form onSubmit={importar}>
        <input
          type="file"
          accept=".db"
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null)
            setEstado({ tipo: 'ocioso' })
          }}
        />
        <button type="submit" disabled={!arquivo || estado.tipo === 'importando'}>
          {estado.tipo === 'importando' ? 'Importando…' : 'Importar base'}
        </button>
      </form>

      {estado.tipo === 'erro' && <p role="alert">Importação cancelada, nada foi alterado: {estado.mensagem}</p>}

      {estado.tipo === 'sucesso' && (
        <div role="status">
          <p>Base importada. Backup da base anterior: {estado.resultado.backup}</p>
          <p>Todos precisarão entrar de novo no sistema.</p>
          <table>
            <thead>
              <tr>
                <th>Tabela</th>
                <th>Registros</th>
              </tr>
            </thead>
            <tbody>
              {estado.resultado.tabelas.map((t) => (
                <tr key={t.nome}>
                  <td>{t.nome}</td>
                  <td>{t.registros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
