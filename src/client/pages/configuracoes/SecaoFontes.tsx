import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { FonteComExecucoes, FormatoDadosFonte, VerificacaoFonte } from '../../../shared/tipos/fontes'
import { mensagemDeErro } from '../../api/cliente'
import { configSistema } from '../../api/configSistema'
import { editais } from '../../api/editais'
import { fontes as apiFontes } from '../../api/fontes'
import { MenuAcoes, type AcaoMenu } from '../../components/MenuAcoes'
import { Modal } from '../../components/Modal'
import { formatarDataHora } from '../../util/formato'

// O usuário só diz onde olhar e quando: como ler a página e quais itens são chamadas o sistema descobre.
type FormFonte = { id: string; nome: string; url_base: string; hora: string; ativo: boolean }

const fonteInicial: FormFonte = { id: '', nome: '', url_base: '', hora: '06:00', ativo: true }

// "30 6 * * *" → "06:30"
function horaDoCron(cron: string | null): string {
  const partes = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron ?? '')
  return partes ? `${partes[2]!.padStart(2, '0')}:${partes[1]!.padStart(2, '0')}` : '06:00'
}

const SITUACAO: Record<string, { texto: string; classe: string }> = {
  SUCESSO: { texto: 'Funcionando', classe: 'sucesso' },
  PARCIAL: { texto: 'Com avisos', classe: 'atencao' },
  FALHA: { texto: 'Com erro', classe: 'perigo' },
}

const COMO_FOI_LIDA: Record<FormatoDadosFonte, string> = {
  HTML: 'lida pela página',
  FEED: 'lida pelo feed do site',
  JSON: 'lida pelos dados que o site usa',
}

