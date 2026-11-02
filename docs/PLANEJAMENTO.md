# Planejamento de correção do Gestor de Editais

Atualizado em 25/10/2026.

O sistema nasceu com a estrutura pronta para resolver 4 problemas do cliente, mas com boa parte da funcionalidade solta ou fixa no código (valores fixos, etapas sem ligação entre si, exceções de uso não tratadas). Este documento acompanha a correção, fase por fase.

Legenda: ✅ concluído · 🟡 parcial · ⏳ pendente · ➖ fora do escopo

---

## 1. Os 4 problemas e o estado de cada um

### Problema 1 — Busca e filtragem manual de editais

> Dependência de processos manuais para monitorar sites (BNDES, Copel, Diário Oficial). Falta de filtros automatizados para identificar oportunidades com fit comercial.

**Estado atual: 🟡 parcial.** FINEP e Embrapii entram prontas, como fontes integradas (API e feed oficiais). Qualquer outro órgão se cadastra informando só a página; o sistema verifica e descobre sozinho como ler (página, feed ou os dados que o site usa). O filtro de relevância poupa a IA do que não serve. Falta cadastrar os órgãos do Paraná.

| Ponto levantado no diagnóstico | Estado | Fase |
|---|---|---|
| Coleta automática de FINEP, CNPq e Embrapii | ✅ FINEP e Embrapii são fontes integradas (API e feed oficiais, ver `docs/API-FINEP.md`); o CNPq se cadastra como fonte adicionada | 2 |
| Notas fixas no cadastro (50 no upload e na URL; 75 ou 85 no manual) | ✅ removidas; o edital passa pelos critérios reais | 1 |
| 6 critérios eliminatórios usavam campos que ninguém preenchia, deixando todo edital "indeterminado" | ✅ campos no catálogo, extraídos pela IA e editáveis à mão | 0 |
| Coleta rodando duas vezes ao mesmo tempo (botão + agendador) | ✅ um único serviço de coleta | 0 |
| BNDES, Copel, Fomento Paraná, Fundação Araucária e Diário Oficial sem coletor | 🟡 qualquer portal se cadastra com nome e endereço; o sistema verifica, descobre como ler (inclusive sites montados por JavaScript) e a IA acha as chamadas. Falta cadastrar | 2 |
| Nenhum filtro por palavras-chave ou termos excludentes antes da IA | ✅ status "Fora do perfil" com botão Resgatar; termos editáveis | 2 |
| Embrapii traz chamadas antigas (2022, 2023) | ✅ a IA escolhe só as chamadas abertas do feed | 2 |
| Entrada por e-mail ou LinkedIn | ➖ fora do escopo (não fazia parte do plano original) | 2 |
| Edital sem prazo nunca expira | ✅ expira após 60 dias sem atualização (configurável) | 2 |
| Uma página em branco marca o PDF inteiro como "requer leitura manual" | ✅ só quando mais da metade das páginas não tem texto | 2 |
| Fonte cadastrada como automática sem coletor falha sempre | ✅ fonte só entra verificada como lista de editais | 2 |
| Upload e link duplicam a lógica de deduplicação da coleta | ✅ o link também confere a página de origem já coletada | 2 |

### Problema 2 — Falha no monitoramento de prazos e notificações

> Perda frequente de prazos de inscrição devido à falta de alertas. Notificações por e-mail ou WhatsApp sobre prazos de encerramento e resultados.

**Estado atual: 🟡 parcial.** Os alertas passaram a disparar de verdade e as datas estão certas; falta cobrir casos de borda, o aviso de resultado e o WhatsApp.

| Ponto levantado no diagnóstico | Estado | Fase |
|---|---|---|
| Prazos e "dias restantes" com 1 dia a menos (fuso horário) | ✅ datas civis no horário de Brasília | 0 |
| Alertas de novo edital com fit alto, de verificação necessária e de edital retificado nunca eram disparados | ✅ disparados ao fim do processamento | 1 |
| Editais coletados, enviados ou por link nunca recebiam alerta de prazo | ✅ chegam a "analisado" sozinhos e entram no alerta | 1 |
| Alerta de prazo só nos dias exatos 15, 7 e 2 (um PC desligado perde o aviso) | ⏳ | 3 |
| Editais ainda em coleta, análise ou falha ficam fora do alerta de prazo | ⏳ | 3 |
| Sem aviso de publicação de resultado | ⏳ | 3 |
| Sem WhatsApp | ⏳ (depende do provedor escolhido) | 3 |
| Sem SMTP configurado, o log registra "enviado" mesmo só imprimindo no terminal | 🟡 a porta de e-mail já distingue "simulado"; falta gravar isso no log | 3 |
| Sem destinatários, nada é enviado e ninguém é avisado | ⏳ | 3 |
| Coleta disparada pelo botão não aciona o alerta de falha de coleta | ⏳ | 3 |

### Problema 3 — Ineficiência das ferramentas atuais (planilhas e gestores)

