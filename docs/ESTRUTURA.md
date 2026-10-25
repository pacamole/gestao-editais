# Estrutura do projeto

```
db/schema.sql          estrutura do banco (sem migrações: altere e rode db:reset)
src/client/            interface React (páginas em pages/, rotas em router.tsx)
  styles/              design system em CSS (guia em docs/DESIGN.md)
src/server/            servidor Express (index.ts monta a API em /api)
  controllers/         camada HTTP: lê a requisição, chama um service e devolve a resposta (sem SQL nem regra)
  servicos/            regras de negócio e casos de uso, um service por assunto
    coleta/            fontes padrão e portais/ (uma classe por portal: FINEP, CNPq, Embrapii)
    ia/                prompts, leitura da resposta do modelo e índice de busca por trechos
    notificacao/       textos dos e-mails E01–E06 (uma classe por tipo), formatação e simulação
  repositorios/        acesso a dados: todo o SQL (um repositório por agregado), arquivos de PDF e backup da base
  dominio/             entidades, motor de critérios, cálculo da avaliação, validações e erros de negócio
  portas/              interfaces do que vem de fora (modelo de linguagem, e-mail)
  adaptadores/         implementações das portas (Ollama, SMTP, console)
  integracoes/         clientes de recursos externos usados pelos services: download HTTP, leitura de PDF e de páginas
  agendamento/         agendador e tarefas agendadas (coleta, expiração, alertas)
  cli/                 comandos do terminal (db:reset, db:exportar, coleta, e-mail de teste…), um arquivo por comando
  db/                  conexão com o banco (local ou nuvem) e transações
  config/              variáveis de ambiente (.env) e caminhos do projeto
  composicao.ts        liga repositórios, adaptadores e services (único lugar com new)
  util/                funções utilitárias
src/shared/            tipos, rótulos e regras puras usadas pelos dois lados (datas, status, campos)
docs/                  especificação e guia de design
```

Fluxo de uma requisição: `controller → service → repository` (e `service → porta ← adaptador` para Ollama e e-mail).
As dependências sempre apontam para dentro: um service nunca importa `express`, e só os adaptadores falam com serviços externos.

## Configurações do sistema (tabela `config`)

Ficam no banco e podem ser alteradas a qualquer momento, sem reiniciar o servidor.

| Chave | Uso |
| --- | --- |
| `ollama_modo` | `LOCAL` (Ollama neste computador) ou `NUVEM` (Ollama Cloud, ollama.com) |
| `ollama_url` | Modo local: endereço do Ollama (padrão `http://localhost:11434`); modelo fixo `gemma2:latest` |
| `ollama_chave`, `ollama_modelo_nuvem` | Modo nuvem: chave de API da conta Ollama (ollama.com/settings/keys) e modelo escolhido |
| `smtp_host`, `smtp_porta`, `smtp_usuario`, `smtp_senha`, `smtp_nome_remetente` | Envio de e-mail (tela Configurações › E-mail). `smtp_usuario` é o e-mail da conta que envia e `smtp_senha` a senha de app dessa conta. Sem `smtp_host`, os e-mails só são impressos no terminal. |
| `chat_limite_diario` | Perguntas por usuário por dia no chat (padrão 20) |

