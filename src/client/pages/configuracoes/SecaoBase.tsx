import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { BackupBase, ModoBase, ResultadoImportacao, ResumoBaseResposta, TabelaResumo } from '../../../shared/api'
import { base } from '../../api/base'
import { ErroApi, mensagemDeErro } from '../../api/cliente'
import { formatarBytes, formatarDataHora } from '../../util/formato'
import { CardTurso } from './base/CardTurso'

// Tabelas que resumem a base para quem usa (as demais aparecem só no detalhe da importação).
const PRINCIPAIS: { tabela: string; um: string; varios: string }[] = [
  { tabela: 'edital', um: 'edital', varios: 'editais' },
  { tabela: 'usuario', um: 'usuário', varios: 'usuários' },
  { tabela: 'criterio', um: 'critério', varios: 'critérios' },
  { tabela: 'fonte', um: 'fonte', varios: 'fontes' },
  { tabela: 'destinatario', um: 'destinatário', varios: 'destinatários' },
]

type Resultado = { origem: string; resultado: ResultadoImportacao; antes: TabelaResumo[] }

type Estado =
  | { tipo: 'ocioso' }
  | { tipo: 'trabalhando'; texto: string }
  | { tipo: 'sucesso'; dados: Resultado }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'trocou'; modo: ModoBase }

const contar = (tabelas: TabelaResumo[], nome: string) => tabelas.find((t) => t.nome === nome)?.registros ?? 0

function resumoPrincipal(tabelas: TabelaResumo[]): string {
  return PRINCIPAIS.map(({ tabela, um, varios }) => {
    const n = contar(tabelas, tabela)
    return `${n} ${n === 1 ? um : varios}`
  }).join(' · ')
}

// "antes-da-importacao-2026-10-15_011245.db" → "Antes de uma importação"
function motivoBackup(nome: string): string {
  if (nome.startsWith('antes-da-restauracao')) return 'Antes de uma restauração'
  if (nome.startsWith('antes-da-importacao')) return 'Antes de uma importação'
  return nome
}

const mensagemFalha = (e: unknown) => (e instanceof ErroApi ? e.message : mensagemDeErro(e, 'Não foi possível falar com o servidor.'))

