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
