# Estrutura do projeto

```
db/schema.sql          estrutura do banco (sem migrações: altere e rode db:reset)
src/client/            interface React (páginas em pages/, rotas em router.tsx)
  styles/              design system em CSS (guia em docs/DESIGN.md)
src/server/            servidor Express (index.ts monta a API em /api)
  rotas/               endpoints HTTP, um arquivo por assunto (index.ts reúne todos)
  servicos/            regras de negócio usadas pelas rotas (avaliação, extração, bootstrap)
  auth/                senha e sessão (cookie)
  dominio/             entidades e validações do domínio
  repositorios/        acesso ao banco, um repositório por tabela
  db/                  conexão, reset e seeds
  coleta/              coleta de editais nas fontes
  chat/                integração com o Ollama
  notificacao/         e-mails E01–E06 e seus gatilhos
  base/                exportação e importação da base
  infra/               agendador de rotinas
  config/              variáveis de ambiente (.env) e caminhos do projeto
  util/                funções utilitárias
src/shared/            tipos e rótulos usados pelos dois lados
docs/                  especificação e guia de design
```

## Configurações do sistema (tabela `config`)

Ficam no banco e podem ser alteradas a qualquer momento, sem reiniciar o servidor.

| Chave | Uso |
| --- | --- |
| `ollama_modo` | `LOCAL` (Ollama neste computador) ou `NUVEM` (Ollama Cloud, ollama.com) |
| `ollama_url` | Modo local: endereço do Ollama (padrão `http://localhost:11434`); modelo fixo `gemma2:latest` |
| `ollama_chave`, `ollama_modelo_nuvem` | Modo nuvem: chave de API da conta Ollama (ollama.com/settings/keys) e modelo escolhido |
| `smtp_host`, `smtp_porta`, `smtp_usuario`, `smtp_senha`, `smtp_nome_remetente` | Envio de e-mail (tela Configurações › E-mail). `smtp_usuario` é o e-mail da conta que envia e `smtp_senha` a senha de app dessa conta. Sem `smtp_host`, os e-mails só são impressos no terminal. |
| `chat_limite_diario` | Perguntas por usuário por dia no chat (padrão 20) |