// Compartilhamento da base entre computadores, com backups automáticos para desfazer enganos.
export function SecaoBase() {
  const [resumo, setResumo] = useState<ResumoBaseResposta | null>(null)
  const [aba, setAba] = useState<ModoBase>('LOCAL') // onde ficam os dados: aba escolhida na tela
  const [backups, setBackups] = useState<BackupBase[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [estado, setEstado] = useState<Estado>({ tipo: 'ocioso' })
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([base.resumo(), base.backups()])
      .then(([r, b]) => {
        setResumo(r)
        setAba(r.conexao.modo)
        setBackups(b.backups)
      })
      .catch((e) => setEstado({ tipo: 'erro', mensagem: mensagemFalha(e) }))
  }, [])

  function escolher(f: File | null | undefined) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.db')) {
      setEstado({ tipo: 'erro', mensagem: `"${f.name}" não é um arquivo .db exportado pelo sistema.` })
      return
    }
    setArquivo(f)
    setEstado({ tipo: 'ocioso' })
  }

  function soltar(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    escolher(e.dataTransfer.files[0])
  }

  // Importar e restaurar terminam igual: dados trocados, sessões apagadas.
  async function substituir(origem: string, confirmacao: string, acao: () => Promise<ResultadoImportacao>) {
    const atual = resumo ? `\n\nHoje há: ${resumoPrincipal(resumo.tabelas)}.` : ''
    const paraEquipe = nuvem ? '\n\nOs dados estão na nuvem: a troca vale para toda a equipe.' : ''
    if (!window.confirm(`${confirmacao}${atual}${paraEquipe}\n\nUm backup da base atual é gravado antes. Todos precisarão entrar de novo.`)) return
    const antes = resumo?.tabelas ?? []
    setEstado({ tipo: 'trabalhando', texto: 'Substituindo os dados…' })
    try {
      const resultado = await acao()
      setArquivo(null)
      setEstado({ tipo: 'sucesso', dados: { origem, resultado, antes } })
      setResumo((r) => (r ? { ...r, tabelas: resultado.tabelas } : r))
    } catch (e) {
      setEstado({ tipo: 'erro', mensagem: mensagemFalha(e) })
    }
  }

  const ocupado = estado.tipo === 'trabalhando'
  const conexao = resumo?.conexao
  const nuvem = conexao?.modo === 'NUVEM'

  // Trocar de base: a sessão atual não existe na outra base, então todos entram de novo.
  async function trocar(modo: ModoBase, acao: () => Promise<unknown>) {
    setEstado({ tipo: 'trabalhando', texto: 'Trocando de base…' })
    try {
      await acao()
      setEstado({ tipo: 'trocou', modo })
    } catch (e) {
      setEstado({ tipo: 'erro', mensagem: mensagemFalha(e) })
    }
  }

  if (estado.tipo === 'trocou') {
    return (
      <div className="pilha">
        <div className="aviso aviso--sucesso" role="status">
          <span>
            <strong>{estado.modo === 'NUVEM' ? 'Agora os dados estão na nuvem.' : 'Agora os dados estão neste computador.'}</strong>{' '}
            Entre de novo com uma conta que exista nessa base{estado.modo === 'NUVEM' ? ' (ou crie uma)' : ''}.
          </span>
        </div>
        <a className="btn btn--primario base__entrar" href="/login">
          Entrar de novo
        </a>
      </div>
    )
  }

  if (estado.tipo === 'sucesso') {
    const { origem, resultado, antes } = estado.dados
    return (
      <div className="pilha">
        <div className="aviso aviso--sucesso" role="status">
          <span>
            <strong>Dados substituídos</strong> pelos de {origem}. As sessões foram encerradas: todos precisam entrar de novo.
          </span>
        </div>
        <div className="card">
          <div className="card__cabecalho"><h2>O que mudou</h2></div>
          <div className="card__corpo card__corpo--justo">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Dados</th>
                  <th className="tabela__num">Antes</th>
                  <th className="tabela__num">Agora</th>
                </tr>
              </thead>
              <tbody>
                {PRINCIPAIS.map(({ tabela, varios }) => (
                  <tr key={tabela}>
                    <td>{varios[0].toUpperCase() + varios.slice(1)}</td>
                    <td className="tabela__num">{contar(antes, tabela)}</td>
                    <td className="tabela__num">{contar(resultado.tabelas, tabela)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card__rodape">
            <span className="discreto base__backup">Backup da base anterior: {resultado.backup}</span>
            <a className="btn btn--primario" href="/login">
              Entrar de novo
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pilha">
      {estado.tipo === 'erro' ? (
        <p className="aviso aviso--erro" role="alert">
          Nada foi alterado: {estado.mensagem}
        </p>
      ) : null}

      {conexao?.erroNuvem ? (
        <div className="aviso aviso--atencao linha linha--entre" role="alert">
          <span>
            <strong>A base na nuvem não abriu</strong> (sem internet ou token revogado). Por enquanto o sistema está usando a base
            deste computador; o que for feito agora não vai para a nuvem.
          </span>
          <button type="button" className="btn btn--sm btn--primario" disabled={ocupado} onClick={() => trocar('NUVEM', base.reconectarNuvem)}>
            Reconectar
          </button>
        </div>
      ) : null}

      <div className="campo">
        <span className="campo__rotulo" id="onde_dados">Onde ficam os dados</span>
        <div className="segmentado" role="radiogroup" aria-labelledby="onde_dados">
          {(['LOCAL', 'NUVEM'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={aba === m} onClick={() => setAba(m)}>
              {m === 'LOCAL' ? 'Neste computador' : 'Na nuvem (Turso)'}
              {conexao?.modo === m ? ' · em uso' : ''}
            </button>
          ))}
        </div>
      </div>

      {aba === 'NUVEM' && !nuvem && resumo ? (
        <CardTurso
          resumoLocal={resumoPrincipal(resumo.tabelas)}
          resumir={resumoPrincipal}
          onConectado={() => setEstado({ tipo: 'trocou', modo: 'NUVEM' })}
        />
      ) : null}

      {aba === 'NUVEM' && nuvem ? (
        <div className="card status-ia status-ia--ok">
          <div className="card__corpo linha linha--entre">
            <div className="pilha pilha--sm">
              <strong className="status-ia__titulo">Conectado à nuvem</strong>
              <span className="suave base__backup">{conexao?.url}</span>
              <span className="discreto">Todos os computadores conectados a esta base veem os mesmos dados, na hora.</span>
            </div>
            <button
              type="button"
              className="btn"
              disabled={ocupado}
              onClick={() => {
                if (window.confirm('Voltar a usar só a base deste computador? A base na nuvem continua lá, intacta.')) {
                  trocar('LOCAL', base.usarLocal)
                }
              }}
            >
              Voltar a usar só este computador
            </button>
          </div>
        </div>
      ) : null}

      {aba === 'LOCAL' && nuvem ? (
        <div className="aviso aviso--atencao linha linha--entre">
          <span>Hoje os dados estão na nuvem. A base deste computador está guardada, como estava antes de conectar.</span>
          <button
            type="button"
            className="btn btn--sm btn--primario"
            disabled={ocupado}
            onClick={() => {
              if (window.confirm('Usar a base deste computador? A base na nuvem continua lá, intacta.')) trocar('LOCAL', base.usarLocal)
            }}
          >
            Usar a base deste computador
          </button>
        </div>
      ) : null}

      <div className="card">
        <div className="card__corpo base__atual">
          <div className="pilha pilha--sm">
            <span className="campo__rotulo">Base em uso{nuvem ? ' · na nuvem' : ' · neste computador'}</span>
            <strong>{resumo ? resumoPrincipal(resumo.tabelas) : 'Carregando…'}</strong>
            {resumo ? <span className="discreto base__backup">{nuvem ? conexao?.url : resumo.arquivo}</span> : null}
          </div>
          {resumo && !nuvem ? <span className="badge">{formatarBytes(resumo.tamanhoBytes)}</span> : null}
        </div>
      </div>

      <div className="grade-2 base__acoes">
        <div className="card">
          <div className="card__cabecalho"><h2>⇩ Levar para outro computador</h2></div>
          <div className="card__corpo">
            <ol className="base__passos">
              <li>Baixe o arquivo desta base.</li>
              <li>Abra o sistema no outro computador.</li>
              <li>Lá, use <strong>Trazer de outro computador</strong> com esse arquivo.</li>
            </ol>
          </div>
          <div className="card__rodape">
            <a className="btn btn--primario" href={base.urlExportar} download>
              Baixar base{resumo ? ` (${formatarBytes(resumo.tamanhoBytes)})` : ''}
            </a>
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>⇧ Trazer de outro computador</h2></div>
          <div className="card__corpo pilha">
            <input
              ref={entrada}
              type="file"
              accept=".db"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                escolher(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {arquivo ? (
              <div className="base__arquivo">
                <span>
                  📄 <strong>{arquivo.name}</strong> <span className="discreto">· {formatarBytes(arquivo.size)}</span>
                </span>
                <button type="button" className="btn btn--sm btn--fantasma" disabled={ocupado} onClick={() => entrada.current?.click()}>
                  Trocar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`soltar-arquivo base__soltar${arrastando ? ' soltar-arquivo--ativo' : ''}`}
                onClick={() => entrada.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastando(true)
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={soltar}
              >
                <strong>Arraste o arquivo .db aqui</strong>
                <span>ou clique para escolher</span>
              </button>
            )}
            <p className="aviso aviso--atencao">
              {nuvem ? (
                <>
                  Substitui <strong>todos</strong> os dados da <strong>nuvem</strong>, para toda a equipe. Um backup é salvo antes.
                </>
              ) : (
                <>
                  Substitui <strong>todos</strong> os dados deste computador. Um backup é salvo antes.
                </>
              )}
            </p>
          </div>
          {arquivo ? (
            <div className="card__rodape">
              <button
                type="button"
                className="btn btn--perigo"
                disabled={ocupado}
                onClick={() =>
                  substituir(`"${arquivo.name}"`, `Substituir todos os dados deste computador pelos de "${arquivo.name}"?`, () =>
                    base.importar(arquivo),
                  )
                }
              >
                {ocupado ? 'Substituindo…' : nuvem ? 'Substituir os dados da nuvem' : 'Substituir os dados deste computador'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card__cabecalho"><h2>Backups automáticos</h2></div>
        <div className="card__corpo pilha pilha--sm">
          <p className="discreto">Criados antes de cada importação ou restauração. Servem para desfazer um engano.</p>
          {backups.length ? (
            <ul className="base__backups">
              {backups.map((b) => (
                <li key={b.nome}>
                  <span>
                    <strong>{formatarDataHora(b.criadoEm)}</strong>
                    <span className="discreto"> · {motivoBackup(b.nome)} · {formatarBytes(b.tamanhoBytes)}</span>
                  </span>
                  <span className="linha">
                    <a className="btn btn--sm btn--fantasma" href={base.urlBackup(b.nome)} download>
                      Baixar
                    </a>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={ocupado}
                      onClick={() =>
                        substituir(
                          `um backup de ${formatarDataHora(b.criadoEm)}`,
                          `Voltar a base para o backup de ${formatarDataHora(b.criadoEm)}?`,
                          () => base.restaurar(b.nome),
                        )
                      }
                    >
                      Restaurar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhum backup ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
