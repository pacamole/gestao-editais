import { useEffect, useState } from 'react'
import type { PerfilEmpresa, Porte } from '../../shared/tipos/perfil'
import { mensagemDeErro } from '../api/cliente'
import { perfil as apiPerfil } from '../api/perfil'

// Estado do formulário: listas e números como texto editável.
type FormPerfil = {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  cnae_principal: string
  cnaes_secundarios: string
  porte: Porte
  natureza_juridica: string
  data_fundacao: string
  faturamento_anual: string
  uf: string
  municipio: string
  areas_atuacao: string
  palavras_chave: string
  possui_ict_parceira: boolean
  certidoes_disponiveis: string
  capacidade_contrapartida_percentual: string
  valor_minimo_interesse: string
  prazo_minimo_preparo_dias: string
}

const perfilInicial: FormPerfil = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  cnae_principal: '',
  cnaes_secundarios: '',
  porte: 'ME',
  natureza_juridica: '',
  data_fundacao: '',
  faturamento_anual: '',
  uf: 'PR',
  municipio: '',
  areas_atuacao: '',
  palavras_chave: '',
  possui_ict_parceira: false,
  certidoes_disponiveis: '',
  capacidade_contrapartida_percentual: '',
  valor_minimo_interesse: '',
  prazo_minimo_preparo_dias: '',
}

const listaParaTexto = (lista: string[] | null) => (Array.isArray(lista) ? lista.join(', ') : '')
const textoParaLista = (texto: string) => texto.split(',').map((item) => item.trim()).filter(Boolean)
const numeroParaTexto = (valor: number | null) => (valor == null ? '' : String(valor))