> Falta de clareza nos status dos projetos e dificuldade de visualização para o gestor. Dashboard centralizado e intuitivo.

**Estado atual: 🟡 parcial.** O fluxo de status ficou coerente e os números do painel passaram a refletir a realidade; falta corrigir a distribuição por fit e criar a visão de planejamento.

| Ponto levantado no diagnóstico | Estado | Fase |
|---|---|---|
| Cartão "Aguardando revisão" sempre perto de zero (nada levava o edital a esse status) | ✅ o processamento define o status | 1 |
| Qualquer ação em qualquer status (aprovar expirado, inscrever descartado…) | ✅ máquina de status; botões só do que vale; ação "Reabrir" | 0 |
| Ação em lote tudo ou nada, sem explicar o que falhou | ✅ aplica nos válidos e informa os ignorados | 0 |
| "Dias restantes" e "prazo urgente" deslocados pelo fuso | ✅ | 0 |
| Editar campos à mão não reavaliava o edital | ✅ reavalia na hora | 1 |
| Distribuição Alto/Médio/Baixo errada (avaliação escolhida por `MAX(id)` de um UUID) | ⏳ | 4 |
| "Registrar resultado" só muda o status, sem gravar o desfecho | ⏳ | 4 |
| "Ajustar nota" aceito pela API mas sem efeito | 🟡 a ação agora é recusada; falta implementar ou remover de vez | 4 |
| Sem visão de planejamento (kanban por status, calendário de prazos) | ⏳ (decisão pendente) | 4 |
| Sem cartão de pendências (falha de IA, perfil incompleto, dados faltando) | ⏳ | 4 |

### Problema 4 — Falta de inteligência na análise de editais

> Uso de IAs genéricas não atende à análise técnica específica. Integrar LLMs para leitura automatizada, com os dados tratados antes da exibição.

**Estado atual: 🟡 parcial.** A leitura por IA agora roda sozinha e alimenta a avaliação; o chat ainda tem as limitações originais.

| Ponto levantado no diagnóstico | Estado | Fase |
|---|---|---|
| A extração por IA só rodava com clique manual e não gerava avaliação | ✅ roda sozinha e leva à nota e ao status | 1 |
| Retificação não atualizava os dados (só preenchia campos vazios) | ✅ refaz o que a IA preencheu e preserva o que foi editado à mão | 1 |
| Extração não cobria os campos dos critérios eliminatórios | ✅ 7 campos novos extraídos | 0 |
| Falha da IA deixava o edital sem destino | ✅ nova tentativa em 15 min, até 3 vezes; depois segue para revisão com aviso | 1 |
| Chat promete enviar o "documento completo", mas o modelo vê só uma parte (contexto de 8 mil tokens) | ⏳ | 5 |
| Chat instruído a responder qualquer assunto (uso genérico) | ⏳ | 5 |
| Extração dos campos novos em contexto único (pode não caber) | ⏳ | 5 |
| Sem parecer técnico automático (resumo, documentos exigidos, riscos, checklist) | ⏳ | 5 |

---

## 2. Fases

### ✅ Fase 0 — Arquitetura em camadas e fundação do domínio

Commit `f6792d8`.

- **Arquitetura:** controller → service → repository. Ports and adapters só para a IA (Ollama) e o e-mail (SMTP/console). Todas as pastas foram reorganizadas dentro das camadas (controllers, serviços, repositórios, domínio, portas, adaptadores, integrações, agendamento, cli).
- **Datas civis** no horário de Brasília, em um único módulo.
- **Máquina de status** do edital, com a ação "Reabrir" e o lote que informa o que foi ignorado.
- **Catálogo único de campos** do edital (7 campos novos) com validação por tipo.
- Mapa das pastas em [ESTRUTURA.md](ESTRUTURA.md).

### ✅ Fase 1 — Pipeline de processamento

Commit `d1749ac`.

- Fluxo `COLETADO → EM_ANALISE → ANALISADO | EM_REVISAO | FALHA`, rodando a cada minuto: lê com a IA, avalia o fit, define o status e dispara os alertas.
- Falha da IA com 3 tentativas; processo interrompido volta para a fila; perfil provisório (CNPJ zerado) faz os editais esperarem.
- Retificação preserva os campos editados à mão; editar campos reavalia sem chamar a IA.
- Fim das notas fixas no cadastro; a tela do edital mostra "em processamento".
- Requer duas colunas novas em `edital`. **O banco local já foi migrado**, com backup.

### ✅ Fase 2 — Busca e filtragem (problema 1)

*Concluída.*

