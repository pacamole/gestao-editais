import { gerarHashSenha } from '../auth/senha.js'
import type { TipoFonte } from '../entidades.js'
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

    // Fontes: vias manuais (P05) + portais prioritários (PR04), inativos até existir coletor.
    const fontes: [nome: string, tipo: TipoFonte, ativo: boolean][] = [
      ['Upload manual', 'UPLOAD_MANUAL', true],
      ['URL manual', 'URL_MANUAL', true],
      ['BNDES', 'SCRAPER', false],
      ['FINEP', 'SCRAPER', false],
      ['Fundação Araucária', 'SCRAPER', false],
      ['Fomento Paraná', 'SCRAPER', false],
      ['Copel', 'SCRAPER', false],
      ['Diário Oficial do PR', 'SCRAPER', false],
    ]
    for (const [nome, tipo, ativo] of fontes) fonte.inserir({ nome, tipo, ativo })

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
