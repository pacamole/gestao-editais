// Raiz de composição: o único lugar que escolhe as implementações e liga uma camada à outra.
// Controllers recebem os services daqui; services recebem repositórios e portas pelo construtor.
import fs from 'node:fs'
import path from 'node:path'
import { EmailConfiguravel } from './adaptadores/email/EmailConfiguravel.js'
import { SmtpAdaptador } from './adaptadores/email/SmtpAdaptador.js'
import { OllamaAdaptador } from './adaptadores/ollama/OllamaAdaptador.js'
import { GatilhosNotificacaoServico } from './servicos/GatilhosNotificacaoServico.js'
import { NotificacaoServico } from './servicos/NotificacaoServico.js'
import { arquivoBanco, arquivoSchema, root } from './config/paths.js'
import { db, transacao } from './db/index.js'
import { BaseRepositorio } from './repositorios/BaseRepositorio.js'
import { DashboardRepositorio } from './repositorios/DashboardRepositorio.js'
import { DocumentoRepositorio } from './repositorios/DocumentoRepositorio.js'
import { repositorios } from './repositorios/index.js'
import { AlertaServico } from './servicos/AlertaServico.js'
import { AuthServico } from './servicos/AuthServico.js'
import { AvaliacaoServico } from './servicos/AvaliacaoServico.js'
import { BaseServico } from './servicos/BaseServico.js'
import { BootstrapServico } from './servicos/BootstrapServico.js'
import { ChatServico } from './servicos/ChatServico.js'
import { ColetaServico } from './servicos/ColetaServico.js'
import { criarIntegracoes } from './servicos/coleta/integracoes/index.js'
import { DescobertaFonteServico } from './servicos/DescobertaFonteServico.js'
import { ConfigSistemaServico } from './servicos/ConfigSistemaServico.js'
import { CriterioServico } from './servicos/CriterioServico.js'
import { DashboardServico } from './servicos/DashboardServico.js'
import { DestinatarioServico } from './servicos/DestinatarioServico.js'
import { EditalServico } from './servicos/EditalServico.js'
import { EntradaServico } from './servicos/EntradaServico.js'
import { ExtracaoServico } from './servicos/ExtracaoServico.js'
import { TriagemElegibilidadeServico } from './servicos/TriagemElegibilidadeServico.js'
import { FonteServico } from './servicos/FonteServico.js'
import { PendenciaServico } from './servicos/PendenciaServico.js'
import { PerfilServico } from './servicos/PerfilServico.js'
import { ProcessamentoEditalServico } from './servicos/ProcessamentoEditalServico.js'
import { RegistroDocumentoServico } from './servicos/RegistroDocumentoServico.js'
import { RevisaoServico } from './servicos/RevisaoServico.js'

// ---- Configuração (lida do banco a cada uso) ----
export const configSistemaServico = new ConfigSistemaServico(repositorios, (config) => new SmtpAdaptador(config))

// ---- Portas (adaptadores escolhidos) ----
export const email = new EmailConfiguravel(() => configSistemaServico.configSmtp())
export const modeloLinguagem = new OllamaAdaptador(() => configSistemaServico.conexaoOllama())

// ---- Notificações ----
export const notificacaoServico = new NotificacaoServico(email, repositorios)
export const gatilhosNotificacao = new GatilhosNotificacaoServico(notificacaoServico, repositorios)

// ---- Services ----
export const avaliacaoServico = new AvaliacaoServico(repositorios)
export const revisaoServico = new RevisaoServico(repositorios)
export const extracaoServico = new ExtracaoServico(repositorios, modeloLinguagem)
export const triagemElegibilidadeServico = new TriagemElegibilidadeServico(repositorios, modeloLinguagem)
export const processamentoEditalServico = new ProcessamentoEditalServico(repositorios, extracaoServico, triagemElegibilidadeServico, avaliacaoServico, gatilhosNotificacao, () =>
  configSistemaServico.termosExcludentes(),
)
export const editalServico = new EditalServico(repositorios, (id) => processamentoEditalServico.reavaliar(id), () =>
  configSistemaServico.diasExpirarSemPrazo(),
)
export const entradaServico = new EntradaServico(repositorios, (id) => processamentoEditalServico.processar(id))
export const chatServico = new ChatServico(repositorios, modeloLinguagem, () => configSistemaServico.chatLimiteDiario())
export const dashboardServico = new DashboardServico(new DashboardRepositorio())
const registroDocumento = new RegistroDocumentoServico(repositorios, new DocumentoRepositorio())
const integracoes = criarIntegracoes(modeloLinguagem)
const descobertaFonte = new DescobertaFonteServico(modeloLinguagem)
export const coletaServico = new ColetaServico(repositorios, registroDocumento, descobertaFonte, integracoes)
export const fonteServico = new FonteServico(repositorios, coletaServico, descobertaFonte, integracoes, () =>
  configSistemaServico.problemaDaIa(),
)
export const authServico = new AuthServico(repositorios)
export const perfilServico = new PerfilServico(repositorios, () => processamentoEditalServico.reavaliarAtivos())
export const criterioServico = new CriterioServico(
  repositorios,
  (id) => avaliacaoServico.simular(id),
  () => processamentoEditalServico.reavaliarAtivos(),
)
export const alertaServico = new AlertaServico(repositorios, notificacaoServico, () => configSistemaServico.configSmtp() !== null)
export const destinatarioServico = new DestinatarioServico(repositorios)
export const baseServico = new BaseServico(
  new BaseRepositorio(() => db, path.join(path.dirname(arquivoBanco), 'backups'), arquivoSchema),
  path.join(root, 'exportacoes'),
)
export const bootstrapServico = new BootstrapServico(repositorios)

// Base nova: db/schema.sql + dados iniciais (perfil, critérios, alertas e fontes).
export function criarBaseNova(): void {
  db.exec(fs.readFileSync(arquivoSchema, 'utf8'))
  transacao(() => {
    fonteServico.garantirFontesPadrao()
    bootstrapServico.garantir()
  })
}
export const pendenciaServico = new PendenciaServico(repositorios, () => configSistemaServico.configSmtp() !== null)
