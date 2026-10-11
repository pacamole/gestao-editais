import { gerarHashSenha } from '../auth/senha.js'
import { fontesIniciais } from '../coleta/fontes.js'
import { PARAMETROS_PADRAO, TIPOS_NOTIFICACAO } from '../notificacao/parametros.js'
import { repositorios } from '../repositorios/index.js'
import { transacao } from './index.js'

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
      razao_social: 'I9+ (A DEFINIR)',
      cnpj: '00.000.000/0000-00',
      cnae_principal: '0000-0/00',
      porte: 'ME',
      natureza_juridica: 'Sociedade Empresária Limitada',
      data_fundacao: '2020-01-01',
      uf: 'PR',
      municipio: 'Curitiba',
      areas_atuacao: ['ESG', 'Sustentabilidade', 'Inovação'],
      palavras_chave: ['ESG', 'sustentabilidade', 'inovação', 'energia', 'descarbonização'],
      possui_ict_parceira: false,
    })

    // Configurações de alerta (P09) com os defaults da especificação.
    for (const tipo of TIPOS_NOTIFICACAO) configAlerta.inserir({ tipo, parametros: PARAMETROS_PADRAO[tipo] })

    // Limite diário de perguntas no chat por usuário (CH07).
    config.definir('chat_limite_diario', '20')
  })
}