// Termos que tiram da análise o edital coletado sozinho e prazo para expirar edital sem data.
function CartaoRelevancia({ semFontes }: { semFontes: boolean }) {
  const [termos, setTermos] = useState('')
  const [dias, setDias] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    configSistema
      .obter()
      .then(({ config }) => {
        setTermos(config.termos_excludentes.join('\n'))
        setDias(String(config.dias_expirar_sem_prazo))
      })
      .catch((e) => setErro(mensagemDeErro(e, 'Não foi possível carregar a configuração.')))
  }, [])

  async function salvar() {
    setMensagem('')
    setErro('')
    try {
      await configSistema.salvar({
        termos_excludentes: termos.split('\n').map((t) => t.trim()).filter(Boolean),
        dias_expirar_sem_prazo: Number(dias),
      })
      setMensagem('Filtro salvo. Vale para os próximos editais encontrados.')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar.'))
    }
  }

  return (
    <div className="card">
      <div className="card__cabecalho"><h2>Filtro de relevância</h2></div>
      <div className="card__corpo pilha">
        <p className="discreto">
          Editais encontrados nas fontes que citam um destes termos (e não trazem nada do perfil da empresa no título) ficam
          “Fora do perfil”, sem gastar a IA. Eles ficam escondidos na lista e podem ser resgatados. Upload e link colado
          nunca são filtrados.
        </p>
        {semFontes ? (
          <p className="aviso aviso--atencao">Sem fontes monitoradas ativas, este filtro não tem efeito: tudo o que você envia é analisado.</p>
        ) : null}
        <div className="campo">
          <label htmlFor="termos_excludentes">Termos excludentes (um por linha)</label>
          <textarea id="termos_excludentes" className="input" rows={6} value={termos} onChange={(e) => setTermos(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="dias_expirar">Dias para expirar edital sem prazo definido</label>
          <input id="dias_expirar" className="input" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />
        </div>
      </div>
      <div className="card__rodape linha linha--entre">
        <span />
        <button className="btn btn--primario" onClick={salvar}>Salvar filtro</button>
      </div>
      {mensagem ? <div className="card__rodape"><p className="aviso aviso--sucesso">{mensagem}</p></div> : null}
      {erro ? <div className="card__rodape"><p className="aviso aviso--erro" role="alert">{erro}</p></div> : null}
    </div>
  )
}

// Linhas da tabela de fontes (igual para integradas e adicionadas; muda só o menu de ações).
function TabelaFontes({ fontes, buscando, acoes }: { fontes: FonteComExecucoes[]; buscando: string; acoes: (f: FonteComExecucoes) => AcaoMenu[] }) {
  return (
    <div className="card__corpo--justo">
      <table className="tabela">
        <thead><tr><th>Nome</th><th>Busca diária</th><th>Última busca</th><th>Novos</th><th>Situação</th><th aria-label="Ações" /></tr></thead>
        <tbody>
          {fontes.map((fonte) => {
            const situacao = fonte.ultimo_status ? SITUACAO[fonte.ultimo_status] : undefined
            return (
              <tr key={fonte.id}>
                <td>
                  {fonte.nome}
                  {fonte.ativo ? null : <div className="discreto">pausada</div>}
                </td>
                <td>{horaDoCron(fonte.frequencia_cron)}</td>
                <td>{formatarDataHora(fonte.ultima_coleta_em)}</td>
                <td>{fonte.execucoes?.[0]?.itens_coletados ?? 0}</td>
                <td>
                  <span className={`badge badge--${situacao?.classe ?? 'fantasma'}`}>{situacao?.texto ?? 'Ainda não buscou'}</span>
                  {fonte.ultima_mensagem_erro ? (
                    <div className="discreto" style={{ fontSize: 'var(--texto-xs)', maxWidth: 360, whiteSpace: 'pre-line' }}>
                      {fonte.ultima_mensagem_erro.split(/\r?\n/).slice(0, 3).join('\n')}
                    </div>
                  ) : null}
                </td>
                <td>
                  {buscando === fonte.id ? <span className="discreto">Buscando…</span> : null}
                  <MenuAcoes rotulo={`Ações da fonte ${fonte.nome}`} acoes={acoes(fonte)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Chamadas que a verificação encontrou.
function ChamadasEncontradas({ verificacao }: { verificacao: VerificacaoFonte }) {
  if (!verificacao.encontradas.length) {
    return <p>É uma lista de editais, mas nenhuma chamada está com inscrições abertas agora. A fonte pode ser adicionada mesmo assim.</p>
  }
  return (
    <>
      <strong>{verificacao.encontradas.length} chamada(s) aberta(s) encontrada(s):</strong>
      <ul>
        {verificacao.encontradas.map((c) => (
          <li key={c.url}>{c.numero ? `[${c.numero}] ` : ''}<a href={c.url} target="_blank" rel="noreferrer">{c.titulo}</a></li>
        ))}
      </ul>
    </>
  )
}

export function SecaoFontes() {
  const navigate = useNavigate()
  const [integradas, setIntegradas] = useState<FonteComExecucoes[]>([])
  const [adicionadas, setAdicionadas] = useState<FonteComExecucoes[]>([])
  const [limite, setLimite] = useState(0)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [buscando, setBuscando] = useState('')

  // Modal de fonte adicionada pelo usuário. null = fechado; id '' = nova.
  const [form, setForm] = useState<FormFonte | null>(null)
  const [urlSalva, setUrlSalva] = useState('') // endereço atual da fonte em edição (não precisa verificar de novo)
  const [verificacao, setVerificacao] = useState<VerificacaoFonte | null>(null)
  const [sugestao, setSugestao] = useState<VerificacaoFonte | null>(null)
  const [tentativas, setTentativas] = useState<{ url: string; resultado: string }[] | null>(null)
  const [ocupado, setOcupado] = useState<'' | 'verificar' | 'procurar' | 'avulsa' | 'salvar'>('')
  const [erroModal, setErroModal] = useState('')

  // Modal de horário de fonte integrada.
  const [horario, setHorario] = useState<{ fonte: FonteComExecucoes; hora: string } | null>(null)

  async function carregar() {
    try {
      const resposta = await apiFontes.listar()
      setIntegradas(resposta.integradas)
      setAdicionadas(resposta.adicionadas)
      setLimite(resposta.limite)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível carregar as fontes.'))
    }
  }

  useEffect(() => { carregar() }, [])

  function avisar(texto: string, falha = false) {
    setMensagem(falha ? '' : texto)
    setErro(falha ? texto : '')
  }

  // ---- Modal da fonte adicionada ----

  function abrir(inicial: FormFonte) {
    avisar('')
    setErroModal('')
    setVerificacao(null)
    setSugestao(null)
    setTentativas(null)
    setUrlSalva(inicial.url_base)
    setForm(inicial)
  }

  function fechar() {
    if (!ocupado) setForm(null)
  }

  function trocarEndereco(url_base: string) {
    if (!form) return
    setForm({ ...form, url_base })
    setVerificacao(null)
    setSugestao(null)
    setTentativas(null)
  }

  // Endereço novo só entra verificado como lista; editar outra coisa numa fonte existente não exige verificar.
  const enderecoAprovado = Boolean(form && ((form.id && form.url_base === urlSalva) || verificacao?.tipo === 'LISTA'))

  async function executar(tipo: typeof ocupado, acao: () => Promise<void>, erroPadrao: string) {
    setErroModal('')
    setOcupado(tipo)
    try {
      await acao()
    } catch (e) {
      setErroModal(mensagemDeErro(e, erroPadrao))
    } finally {
      setOcupado('')
    }
  }

  function verificar() {
    if (!form) return
    setSugestao(null)
    setTentativas(null)
    return executar('verificar', async () => {
      setVerificacao((await apiFontes.verificar({ nome: form.nome, url_base: form.url_base.trim() })).verificacao)
    }, 'Não foi possível ler esse endereço.')
  }

  function procurar() {
    if (!form) return
    return executar('procurar', async () => {
      const resposta = await apiFontes.procurarListagem({ nome: form.nome, url_base: form.url_base.trim() })
      setSugestao(resposta.encontrada)
      setTentativas(resposta.encontrada ? null : resposta.tentativas)
    }, 'Não foi possível procurar a página de editais.')
  }

  function usarSugestao() {
    if (!form || !sugestao) return
    setForm({ ...form, url_base: sugestao.url })
    setVerificacao(sugestao)
    setSugestao(null)
  }

  // O endereço é de um edital: cadastra como entrada avulsa (por link) e abre o edital.
  function adicionarAvulso() {
    if (!form) return
    return executar('avulsa', async () => {
      const resposta = await editais.criarPorUrl({ url: form.url_base.trim() })
      setForm(null)
      navigate(`/editais/${resposta.id}`)
    }, 'Não foi possível adicionar o edital.')
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form || !enderecoAprovado) return
    return executar('salvar', async () => {
      await apiFontes.salvar({ ...form, id: form.id || undefined, url_base: form.url_base.trim() })
      avisar(form.id ? 'Fonte atualizada.' : 'Fonte adicionada. Ela será visitada todo dia no horário escolhido.')
      setForm(null)
      await carregar()
    }, 'Não foi possível salvar a fonte.')
  }

  // ---- Ações das linhas ----

  async function alternarAtivo(id: string) {
    try {
      await apiFontes.alternarAtivo(id)
    } catch (e) {
      avisar(mensagemDeErro(e, 'Não foi possível alterar a fonte.'), true)
    }
    carregar()
  }

  async function buscarAgora(fonte: FonteComExecucoes) {
    avisar('')
    setBuscando(fonte.id)
    try {
      await apiFontes.coletar(fonte.id)
      avisar(`${fonte.nome}: busca concluída. Os editais novos aparecem na lista e são analisados em seguida.`)
    } catch (e) {
      avisar(mensagemDeErro(e, 'A busca falhou.'), true)
    } finally {
      setBuscando('')
    }
    carregar()
  }

  async function excluir(fonte: FonteComExecucoes) {
    const ok = window.confirm(`Excluir a fonte "${fonte.nome}"? Ela deixa de ser visitada. Os editais que ela já trouxe continuam na lista.`)
    if (!ok) return
    try {
      avisar((await apiFontes.excluir(fonte.id)).mensagem)
    } catch (e) {
      avisar(mensagemDeErro(e, 'Não foi possível excluir a fonte.'), true)
    }
    carregar()
  }

  async function salvarHorario(e: FormEvent) {
    e.preventDefault()
    if (!horario) return
    try {
      await apiFontes.salvar({ id: horario.fonte.id, nome: horario.fonte.nome, url_base: horario.fonte.url_base, hora: horario.hora, ativo: horario.fonte.ativo })
      avisar(`${horario.fonte.nome}: busca diária às ${horario.hora}.`)
      setHorario(null)
      carregar()
    } catch (falha) {
      avisar(mensagemDeErro(falha, 'Não foi possível mudar o horário.'), true)
      setHorario(null)
    }
  }

  const acoesComuns = (fonte: FonteComExecucoes): AcaoMenu[] => [
    { rotulo: 'Buscar agora', aoClicar: () => buscarAgora(fonte), desabilitada: Boolean(buscando) },
  ]
  const noLimite = limite > 0 && adicionadas.length >= limite
  const ativas = [...integradas, ...adicionadas].some((f) => f.ativo)

  return (
    <section>
      <div className="pilha">
        {mensagem ? <p className="aviso aviso--sucesso" role="status">{mensagem}</p> : null}
        {erro ? <p className="aviso aviso--erro" role="alert">{erro}</p> : null}

        <div className="card">
          <div className="card__cabecalho">
            <div>
              <h2>Fontes integradas</h2>
              <p className="discreto">Dados oficiais dos órgãos, lidos direto da fonte. Não precisam de configuração.</p>
            </div>
          </div>
          <TabelaFontes
            fontes={integradas}
            buscando={buscando}
            acoes={(fonte) => [
              ...acoesComuns(fonte),
              { rotulo: 'Alterar horário', aoClicar: () => setHorario({ fonte, hora: horaDoCron(fonte.frequencia_cron) }) },
              { rotulo: fonte.ativo ? 'Pausar' : 'Retomar', aoClicar: () => alternarAtivo(fonte.id) },
            ]}
          />
        </div>

        <div className="card">
          <div className="card__cabecalho">
            <h2>Fontes adicionadas por você</h2>
            <div className="linha">
              {limite ? <span className="discreto">{adicionadas.length} de {limite}</span> : null}
              <button className="btn btn--sm btn--primario" onClick={() => abrir(fonteInicial)} disabled={noLimite} title={noLimite ? `Limite de ${limite} fontes atingido` : undefined}>
                + Adicionar fonte
              </button>
            </div>
          </div>
          {adicionadas.length === 0 ? (
            <div className="card__corpo">
              <p>Nenhuma. As fontes integradas acima já trazem os editais da FINEP e da Embrapii.</p>
              <p className="discreto">
                Para acompanhar outro órgão, use “Adicionar fonte” e informe a página onde ele lista as chamadas abertas.
              </p>
            </div>
          ) : (
            <TabelaFontes
              fontes={adicionadas}
              buscando={buscando}
              acoes={(fonte) => [
                ...acoesComuns(fonte),
                { rotulo: 'Editar', aoClicar: () => abrir({ id: fonte.id, nome: fonte.nome, url_base: fonte.url_base ?? '', hora: horaDoCron(fonte.frequencia_cron), ativo: fonte.ativo }) },
                { rotulo: fonte.ativo ? 'Pausar' : 'Retomar', aoClicar: () => alternarAtivo(fonte.id) },
                { rotulo: 'Excluir', aoClicar: () => excluir(fonte), perigo: true },
              ]}
            />
          )}
        </div>

        <CartaoRelevancia semFontes={!ativas} />
      </div>

      <Modal
        aberto={form !== null}
        titulo={form?.id ? 'Editar fonte' : 'Adicionar fonte'}
        aoFechar={fechar}
        rodape={
          <>
            <button type="button" className="btn btn--fantasma" onClick={verificar} disabled={Boolean(ocupado) || !form?.url_base.trim()}>
              {ocupado === 'verificar' ? 'Verificando…' : 'Verificar página'}
            </button>
            <div className="linha">
              <button type="button" className="btn btn--fantasma" onClick={fechar} disabled={Boolean(ocupado)}>Cancelar</button>
              <button
                type="submit"
                form="form-fonte"
                className="btn btn--primario"
                disabled={Boolean(ocupado) || !enderecoAprovado}
                title={enderecoAprovado ? undefined : 'Verifique a página antes de adicionar'}
              >
                {ocupado === 'salvar' ? 'Salvando…' : form?.id ? 'Salvar alterações' : 'Adicionar fonte'}
              </button>
            </div>
          </>
        }
      >
        {form ? (
          <form id="form-fonte" className="pilha" onSubmit={salvar}>
            <p className="discreto">
              Informe a página onde o órgão lista os editais (por exemplo, a de chamadas abertas) e clique em “Verificar página”.
              Todo dia, no horário escolhido, o sistema visita a página e identifica as chamadas com inscrições abertas.
            </p>
            <div className="campo"><label htmlFor="nome_fonte">Nome</label><input id="nome_fonte" className="input" placeholder="BNDES" autoFocus required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="url_base">Endereço da página de editais</label><input id="url_base" type="url" className="input" placeholder="https://..." required value={form.url_base} onChange={(e) => trocarEndereco(e.target.value)} /></div>
            <div className="campo"><label htmlFor="hora_fonte">Horário da busca diária</label><input id="hora_fonte" type="time" className="input" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
            <label className="checkbox"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Buscar editais nesta fonte</label>

            {ocupado === 'verificar' ? <p className="aviso">Lendo a página… em sites montados por JavaScript isso pode levar alguns segundos.</p> : null}

            {verificacao?.tipo === 'LISTA' ? (
              <div className="aviso aviso--sucesso">
                <p><strong>É uma página de editais</strong> ({COMO_FOI_LIDA[verificacao.formato]}).</p>
                <ChamadasEncontradas verificacao={verificacao} />
              </div>
            ) : null}

            {verificacao?.tipo === 'EDITAL' ? (
              <div className="aviso aviso--atencao pilha">
                <p>O link direciona para um edital, não para uma fonte. Deseja adicionar esse edital como uma entrada avulsa?</p>
                <div className="linha">
                  <button type="button" className="btn btn--sm btn--primario" onClick={adicionarAvulso} disabled={Boolean(ocupado)}>
                    {ocupado === 'avulsa' ? 'Adicionando…' : 'Adicionar de forma avulsa'}
                  </button>
                  <button type="button" className="btn btn--sm" onClick={procurar} disabled={Boolean(ocupado)}>
                    {ocupado === 'procurar' ? 'Procurando…' : 'Tentar achar a fonte dos editais neste link'}
                  </button>
                </div>
              </div>
            ) : null}

            {verificacao?.tipo === 'OUTRA' ? (
              <div className="aviso aviso--atencao pilha">
                <p>Esta página não lista editais{verificacao.motivo ? `: ${verificacao.motivo}` : '.'}</p>
                {verificacao.aviso ? <p className="discreto">{verificacao.aviso}</p> : null}
                <div className="linha">
                  <button type="button" className="btn btn--sm btn--primario" onClick={procurar} disabled={Boolean(ocupado)}>
                    {ocupado === 'procurar' ? 'Procurando…' : 'Tentar achar a fonte dos editais neste link'}
                  </button>
                </div>
              </div>
            ) : null}

            {ocupado === 'procurar' ? <p className="aviso">Procurando a página de editais no site… isso pode levar até um minuto.</p> : null}

            {sugestao ? (
              <div className="aviso aviso--sucesso pilha">
                <p><strong>Encontrei a página de editais:</strong> <a href={sugestao.url} target="_blank" rel="noreferrer">{sugestao.url}</a></p>
                <ChamadasEncontradas verificacao={sugestao} />
                <div className="linha">
                  <button type="button" className="btn btn--sm btn--primario" onClick={usarSugestao}>Usar este endereço</button>
                </div>
              </div>
            ) : null}

            {tentativas ? (
              <div className="aviso aviso--erro">
                <p>Não encontrei a página de editais deste site. Tente informar o endereço da lista de chamadas diretamente.</p>
                {tentativas.length ? (
                  <ul>
                    {tentativas.map((t) => <li key={t.url}><span className="discreto">{t.url}</span>: {t.resultado}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {erroModal ? <p className="aviso aviso--erro" role="alert">{erroModal}</p> : null}
          </form>
        ) : null}
      </Modal>

      <Modal
        aberto={horario !== null}
        titulo={`Horário da busca: ${horario?.fonte.nome ?? ''}`}
        aoFechar={() => setHorario(null)}
        rodape={
          <>
            <span />
            <div className="linha">
              <button type="button" className="btn btn--fantasma" onClick={() => setHorario(null)}>Cancelar</button>
              <button type="submit" form="form-horario" className="btn btn--primario">Salvar</button>
            </div>
          </>
        }
      >
        {horario ? (
          <form id="form-horario" onSubmit={salvarHorario}>
            <div className="campo">
              <label htmlFor="hora_integrada">Horário da busca diária</label>
              <input id="hora_integrada" type="time" className="input" autoFocus value={horario.hora} onChange={(e) => setHorario({ ...horario, hora: e.target.value })} />
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  )
}
