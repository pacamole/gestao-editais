# Base de dados: compartilhar, exportar e importar

Há dois jeitos, escolhidos em **Configurações › Base de dados › Onde ficam os dados**:

- **Na nuvem (Turso):** todos os computadores usam a mesma base, ao vivo. Recomendado para a equipe.
- **Neste computador** (padrão): cada computador tem a sua base; para levar os dados de um para
  outro, exporte e importe um arquivo `.db` (passos 1 a 3 abaixo).

## Base na nuvem (Turso)

1. Crie uma conta gratuita em [turso.tech](https://turso.tech) e, no painel, um banco de dados.
2. Copie a **URL** do banco (`libsql://…turso.io`) e gere um **token** de leitura e escrita.
3. Em **Configurações › Base de dados**, escolha **Na nuvem (Turso)**, cole a URL e o token e clique
   em **Testar conexão**.
   - Base vazia: escolha enviar os dados deste computador ou começar vazia.
   - Base com dados: este computador passa a usá-los.
4. Clique em **Usar a base na nuvem** e entre de novo. Nos outros computadores, repita os passos 3
   e 4 com a mesma URL e o mesmo token.

Como funciona:

- Cada leitura e escrita vai direto ao Turso: o que um computador grava os outros veem na hora.
  Por isso o sistema precisa de internet e fica um pouco mais lento que com a base local.
- A escolha fica em `data/base-conexao.json` (com o token; a pasta `data/` não vai para o git).
  Trocar de base não exige reiniciar, mas encerra a sessão: é preciso entrar de novo.
- A base deste computador não é apagada ao conectar: **Voltar a usar só este computador** volta a ela.
- Se a nuvem não abrir ao iniciar o sistema (sem internet, token revogado), ele usa a base deste
  computador e a tela mostra um aviso com o botão **Reconectar**.
- Os PDFs dos editais ficam no computador que os coletou; textos e análises ficam na base.
- Exportar, importar e os backups funcionam igual. Na nuvem, importar ou restaurar troca os dados
  de toda a equipe; o backup feito antes fica neste computador, em `data/backups/`.

## 1. Exportar (no computador que tem os dados)

Pelo terminal:

```bash
npm run db:exportar
```

O arquivo é gravado em `exportacoes/editais-AAAA-MM-DD_HHMM.db`. Para escolher o caminho:
`npm run db:exportar -- D:/pendrive/base.db`.

Ou pela interface: **Configurações › Base de dados › Baixar base**.

A exportação pode ser feita com o sistema rodando.

## 2. Levar o arquivo para o outro computador

Envie o `.db` por Google Drive, e-mail, pendrive ou similar.

A pasta `exportacoes/` fica fora do git de propósito: o arquivo contém os dados de login dos
usuários (e-mail e hash da senha) e não deve ir para um repositório.

## 3. Importar (no computador que vai receber os dados)

Os dois computadores precisam estar **com a mesma versão do código** (mesmo commit), porque a
estrutura do banco precisa ser igual. Rode `git pull` nos dois antes de exportar.

Pelo terminal:

```bash
npm run db:importar -- caminho/editais-2026-09-28_2330.db
```

Funciona mesmo num computador novo, sem banco nenhum: as tabelas são criadas antes da importação.

Ou pela interface: **Configurações › Base de dados › Trazer de outro computador**, escolha o arquivo e clique em
**Substituir os dados deste computador**.

Depois, entre no sistema com os usuários da base importada.

## O que acontece na importação

- **Todos os dados locais são substituídos** pelos do arquivo. Nada é mesclado.
- Antes de substituir, um backup da base local é gravado em `data/backups/antes-da-importacao-….db`.
  Para desfazer uma importação, use **Restaurar** na lista de backups automáticos da tela.
- O arquivo é validado antes de qualquer alteração. Se for inválido, estiver corrompido ou vier de
  outra versão do schema, a importação é cancelada e a base local fica intacta.
- As sessões de login não são levadas: todos precisam entrar de novo.
- Pode ser feita com o sistema rodando.

## Problemas comuns

| Mensagem | Causa e solução |
| --- | --- |
| "O arquivo foi exportado com outra versão do schema" | Os computadores estão com versões diferentes do código. Atualize os dois (`git pull`) e exporte de novo. |
| "O arquivo não é uma base SQLite válida" | O arquivo não é uma exportação do sistema ou foi corrompido no envio. Exporte e envie de novo. |
| "Banco não criado" ao rodar `npm run dev` | Ainda não há banco neste computador. Rode `npm run db:importar -- arquivo.db` ou `npm run db:reset`. |
