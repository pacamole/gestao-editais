# API de chamadas públicas da FINEP

Referência da integração do Gestor de Editais com a FINEP: o que existe, o que dá para usar, o que cada campo significa e onde estão as armadilhas.

> **A FINEP não documenta esta API.** Ela é usada pelo aplicativo de chamadas do site novo (`https://www.finep.gov.br/oportunidades`), e tudo o que está aqui foi levantado por inspeção e teste direto.
> **Última verificação: 02/11/2026.** O formato pode mudar sem aviso. Se a coleta da FINEP começar a falhar, refaça os testes da seção [Como reverificar](#como-reverificar).

---

## Resumo

| | |
|---|---|
| Plataforma | Liferay DXP (*Objects*) |
| Base | `https://www.finep.gov.br/o/c/chamadapublicas` |
| Autenticação | Nenhuma: o recurso de chamadas é público (GET) |
| Formato | JSON |
| Volume (02/11/2026) | 479 chamadas no total; 33 marcadas "aberta"; 7 abertas com prazo futuro |
| Documentos (PDF) | Vêm na própria API com `nestedFields=documentos`; download público |
| Página pública por chamada | Não existe: só a lista em `/oportunidades` |

---

## Endpoints

### Públicos (usados pelo sistema)

| Método | Endereço | Uso |
|---|---|---|
| GET | `/o/c/chamadapublicas` | Lista as chamadas |
| GET | `/o/c/chamadapublicas/{id}` | Uma chamada |
| GET | `/documents/…` (vem pronto em `documentos[].documentoProprietario.link.href`) | Download do PDF |

### Existentes, mas fechados (não usar)

Todos respondem **403** sem token. O aplicativo do site obtém o token em `/o/oauth2/token` com credenciais embutidas no próprio JavaScript. **Não usamos isso**: seria nos passarmos pelo aplicativo da FINEP. Nada do que o sistema precisa depende deles.

| Endereço | O que seria |
|---|---|
| `/o/headless-delivery/v1.0/content-structures/210999/structured-contents` | Conteúdos do site consultados junto com as chamadas |
| `/o/headless-admin-taxonomy/v1.0/sites/20117/taxonomy-vocabularies` e `…/taxonomy-vocabularies/{id}/taxonomy-categories` | Nomes dos temas (`temaPrincipal` vem só como código) |
| `/o/headless-admin-list-type/v1.0/list-type-definitions` | Rótulos das listas de valores |
| `/o/c/chamadapublicas/{id}/attachments`, `/o/c/chamadapublicas/{id}/documentos` | Documentos por sub-recurso (use `nestedFields`) |
| `/o/openapi`, `/o/c/chamadapublicas/openapi.json` | Especificação OpenAPI |
| `/o/object-admin/v1.0/object-definitions` | Definição dos objetos |
| `/o/graphql` | Responde 400 |

Também não existem `/o/c/oportunidades`, `/o/c/noticias`, `/o/c/resultadochamadas` nem `/o/c/documentochamadas` (404).

---

## Parâmetros da listagem

| Parâmetro | Exemplo | Observação |
|---|---|---|
| `pageSize` | `pageSize=500` | Até 500 por página |
| `page` | `page=2` | Começa em 1. A resposta traz `totalCount`, `page`, `lastPage` |
| `sort` | `sort=dataDePublicacao:desc`, `sort=prazoProposto:asc` | |
| `filter` | `filter=situacao eq 'aberta'` | Sintaxe OData do Liferay. Use URL-encode |
| `filter` | `filter=prazoProposto gt 2026-11-02T00:00:00Z` | Datas em ISO 8601 (UTC) |
| `search` | `search=EUREKA` | Busca **por palavra inteira e com acento**: `Inovação` acha 207, `inovacao` acha 0 |
| `fields` | `fields=id,titulo,prazoProposto` | Devolve só esses campos |
| `nestedFields` | `nestedFields=documentos` | **Obrigatório para vir a lista de documentos (PDFs)** |

Consulta usada pela coleta:

```
GET https://www.finep.gov.br/o/c/chamadapublicas
      ?pageSize=500
      &sort=dataDePublicacao:desc
      &nestedFields=documentos
```

Com 479 chamadas, a lista inteira vem numa página só. O filtro de "abertas" é feito pelo sistema (ver [Armadilhas](#armadilhas)), não pela API.

---

## Campos de uma chamada

| Campo | Tipo | Valores / exemplo | Significado |
|---|---|---|---|
| `id` | número | `1132029` | Identificador da chamada nesta API (difere da numeração do site antigo) |
| `externalReferenceCode` | texto | UUID | Identificador estável alternativo |
| `titulo` | texto | "Programa de Cooperação para Inovação da Rede EUREKA – …" | |
| `descricao` | HTML | | Texto de apresentação, com links para manuais, vídeos e plataformas. ~1.000 caracteres: **não substitui o edital** |
| `descricaoRawText` | texto | | A mesma descrição, sem HTML |
| `situacao` | lista | `{ key: "aberta" \| "encerrada" \| "" }` | Situação informada pela FINEP. **Desatualizada com frequência** |
| `prazoProposto` | data-hora (UTC) | `2026-11-23T17:00:00.000Z` | Prazo para envio de propostas. Às vezes vazio |
| `dataDePublicacao` | data-hora (UTC) | | |
| `vigenciaInicio`, `vigenciaFim` | data-hora (UTC) | | Período da chamada |
| `dataAlteracao` | data-hora | | Aparece em algumas chamadas |
| `dateCreated`, `dateModified` | data-hora | | Controle do Liferay |
| `publicoAlvo` | lista múltipla | ver tabela abaixo | Quem pode participar |
| `tipoDeOportunidade` | lista | `naoReembolsavel`, `apoioInstitucional`, vazio | |
| `contrapartida` | lista | `financeira`, `naoFinanceira`, `semContrapartida`, vazio | |
| `tipoCooperacao` | lista | `entreEmpresas`, `entreEmpresasICTs`, vazio | Se exige cooperação e com quem |
| `regiao` | lista | `todoBrasil`, `norte`, vazio | Abrangência |
| `temaPrincipal` | lista | códigos como `180706` | Os nomes estão na taxonomia, que é fechada |
| `tema` | texto | | |
| `ordenacao` | número | | Ordem de exibição no site |
| `status` | objeto | `{ label: "approved" }` | Publicação no Liferay |
| `documentos` | lista | só com `nestedFields=documentos` | Ver a próxima seção |

### Valores de `publicoAlvo`

| Chave | Rótulo na FINEP |
|---|---|
| `empresa1` | Receita: até R$ 4,8 Mi |
| `empresa2` | Receita: R$ 4,8 Mi – R$ 16,0 Mi |
| `empresa3` | Receita: R$ 16,0 Mi – R$ 90,0 Mi |
| `empresa4` | Receita: R$ 90,0 Mi – R$ 300,0 Mi |
| `empresa5` | Receita: maior que R$ 300,0 Mi |
| `startup` | Startups |
| `ict` | Instituições de ciência e tecnologia |
| `cooperativa` | Cooperativas |
| `fundos` | Fundos de investimento / gestores |

---

## Documentos (PDF do edital)

Pedindo `nestedFields=documentos`, cada chamada traz a lista de arquivos publicados: 474 das 479 chamadas têm documentos, 4.083 no total.

```json
{
  "legenda": "Edital",
  "destaque": true,
  "dataDePublicacao": "2025-04-07T00:00:00.000Z",
  "documentoProprietario": {
    "name": "07_04_2025_Edital_FIP_Complexo_da_Saude.pdf",
    "link": {
      "href": "/documents/20117/206285/07_04_2025_Edital_FIP_Complexo_da_Saude.pdf/…?version=1.0&download=true&…",
      "label": "07_04_2025_Edital_FIP_Complexo_da_Saude.pdf"
    }
  },
  "r_documentos_c_chamadaPublicaId": 752474
}
```

- **Download:** `https://www.finep.gov.br` + `documentoProprietario.link.href`. É público e responde `200 application/pdf`.
- Alguns itens não têm `documentoProprietario`, como a legenda "Webinar …", que é link de vídeo. Ignorar.

### Legendas mais frequentes

| Legenda | Ocorrências |
|---|---|
| Edital | 416 |
| Resultado | 183 |
| Resultado final | 121 + 30 ("Resultado Final") |
| Aviso de rerratificação | 96 |
| Rerratificação | 80 |
| FAP | 69 |
| FAQ | 56 |
| Resultado preliminar | 46 + 22 ("Resultado Preliminar") |
| Rerratificação - Edital rerratificado | 29 |
| Resultado final da etapa de habilitação | 25 |
| Rerratificação II | 24 |
| Regulamento | 24 |
| Edital rerratificado | 21 |

As legendas são texto livre: variam em maiúsculas, acentos e complementos ("Edital - Etapa nacional", "Anexo 1: …").

### Qual documento é "o edital"

Regra usada pelo sistema, comparando a legenda sem diferenciar maiúsculas e acentos:

1. **Edital rerratificado** (inclui "Rerratificação - Edital rerratificado"). Se houver mais de um, o de `dataDePublicacao` mais recente.
2. Senão, **Edital** (inclui "Edital - Etapa nacional" etc.). Se houver mais de um, o mais recente.
3. Senão, **Regulamento**. É assim que o programa *Mais Inovação Brasil* chama o edital, com as regras específicas em "Anexo 1: Características Específicas da Seleção Pública".
4. Nunca usar: resultados, FAQ, FAP, apresentações, minutas, declarações, avisos.

Sem nenhum desses, a chamada entra sem PDF: a IA lê a `descricao` e o edital tende a ir para "Em revisão".

**Retificação:** quando a FINEP publica um "Edital rerratificado", o documento escolhido muda e o PDF tem outro conteúdo. O sistema trata isso como retificação: guarda a versão anterior e reprocessa.

---

## Armadilhas

1. **`situacao = "aberta"` não é confiável.** Das 33 "abertas", 14 tinham prazo vencido e 12 não tinham prazo (02/11/2026). Há também "abertas" sem prazo nem vigência publicadas em 2015 e 2017. Regra do sistema (`chamadaAberta` em `servicos/coleta/integracoes/Finep.ts`): aberta se `prazoProposto` for futuro; sem prazo, só com `situacao = "aberta"` **e** `vigenciaFim` futura, ou, sem vigência, `dataDePublicacao` nos últimos 12 meses. Em 02/11/2026 isso dá 11 chamadas.
2. **Datas em UTC.** `2026-11-23T17:00:00.000Z` é 23/11/2026 às 14:00 em Brasília. Converter para America/Sao_Paulo antes de gravar o dia do prazo (`shared/datas.ts`).
3. **Busca exige acento e palavra inteira.** Não usar `search` para filtrar relevância; o sistema filtra por conta própria.
4. **Sem página por chamada.** Testados `/chamadas-publicas/chamadapublica/{id}`, `/oportunidades/{id}` e `/web/guest/oportunidades/-/{id}`: todos 404. O link "ver no site" aponta para `https://www.finep.gov.br/oportunidades`.
5. **Numeração diferente do site antigo.** `legacy.finep.gov.br/.../chamadapublica/774` não é o `id` 774 daqui. Não cruzar por número.
6. **Temas só em código.** `temaPrincipal` vem como `180706`; os nomes ficam na taxonomia (403). Não usar na avaliação.
7. **Documentos sem arquivo.** Itens como "Webinar" não têm `documentoProprietario`.
8. **API não documentada.** Pode mudar sem aviso. Falha na coleta deve aparecer como "Com erro" na fonte, com a mensagem, sem derrubar as outras fontes.

---

## Correspondência com o edital do sistema

| Edital (sistema) | FINEP | Regra |
|---|---|---|
| `titulo` | `titulo` | |
| `orgao_financiador` | — | Fixo: "FINEP" |
| `url_original` | — | `https://www.finep.gov.br/oportunidades` (não há página própria). Identidade da chamada: `id` |
| `url_documento` | documento escolhido | `https://www.finep.gov.br` + `href` |
| `data_publicacao` | `dataDePublicacao` | Data civil em Brasília |
| `prazo_inscricao` | `prazoProposto` | Data civil em Brasília |
| `modalidade` | `tipoDeOportunidade` | `naoReembolsavel` → Subvenção; `apoioInstitucional` → Outro; vazio → deixar para a IA |
| `exige_contrapartida` | `contrapartida` | `financeira`/`naoFinanceira` → sim; `semContrapartida` → não; vazio → IA |
| `abrangencia_geografica` | `regiao` | `todoBrasil` → `[]` (sem restrição); `norte` → siglas dos estados da região (AC, AP, AM, PA, RO, RR, TO); vazio → IA |
| `faturamento_minimo` / `faturamento_maximo` | `publicoAlvo` (`empresa1`–`empresa5`) | Menor e maior faixa marcadas |
| `publico_alvo` | `publicoAlvo` | Rótulos da tabela acima |
| demais campos (CNAE, porte, certidões, valores…) | — | Extraídos pela IA do PDF do edital |

Implementado em `src/server/servicos/coleta/integracoes/Finep.ts` (`camposEstruturados`). Os campos vindos da API são gravados com a evidência "Dado estruturado informado pela fonte." (`MARCADOR_DADO_ESTRUTURADO`), aparecem na tela como "Informado pela fonte", e a IA completa só o que ficar vazio, sem sobrescrevê-los nem na retificação. A identidade da chamada no sistema é o `id` da API (`edital.id_externo`), já que todas apontam para a mesma página `/oportunidades`.

---

## Como reverificar

```bash
# Total de chamadas (esperado: JSON com totalCount)
curl -s "https://www.finep.gov.br/o/c/chamadapublicas?pageSize=1&fields=id,titulo"

# Abertas com prazo futuro, com documentos
curl -s "https://www.finep.gov.br/o/c/chamadapublicas?pageSize=500&nestedFields=documentos&filter=prazoProposto%20gt%202026-11-02T00:00:00Z"

# Download de um documento (esperado: 200 application/pdf)
curl -sI "https://www.finep.gov.br<href do documento>"
```

O que mudou se der problema:

- **403 na listagem:** a FINEP fechou o recurso. A alternativa é a página antiga, `https://legacy.finep.gov.br/component/chamadas_publicas/chamadaspublicas`, lida como fonte HTML.
- **`documentos` ausente:** confira se `nestedFields=documentos` ainda é aceito ou se o nome da relação mudou. O aplicativo do site, `/o/finep-busca-chamadas-publicas/assets/index-*.js`, mostra as consultas atuais.
- **Campos renomeados:** compare uma chamada atual com a tabela [Campos de uma chamada](#campos-de-uma-chamada).

---

## Como foi descoberto

1. A página `/oportunidades` carrega um aplicativo próprio (`/o/finep-busca-chamadas-publicas/assets/index-*.js`). O HTML só tem menus.
2. O código desse aplicativo consulta `/o/c/chamadapublicas` e alguns endpoints `headless-*`.
3. Testados sem login: só `/o/c/chamadapublicas` responde. Os demais dão 403.
4. Os documentos não aparecem na resposta padrão. O padrão do Liferay `nestedFields=…` revelou a relação `documentos`, com o PDF de cada arquivo.
