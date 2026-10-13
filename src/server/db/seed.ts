import { gerarHashSenha } from '../auth/senha.js'
import { fontesIniciais } from '../coleta/fontes.js'
import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { repositorios } from '../repositorios/index.js'
import { transacao } from './index.js'
import { semearEditaisExemplo } from './seedEditais.js'

const CRITERIOS_PADRAO = [
  { nome: 'Prazo ainda aberto', tipo: 'ELIMINATORIO', campo_edital: 'prazo_inscricao', campo_perfil: null, operador: 'MAIOR_QUE', valor_referencia: 'hoje', mensagem_reprovacao: 'O prazo de inscrição já expirou.', ativo: true, ordem: 0 },
  { nome: 'Prazo suficiente para preparo', tipo: 'ELIMINATORIO', campo_edital: 'prazo_inscricao', campo_perfil: 'prazo_minimo_preparo_dias', operador: 'MAIOR_QUE', valor_referencia: null, mensagem_reprovacao: 'O edital não oferece prazo suficiente para preparar a proposta.', ativo: true, ordem: 1 },
  { nome: 'CNAE aceito', tipo: 'ELIMINATORIO', campo_edital: 'cnaes_aceitos', campo_perfil: 'cnae_principal', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O CNAE principal da empresa não está habilitado pelo edital.', ativo: true, ordem: 2 },
  { nome: 'Porte aceito', tipo: 'ELIMINATORIO', campo_edital: 'portes_aceitos', campo_perfil: 'porte', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O porte da empresa não atende à regra do edital.', ativo: true, ordem: 3 },
  { nome: 'Natureza jurídica aceita', tipo: 'ELIMINATORIO', campo_edital: 'natureza_juridica_aceita', campo_perfil: 'natureza_juridica', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'A natureza jurídica da empresa não é aceita no edital.', ativo: true, ordem: 4 },
  { nome: 'Região elegível', tipo: 'ELIMINATORIO', campo_edital: 'abrangencia_geografica', campo_perfil: 'uf', operador: 'LISTA_VAZIA_OU_CONTEM', valor_referencia: null, mensagem_reprovacao: 'O estado da empresa não está coberto pela abrangência do edital.', ativo: true, ordem: 5 },
  { nome: 'Tempo de fundação', tipo: 'ELIMINATORIO', campo_edital: 'tempo_minimo_fundacao_meses', campo_perfil: 'data_fundacao', operador: 'MENOR_QUE', valor_referencia: null, mensagem_reprovacao: 'A empresa não atende ao tempo mínimo de fundação.', ativo: true, ordem: 6 },
  { nome: 'Faturamento dentro da faixa', tipo: 'ELIMINATORIO', campo_edital: 'faturamento_minimo', campo_perfil: 'faturamento_anual', operador: 'ENTRE', valor_referencia: 'faturamento_maximo', mensagem_reprovacao: 'O faturamento anual da empresa está fora da faixa aceitável pelo edital.', ativo: true, ordem: 7 },
  { nome: 'Parceria com ICT', tipo: 'ELIMINATORIO', campo_edital: 'exige_ict_parceira', campo_perfil: 'possui_ict_parceira', operador: 'FALSO', valor_referencia: null, mensagem_reprovacao: 'O edital exige parceria com ICT e a empresa não atende a essa condição.', ativo: true, ordem: 8 },
  { nome: 'Certidões disponíveis', tipo: 'ELIMINATORIO', campo_edital: 'certidoes_exigidas', campo_perfil: 'certidoes_disponiveis', operador: 'CONTIDO_EM', valor_referencia: null, mensagem_reprovacao: 'A empresa não possui as certidões exigidas pelo edital.', ativo: true, ordem: 9 },
  { nome: 'Contrapartida suportável', tipo: 'ELIMINATORIO', campo_edital: 'percentual_contrapartida', campo_perfil: 'capacidade_contrapartida_percentual', operador: 'MENOR_QUE', valor_referencia: null, mensagem_reprovacao: 'A empresa não suporta o percentual mínimo de contrapartida exigido.', ativo: true, ordem: 10 },
  { nome: 'Aderência temática', tipo: 'PONTUAVEL', campo_edital: 'areas_tematicas', campo_perfil: 'areas_atuacao', operador: 'INTERSECCAO', valor_referencia: null, peso: 10, mensagem_reprovacao: null, ativo: true, ordem: 0 },
  { nome: 'Valor da oportunidade', tipo: 'PONTUAVEL', campo_edital: 'valor_maximo_por_projeto', campo_perfil: 'valor_minimo_interesse', operador: 'MAIOR_QUE', valor_referencia: null, peso: 8, mensagem_reprovacao: null, ativo: true, ordem: 1 },
  { nome: 'Folga de prazo', tipo: 'PONTUAVEL', campo_edital: 'prazo_inscricao', campo_perfil: 'prazo_minimo_preparo_dias', operador: 'MAIOR_QUE', valor_referencia: null, peso: 6, mensagem_reprovacao: null, ativo: true, ordem: 2 },
  { nome: 'Modalidade preferida', tipo: 'PONTUAVEL', campo_edital: 'modalidade', campo_perfil: null, operador: 'IGUAL', valor_referencia: 'SUBVENCAO', peso: 5, mensagem_reprovacao: null, ativo: true, ordem: 3 },
  { nome: 'Ausência de contrapartida', tipo: 'PONTUAVEL', campo_edital: 'exige_contrapartida', campo_perfil: null, operador: 'FALSO', valor_referencia: null, peso: 4, mensagem_reprovacao: null, ativo: true, ordem: 4 },
  { nome: 'Densidade de palavras-chave', tipo: 'PONTUAVEL', campo_edital: 'texto_extraido', campo_perfil: 'palavras_chave', operador: 'CONTEM', valor_referencia: null, peso: 3, mensagem_reprovacao: null, ativo: true, ordem: 5 },
] as const

// Dados iniciais. Roda sobre um banco recém-criado (ver reset.ts).
export async function semear() {
  const email = process.env.GESTOR_EMAIL
  const senha = process.env.GESTOR_SENHA
  if (!email || !senha) throw new Error('Defina GESTOR_EMAIL e GESTOR_SENHA no .env (veja .env.example).')
  const senhaHash = await gerarHashSenha(senha)

  const { usuario, fonte, perfilEmpresa, configAlerta, config } = repositorios

  transacao(() => {
    // Usuário Gestor inicial
    usuario.inserir({ nome: process.env.GESTOR_NOME ?? 'Gestor', email, senha_hash: senhaHash, papel: 'GESTOR' })

    for (const dados of fontesIniciais) fonte.inserir(dados)

    // Perfil da empresa: valores provisórios até o parceiro responder (§14, perguntas 1 e 8-10).
    perfilEmpresa.inserir({
      id: 1,
      razao_social: 'I9+ Consultoria e Inovação',
      nome_fantasia: 'I9+',
      cnpj: '00.000.000/0000-00',
      cnae_principal: '5821-1/00',
      cnaes_secundarios: ['6201-5/00', '7210-0/00'],
      porte: 'ME',
      natureza_juridica: 'Sociedade Empresária Limitada',
      data_fundacao: '2020-01-01',
      faturamento_anual: 4200000,
      uf: 'PR',
      municipio: 'Curitiba',
      areas_atuacao: ['ESG', 'Sustentabilidade', 'Inovação', 'Energia', 'Descarbonização'],
      palavras_chave: ['ESG', 'sustentabilidade', 'inovação', 'energia', 'descarbonização', 'clima'],
      possui_ict_parceira: false,
      certidoes_disponiveis: ['CND', 'FGTS', 'CRLV'],
      capacidade_contrapartida_percentual: 30,
      valor_minimo_interesse: 500000,
      prazo_minimo_preparo_dias: 30,
    })

    // Configurações de alerta (P09) com os defaults da especificação.
    for (const tipo of TIPOS_NOTIFICACAO) configAlerta.inserir({ tipo, parametros: PARAMETROS_PADRAO[tipo] })

    if (repositorios.criterio.contar() === 0) {
      for (const criterios of CRITERIOS_PADRAO) {
        repositorios.criterio.inserir({
          ...criterios,
          campo_perfil: criterios.campo_perfil ?? null,
          valor_referencia: criterios.valor_referencia ?? null,
          mensagem_reprovacao: criterios.mensagem_reprovacao ?? null,
          peso: 'peso' in criterios ? criterios.peso ?? null : null,
        })
      }
    }

    // Limite diário de perguntas no chat por usuário (CH07).
    config.definir('chat_limite_diario', '20')

    // Editais e execuções de exemplo para validação e testes
    semearEditaisExemplo()
  })
}
