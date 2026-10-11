# Gestor Inteligente de Editais — I9+

Sistema web que capta, analisa e prioriza editais de fomento para a I9+.
A especificação completa está em [especificacao-gestao-editais.md](especificacao-gestao-editais.md).
O guia visual (cores, componentes e classes CSS) está em [docs/DESIGN.md](docs/DESIGN.md).

Projeto único em React + TypeScript: o mesmo servidor Node (Express) entrega a API e a interface.
O banco é um arquivo SQLite (`data/editais.db`).

## Requisitos

- Node.js 24 ou superior

## Primeiros passos

```bash
npm install
cp .env.example .env        # no Windows (PowerShell): Copy-Item .env.example .env
```

Depois, escolha **um** dos caminhos para ter um banco:

```bash
npm run db:reset                          # base nova, só com os dados iniciais
npm run db:importar -- caminho/base.db    # base de um colega (veja abaixo)
```

E suba o sistema:

```bash
npm run dev                 # http://localhost:3000
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o sistema em modo desenvolvimento, com recarga automática |
| `npm run build` e `npm start` | Gera e sobe a versão de produção |
| `npm run typecheck` | Checa os tipos do TypeScript |
| `npm run db:reset` | **Apaga** o banco e recria do zero a partir de `db/schema.sql` |
| `npm run db:exportar` | Exporta a base inteira para um arquivo `.db` |
| `npm run db:importar -- arquivo.db` | Substitui a base local pela de um arquivo exportado |
| `npm run email:teste -- voce@email.com` | Envia um e-mail de teste para conferir o SMTP |

## Compartilhando a base entre a equipe

Para trabalhar todos sobre os mesmos dados, ou apresentar em outro computador, uma pessoa
exporta a base e as outras importam o arquivo.

### 1. Exportar (no computador que tem os dados)

Pelo terminal:

```bash
npm run db:exportar
```

O arquivo é gravado em `exportacoes/editais-AAAA-MM-DD_HHMM.db`. Para escolher o caminho:
`npm run db:exportar -- D:/pendrive/base.db`.

Ou pela interface: menu **Gestão → Base de dados → Baixar base**.

A exportação pode ser feita com o sistema rodando.

### 2. Levar o arquivo para o outro computador

Envie o `.db` por Google Drive, e-mail, pendrive ou similar.

A pasta `exportacoes/` fica fora do git de propósito: o arquivo contém os dados de login dos
usuários (e-mail e hash da senha) e não deve ir para um repositório.

### 3. Importar (no computador que vai receber os dados)

Os dois computadores precisam estar **com a mesma versão do código** (mesmo commit), porque a
estrutura do banco precisa ser igual. Rode `git pull` nos dois antes de exportar.

Pelo terminal:

```bash
npm run db:importar -- caminho/editais-2026-09-28_2330.db
```

Funciona mesmo num computador novo, sem banco nenhum: as tabelas são criadas antes da importação.

Ou pela interface: menu **Gestão → Base de dados**, escolha o arquivo e clique em **Importar base**.

Depois, entre no sistema com os usuários da base importada.

### O que acontece na importação

- **Todos os dados locais são substituídos** pelos do arquivo. Nada é mesclado.
- Antes de substituir, um backup da base local é gravado em `data/backups/antes-da-importacao-….db`.
  Para desfazer uma importação, importe esse backup.
- O arquivo é validado antes de qualquer alteração. Se for inválido, estiver corrompido ou vier de
  outra versão do schema, a importação é cancelada e a base local fica intacta.
- As sessões de login não são levadas: todos precisam entrar de novo.
- Pode ser feita com o sistema rodando.

### Problemas comuns

| Mensagem | Causa e solução |
| --- | --- |
| "O arquivo foi exportado com outra versão do schema" | Os computadores estão com versões diferentes do código. Atualize os dois (`git pull`) e exporte de novo. |
| "O arquivo não é uma base SQLite válida" | O arquivo não é uma exportação do sistema ou foi corrompido no envio. Exporte e envie de novo. |
| "Banco não criado" ao rodar `npm run dev` | Ainda não há banco neste computador. Rode `npm run db:importar -- arquivo.db` ou `npm run db:reset`. |

## Configuração (`.env`)

| Variável | Uso |
| --- | --- |
| `PORT` | Porta do servidor (padrão 3000) |
| `DATABASE_PATH` | Caminho do banco (padrão `data/editais.db`) |
| `APP_URL` | Endereço do sistema, usado nos links dos e-mails |
| `GESTOR_NOME`, `GESTOR_EMAIL`, `GESTOR_SENHA` | Usuário Gestor criado pelo `db:reset` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio de e-mail. Sem `SMTP_HOST`, os e-mails só são impressos no terminal. |

## Estrutura

```
db/schema.sql          estrutura do banco (sem migrações: altere e rode db:reset)
src/client/            interface React (páginas em pages/, rotas em router.tsx)
  styles/              design system em CSS (guia em docs/DESIGN.md)
src/server/            servidor Express
  repositorios/        acesso ao banco, um repositório por tabela
  notificacao/         e-mails E01–E06 e seus gatilhos
  base/                exportação e importação da base