- **Fontes em duas origens.** *Integradas*: FINEP (API pública, com o PDF do edital escolhido pela legenda e os campos estruturados que a IA não refaz) e Embrapii (feed), criadas pelo seed; só se pausam ou mudam de horário. *Adicionadas pelo usuário*: nome, endereço e horário. Antes de salvar, "Verificar página" descobre como ler (feed → página → navegador invisível capturando a API do site) e a IA diz se é LISTA, EDITAL ou OUTRA. Edital: "Adicionar de forma avulsa". Edital ou outra: "Tentar achar a fonte dos editais neste link", que propõe a listagem do mesmo site. A busca diária usa o caminho descoberto, sem navegador. Ficaram de fora PNCP (licitações, volume alto), Transferegov (só entes públicos) e FAPEMIG (sem acesso).
- **Origem do edital registrada sozinha.** Nova entrada não pede "fonte de origem" (PDF enviado, link colado ou cadastro manual, fontes internas que não se pausam nem se excluem). Fontes adicionadas podem ser excluídas: sem editais somem; com editais saem das listas e os editais mantêm a origem ("BNDES (fonte excluída)"). Restrições: endereço e nome sem repetição, limite de 20 fontes adicionadas, IA respondendo para verificar. Avisos: topo de todas as páginas mostra o que falta configurar (perfil, envio de e-mail, destinatários); dashboard e lista explicam o primeiro uso quando não há editais; a saúde da coleta e o resumo semanal ignoram as fontes internas; erros de busca aparecem em linguagem de usuário.
- **Filtro de relevância** antes da IA: edital coletado sozinho que cita um termo excludente (lista editável em Configurações › Fontes) e não traz nada do perfil no título vai para o status novo `FORA_DO_PERFIL`, escondido por padrão, com a ação **Resgatar**. Upload, link e cadastro manual nunca são filtrados.
- Link colado confere também a página de origem de chamadas já coletadas; "requer leitura manual" só quando mais da metade das páginas do PDF não tem texto; edital sem prazo expira após 60 dias sem atualização (configurável; aprovado não expira por isso).
- **Fora do escopo:** entrada por e-mail (IMAP).
- Reconstruiu `edital` e `revisao` e adicionou 7 colunas em `fonte`. **O banco local já foi migrado**, com backup.

---

### ⏳ Fase 3 — Notificações (problema 2)

*Planejada, não iniciada.*

- Alerta de prazo em **janela**: dispara o marco de 15, 7 ou 2 dias que já foi atingido e ainda não saiu, e inclui editais em coleta, análise ou falha.
- **Aviso de resultado** (E07), usando a data prevista do resultado dos editais inscritos.
- Log distinguindo **enviado de simulado**; aviso na tela quando não há destinatários ou SMTP.
- Coleta pelo botão passa a acionar o alerta de falha de coleta.
- **WhatsApp** como segundo canal, com telefone no destinatário (depende do provedor).

### ⏳ Fase 4 — Dashboard e fluxo de trabalho (problema 3)

*Planejada, não iniciada.*

- Corrigir a distribuição Alto/Médio/Baixo (avaliação mais recente por data, faixas que não se sobrepõem).
- **Registrar resultado** gravando o desfecho (contemplado ou não, e o valor).
- **Ajustar nota** com justificativa, ou remover.
- Cartão de pendências; visão **kanban por status** e **calendário de prazos** (decisão pendente).

### ⏳ Fase 5 — IA na análise (problema 4)

*Planejada, não iniciada.*

- Chat por **trechos relevantes** do edital, em vez do documento inteiro cortado, e aviso quando a resposta usou só parte.
- Prompt restrito ao edital e ao perfil da empresa.
- Extração em duas chamadas quando o contexto não couber.
- **Parecer técnico automático** depois da extração: resumo, documentos exigidos, riscos e checklist de submissão.

### ⏳ Fase 6 — Segurança (achado na revisão do plano)

*Planejada, não iniciada.*

- A API não exige login; só as telas são protegidas, e sem sessão o servidor assume o primeiro usuário ativo. Passar a exigir sessão em todas as rotas.
- A exportação e os backups da base levam junto, em texto puro, a chave do Ollama e a senha do Gmail. Tirar os segredos desses arquivos.
- Recomendada logo depois da fase 2, antes de qualquer uso fora do computador de desenvolvimento.

---

## 3. Ordem recomendada

| Ordem | Fase | Situação |
|---|---|---|
| 1 | Fase 0 — Arquitetura e fundação | ✅ concluída |
| 2 | Fase 1 — Pipeline de processamento | ✅ concluída |
| 3 | Fase 2 — Busca e filtragem | ✅ concluída |
| 4 | Fase 6 — Segurança | ⏳ próxima |
| 5 | Fase 3 — Notificações | ⏳ |
| 6 | Fase 4 — Dashboard | ⏳ |
| 7 | Fase 5 — IA na análise | ⏳ |

## 4. Decisões em aberto

1. **Fase 3:** qual provedor de WhatsApp (Meta Cloud API, Twilio ou Z-API), ou fica só e-mail por ora?
2. **Fase 4:** kanban e calendário entram? "Ajustar nota" fica ou sai?
3. **Todas:** prazo com horário ("até 18h do dia 01/11") exige mudar o tipo do campo; hoje guarda só o dia.
4. **Perfil da empresa:** o CNPJ ainda é o provisório (zerado). Enquanto for, os editais ficam esperando em "coletado" e não são avaliados.