function paraFormulario(p: PerfilEmpresa): FormPerfil {
  return {
    razao_social: p.razao_social ?? '',
    nome_fantasia: p.nome_fantasia ?? '',
    cnpj: p.cnpj ?? '',
    cnae_principal: p.cnae_principal ?? '',
    cnaes_secundarios: listaParaTexto(p.cnaes_secundarios),
    porte: p.porte ?? 'ME',
    natureza_juridica: p.natureza_juridica ?? '',
    data_fundacao: p.data_fundacao ?? '',
    faturamento_anual: numeroParaTexto(p.faturamento_anual),
    uf: p.uf ?? 'PR',
    municipio: p.municipio ?? '',
    areas_atuacao: listaParaTexto(p.areas_atuacao),
    palavras_chave: listaParaTexto(p.palavras_chave),
    possui_ict_parceira: Boolean(p.possui_ict_parceira),
    certidoes_disponiveis: listaParaTexto(p.certidoes_disponiveis),
    capacidade_contrapartida_percentual: numeroParaTexto(p.capacidade_contrapartida_percentual),
    valor_minimo_interesse: numeroParaTexto(p.valor_minimo_interesse),
    prazo_minimo_preparo_dias: numeroParaTexto(p.prazo_minimo_preparo_dias),
  }
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState(perfilInicial)
  const [reavaliar, setReavaliar] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await apiPerfil.obter()
        if (resposta.perfil) setPerfil(paraFormulario(resposta.perfil))
      } catch (erro) {
        setMensagem(mensagemDeErro(erro, 'Não foi possível carregar o perfil.'))
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const atualizar = <K extends keyof FormPerfil>(campo: K, valor: FormPerfil[K]) => {
    setPerfil((atual) => ({ ...atual, [campo]: valor }))
  }

  async function salvar() {
    setSalvando(true)
    setMensagem('')
    try {
      const resposta = await apiPerfil.salvar({
        ...perfil,
        cnaes_secundarios: textoParaLista(perfil.cnaes_secundarios),
        areas_atuacao: textoParaLista(perfil.areas_atuacao),
        palavras_chave: textoParaLista(perfil.palavras_chave),
        certidoes_disponiveis: textoParaLista(perfil.certidoes_disponiveis),
        reavaliar,
      })
      const chats = resposta.chatsLimpos ? ' O histórico dos chats foi limpo para usar o perfil atualizado.' : ''
      const reavaliacao = resposta.reavaliacaoSolicitada
        ? ` ${resposta.editaisReavaliados ?? 0} edital(is) ativo(s) reavaliado(s).`
        : ''
      setMensagem(`Perfil salvo com sucesso.${reavaliacao}${chats}`)
    } catch (erro) {
      setMensagem(mensagemDeErro(erro, 'Erro ao salvar o perfil.'))
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <section><header className="pagina-cabecalho"><h1>Perfil da empresa</h1></header><p>Carregando dados do perfil…</p></section>
  }

  return (
    <section>
      <header className="pagina-cabecalho">
        <div>
          <h1>Perfil da empresa</h1>
          <p>Dados estratégicos usados para comparação com os editais ativos.</p>
        </div>
      </header>

      <div className="pilha">
        <div className="card">
          <div className="card__cabecalho"><h2>Dados cadastrais</h2></div>
          <div className="card__corpo grade-3">
            <div className="campo"><label htmlFor="razao_social">Razão social</label><input id="razao_social" className="input" value={perfil.razao_social} onChange={(e) => atualizar('razao_social', e.target.value)} /></div>
            <div className="campo"><label htmlFor="nome_fantasia">Nome fantasia</label><input id="nome_fantasia" className="input" value={perfil.nome_fantasia} onChange={(e) => atualizar('nome_fantasia', e.target.value)} /></div>
            <div className="campo"><label htmlFor="cnpj">CNPJ</label><input id="cnpj" className="input" value={perfil.cnpj} onChange={(e) => atualizar('cnpj', e.target.value)} /></div>
            <div className="campo"><label htmlFor="cnae_principal">CNAE principal</label><input id="cnae_principal" className="input" value={perfil.cnae_principal} onChange={(e) => atualizar('cnae_principal', e.target.value)} /></div>
            <div className="campo"><label htmlFor="cnaes_secundarios">CNAEs secundários</label><input id="cnaes_secundarios" className="input" value={perfil.cnaes_secundarios} onChange={(e) => atualizar('cnaes_secundarios', e.target.value)} /></div>
            <div className="campo"><label htmlFor="porte">Porte</label><select id="porte" className="select" value={perfil.porte} onChange={(e) => atualizar('porte', e.target.value as Porte)}><option value="MEI">MEI</option><option value="ME">ME</option><option value="EPP">EPP</option><option value="MEDIA">Média</option><option value="GRANDE">Grande</option></select></div>
            <div className="campo"><label htmlFor="natureza_juridica">Natureza jurídica</label><input id="natureza_juridica" className="input" value={perfil.natureza_juridica} onChange={(e) => atualizar('natureza_juridica', e.target.value)} /></div>
            <div className="campo"><label htmlFor="data_fundacao">Data de fundação</label><input id="data_fundacao" type="date" className="input" value={perfil.data_fundacao} onChange={(e) => atualizar('data_fundacao', e.target.value)} /></div>
            <div className="campo"><label htmlFor="faturamento_anual">Faturamento anual</label><input id="faturamento_anual" type="number" className="input" value={perfil.faturamento_anual} onChange={(e) => atualizar('faturamento_anual', e.target.value)} /></div>
            <div className="campo"><label htmlFor="uf">Estado</label><input id="uf" className="input" maxLength={2} value={perfil.uf} onChange={(e) => atualizar('uf', e.target.value.toUpperCase())} /></div>
            <div className="campo"><label htmlFor="municipio">Município</label><input id="municipio" className="input" value={perfil.municipio} onChange={(e) => atualizar('municipio', e.target.value)} /></div>
            <div className="campo"><label htmlFor="areas_atuacao">Áreas de atuação</label><input id="areas_atuacao" className="input" value={perfil.areas_atuacao} onChange={(e) => atualizar('areas_atuacao', e.target.value)} /></div>
            <div className="campo"><label htmlFor="palavras_chave">Palavras-chave</label><input id="palavras_chave" className="input" value={perfil.palavras_chave} onChange={(e) => atualizar('palavras_chave', e.target.value)} /></div>
            <div className="campo"><label htmlFor="certidoes_disponiveis">Certidões disponíveis</label><input id="certidoes_disponiveis" className="input" value={perfil.certidoes_disponiveis} onChange={(e) => atualizar('certidoes_disponiveis', e.target.value)} /></div>
            <div className="campo"><label htmlFor="capacidade_contrapartida_percentual">Capacidade de contrapartida (%)</label><input id="capacidade_contrapartida_percentual" type="number" step="0.01" className="input" value={perfil.capacidade_contrapartida_percentual} onChange={(e) => atualizar('capacidade_contrapartida_percentual', e.target.value)} /></div>
            <div className="campo"><label htmlFor="valor_minimo_interesse">Valor mínimo de interesse</label><input id="valor_minimo_interesse" type="number" step="0.01" className="input" value={perfil.valor_minimo_interesse} onChange={(e) => atualizar('valor_minimo_interesse', e.target.value)} /></div>
            <div className="campo"><label htmlFor="prazo_minimo_preparo_dias">Prazo mínimo de preparo (dias)</label><input id="prazo_minimo_preparo_dias" type="number" className="input" value={perfil.prazo_minimo_preparo_dias} onChange={(e) => atualizar('prazo_minimo_preparo_dias', e.target.value)} /></div>
            <label className="checkbox"><input type="checkbox" checked={perfil.possui_ict_parceira} onChange={(e) => atualizar('possui_ict_parceira', e.target.checked)} /> Possui parceria com instituição de pesquisa</label>
          </div>
        </div>

        <div className="card">
          <div className="card__cabecalho"><h2>Reavaliação</h2></div>
          <div className="card__corpo">
            <label className="checkbox"><input type="checkbox" checked={reavaliar} onChange={(e) => setReavaliar(e.target.checked)} /> Reavaliar todos os editais ativos com o novo perfil</label>
            {mensagem ? <p className="aviso aviso--sucesso" role="status">{mensagem}</p> : null}
          </div>
          <div className="card__rodape">
            <button className="btn btn--primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar perfil'}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