src/shared/            tipos e rótulos usados pelos dois lados
```

## Implementação — tarefas 9, 10 e 11 (Bhrendon)

Esta versão inclui a implementação da parte de Bhrendon na Etapa 5:

- **Tarefa 9 — Login:** autenticação real por e-mail/senha, cookie de sessão, mensagens de erro e proteção das páginas internas.
- **Tarefa 10 — Detalhe do edital:** veredito de elegibilidade, nota de fit, critérios, dados extraídos e evidências.
- **Tarefa 11 — Revisão e chat:** Aprovar, Descartar (comentário obrigatório), Marcar como Inscrito, Registrar Resultado, histórico e chat local baseado nos dados extraídos do edital.

### Como testar

1. Copie `.env.example` para `.env` e defina `GESTOR_EMAIL` e `GESTOR_SENHA`.
2. Execute `npm install`.
3. Execute `npm run db:reset` para criar o banco e o usuário gestor.
4. Execute `npm run dev`.
5. Abra `http://localhost:3000/login` e entre com as credenciais definidas no `.env`.

> O chat desta entrega é um MVP local para demonstrar a interface e o fluxo. Ele responde a perguntas de prazo, valor e contrapartida usando somente os dados já extraídos. A estrutura de conversa/mensagens fica pronta para uma integração futura com LLM.

## Implementação — tarefas 19–22 (Gabriel)

- **19:** `coleta/pdf.ts` recebe bytes de um PDF e retorna texto por página física, texto combinado com marcadores `[Página N]` e `requerLeituraManual`. Páginas sem texto (inclusive documentos mistos) recebem aviso em `erro_processamento`. Não executa OCR. PDF.js foi escolhido pelo acesso explícito às páginas e às quebras de linha; extração de tabelas/colunas depende da ordem interna do PDF.
- **20:** coleta sequencial da FINEP, download do PDF principal, SHA-256 e deduplicação por conteúdo, URL do PDF, página original ou número + órgão. PDFs ficam em `data/documentos/<hash>.pdf` (ou ao lado do banco configurado). Novos registros entram em `COLETADO`.
- **21:** coletores de CNPq e Embrapii; versões anteriores em `edital_versao`, flag `retificado` e retorno a `COLETADO` após nova extração textual. As cinco fontes manuais nomeadas na documentação são cadastradas. As duas fontes sem nome permanecem pendentes, conforme orientação de não inventar os dados faltantes. Upload/URL manual são vias de entrada, não duas fontes adicionais do parceiro.
- **22:** coleta diária às 06:00 (Brasília), alerta de prazo existente às 07:00 e expiração diária. O horário de coleta aceita `minuto hora * * *` em `frequencia_cron`. Histórico das últimas 30 execuções e último sucesso persistem em `config`, nas chaves `rotina:*`; detalhes da coleta persistem em `coleta_execucao`. Na abertura, rotinas diárias atrasadas executam uma vez com os dados atuais, sem reproduzir cada dia perdido. Falhas são repetidas após uma hora. O sistema precisa estar aberto.

### Executar e testar

```bash
npm install
npm run test:coleta
npm run typecheck
npm run build
npm run coleta -- FINEP     # banco já criado; pode usar CNPq ou Embrapii
npm run coleta             # todas as fontes automáticas ativas
```

O banco novo já recebe as fontes. Na abertura ou na CLI, bases existentes recebem as novas fontes; os placeholders antigos sem URL, cron ou histórico são configurados, sem resetar a base. Fontes já configuradas mantêm suas preferências. `data/documentos` não vai para o Git. A exportação de base existente exporta o SQLite, não os arquivos PDF; textos e versões continuam no banco.

### Validação e limites

Em 11/10/2026, em banco isolado, foram coletados **2 PDFs da FINEP, 4 do CNPq e 13 da Embrapii**. Uma segunda execução registrou zero itens novos e manteve os mesmos 19 registros, sem retificações artificiais. A Embrapii apresentou três páginas sem PDF principal identificável, registradas como coleta `PARCIAL`. A listagem da FINEP foi consultada no portal `legacy`, pois o endereço anterior redireciona para o site novo. A Embrapii publica também chamadas históricas; sua página não separa apenas as abertas. Nenhuma data de inscrição é inferida pelo coletor: essa extração pertence à etapa de análise.

Os testes locais cobrem PDFs com duas páginas, página sem camada de texto, arquivo inválido, seleção de links, três chaves de deduplicação, retificação, falha parcial, reinício após dois dias, prevenção de execução simultânea, repetição após falha e expiração sem alterar inscritos/decisões terminais.

Limitações de integração: o projeto ainda não possui o consumidor de análise estruturada/avaliação por IA das tarefas 23 em diante. `COLETADO` é a fila persistente para esse consumidor; esta entrega reextrai o texto, mas não calcula elegibilidade ou fit. O gatilho E05 existente deve ser chamado pelo consumidor após concluir a avaliação. O aviso de leitura manual fica disponível no registro; não foi criada outra interface ou notificação de e-mail. A base de 6–8 PDFs da equipe não estava no repositório, por isso os testes usam PDFs sintéticos e documentos dos portais.

O coletor seleciona um PDF principal por chamada; não combina anexos ou erratas avulsas, nem interpreta alterações legais. Detecta substituição do PDF principal e mudanças de conteúdo, inclusive quando muda sua URL. Coletores dependem do HTML público: alterações de estrutura, paginação adicional e publicações sem PDF exigem ajuste/entrada manual. Downloads têm intervalo de 300 ms, timeout de 30 s e limite de 25 MB.

Fontes consultadas: [FINEP](https://legacy.finep.gov.br/component/chamadas_publicas/chamadaspublicas), [CNPq](https://www.gov.br/cnpq/pt-br/chamadas/Busca_abertas), [Embrapii](https://embrapii.org.br/transparencia/#chamadas). O [robots.txt da FINEP](https://legacy.finep.gov.br/robots.txt) foi consultado e não proíbe as rotas usadas; isso não substitui licença ou termos de reutilização. Não foi localizada permissão específica de redistribuição automática dos documentos. A coleta usa páginas públicas e não contorna autenticação ou bloqueios.
