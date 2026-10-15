# Gestor Inteligente de Editais — I9+

Sistema web que capta, analisa e prioriza editais de fomento para a I9+.
Um único servidor Node (Express) entrega a API e a interface React; o banco é SQLite
(`data/editais.db`) ou, opcionalmente, Turso na nuvem.

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 24 ou superior | Rodar o sistema (o npm vem junto) |
| [Git](https://git-scm.com) | qualquer | Baixar o código |
| [Ollama](https://ollama.com) | opcional | Chat e leitura de editais com IA |

Confira as versões:

```bash
node --version    # v24.x ou maior
npm --version
git --version
```

## 2. Baixar o código e instalar as dependências

```bash
git clone https://github.com/pacamole/gestao-editais.git
cd gestao-editais
npm install
```

## 3. Criar o arquivo de ambiente

```bash
cp .env.example .env                 # Linux, macOS ou Git Bash
Copy-Item .env.example .env          # Windows (PowerShell)
```

Os valores padrão já funcionam. Ajuste se precisar:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `DATABASE_PATH` | `data/editais.db` | Caminho do banco |
| `APP_URL` | `http://localhost:3000` | Endereço do sistema: a porta do servidor vem daqui, e é usado nos links dos e-mails |

## 4. Criar o banco

Escolha **um**:

```bash
npm run db:reset                          # base nova, vazia
npm run db:importar -- caminho/base.db    # base exportada por um colega
```

Opcional, para ter editais fictícios e testar as telas:

```bash
npm run db:seed-editais
```

## 5. Subir o sistema

```bash
npm run dev
```

Abra <http://localhost:3000>. Na primeira vez, clique em **Criar conta**.

## 6. (Opcional) Configurar a IA

O chat e o botão **Ler edital com IA** usam o Ollama. Para rodar localmente:

```bash
ollama pull gemma2:latest
ollama serve                 # se o serviço ainda não estiver rodando
```

Para usar o Ollama Cloud em vez disso, informe a chave de API em **Configurações** no sistema.

## 7. (Opcional) Configurar o e-mail

Preencha o SMTP em **Configurações › E-mail** e teste:

```bash
npm run email:teste -- voce@email.com
```

Sem SMTP configurado, os e-mails são apenas impressos no terminal.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe em modo desenvolvimento, com recarga automática |
| `npm run build` e `npm start` | Gera e sobe a versão de produção |
| `npm run typecheck` | Checa os tipos do TypeScript |
| `npm run db:reset` | **Apaga** o banco e recria a partir de `db/schema.sql` |
| `npm run db:seed-editais` | Insere editais fictícios numa base sem editais |
| `npm run db:exportar` | Exporta a base para `exportacoes/*.db` |
| `npm run db:importar -- arquivo.db` | Substitui a base local pela do arquivo |
| `npm run coleta [-- FINEP]` | Roda a coleta de todas as fontes (ou de uma) |
| `npm run email:teste -- email` | Envia um e-mail de teste |

## Problemas comuns

| Sintoma | Solução |
| --- | --- |
| "Banco não criado" ao rodar `npm run dev` | Rode o passo 4. |
| Chat não responde | Verifique se o Ollama está rodando e se o modelo `gemma2:latest` foi baixado. |
| Porta 3000 em uso | Troque a porta no `APP_URL` do `.env` (ex.: `http://localhost:3001`). |

## Mais documentação

- [docs/BASE-DE-DADOS.md](docs/BASE-DE-DADOS.md) — base na nuvem (Turso), exportar e importar entre computadores
- [docs/especificacao-gestao-editais.md](docs/especificacao-gestao-editais.md) — especificação completa
- [docs/ESTRUTURA.md](docs/ESTRUTURA.md) — pastas do código e chaves da tabela `config`
- [docs/DESIGN.md](docs/DESIGN.md) — guia visual (cores, componentes e classes CSS)
- [docs/ENTREGAS.md](docs/ENTREGAS.md) — notas de entrega das tarefas de cada integrante
