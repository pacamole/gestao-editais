import { AvaliacaoRepositorio } from './AvaliacaoRepositorio.js'
import { ColetaExecucaoRepositorio } from './ColetaExecucaoRepositorio.js'
import { ConfigAlertaRepositorio } from './ConfigAlertaRepositorio.js'
import { ConfigRepositorio } from './ConfigRepositorio.js'
import { ConversaRepositorio } from './ConversaRepositorio.js'
import { CriterioRepositorio } from './CriterioRepositorio.js'
import { EditalRepositorio } from './EditalRepositorio.js'
import { EditalVersaoRepositorio } from './EditalVersaoRepositorio.js'
import { EvidenciaRepositorio } from './EvidenciaRepositorio.js'
import { FonteRepositorio } from './FonteRepositorio.js'
import { MensagemRepositorio } from './MensagemRepositorio.js'
import { NotificacaoLogRepositorio } from './NotificacaoLogRepositorio.js'
import { PerfilEmpresaRepositorio } from './PerfilEmpresaRepositorio.js'
import { RevisaoRepositorio } from './RevisaoRepositorio.js'
import { SessaoRepositorio } from './SessaoRepositorio.js'
import { UsuarioRepositorio } from './UsuarioRepositorio.js'

// Uma instância de cada repositório, compartilhada pelo servidor.
export const repositorios = {
  usuario: new UsuarioRepositorio(),
  sessao: new SessaoRepositorio(),
  edital: new EditalRepositorio(),
  editalVersao: new EditalVersaoRepositorio(),
  evidencia: new EvidenciaRepositorio(),
  avaliacao: new AvaliacaoRepositorio(),
  revisao: new RevisaoRepositorio(),
  perfilEmpresa: new PerfilEmpresaRepositorio(),
  criterio: new CriterioRepositorio(),
  fonte: new FonteRepositorio(),
  coletaExecucao: new ColetaExecucaoRepositorio(),
  conversa: new ConversaRepositorio(),
  mensagem: new MensagemRepositorio(),
  notificacaoLog: new NotificacaoLogRepositorio(),
  configAlerta: new ConfigAlertaRepositorio(),
  config: new ConfigRepositorio(),
}

export type Repositorios = typeof repositorios

export {
  AvaliacaoRepositorio,
  ColetaExecucaoRepositorio,
  ConfigAlertaRepositorio,
  ConfigRepositorio,
  ConversaRepositorio,
  CriterioRepositorio,
  EditalRepositorio,
  EditalVersaoRepositorio,
  EvidenciaRepositorio,
  FonteRepositorio,
  MensagemRepositorio,
  NotificacaoLogRepositorio,
  PerfilEmpresaRepositorio,
  RevisaoRepositorio,
  SessaoRepositorio,
  UsuarioRepositorio,
}
