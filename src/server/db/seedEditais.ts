import { db, novoId } from "./index.js";
import { repositorios } from "../repositorios/index.js";
import type {
  Modalidade,
  StatusEdital,
  StatusElegibilidade,
  Classificacao,
} from "../dominio/entidades.js";

export function semearEditaisExemplo() {
  const contagem = db.prepare("SELECT COUNT(*) as c FROM edital").get() as {
    c: number;
  };
  if (contagem && contagem.c > 0) return;

  const fontes = repositorios.fonte.listar();
  const fonteMap = new Map(fontes.map((f) => [f.nome, f.id]));

  const getFonte = (nome: string) => {
    let id = fonteMap.get(nome);
    if (!id) {
      const criada = repositorios.fonte.inserir({
        nome,
        tipo: "SCRAPER",
        ativo: true,
      });
      id = criada.id;
      fonteMap.set(nome, id);
    }
    return id;
  };

  const finepId = getFonte("FINEP");
  const bndesId = getFonte("BNDES");
  const cnpqId = getFonte("CNPq");
  const copelId = getFonte("Copel");
  const fomentoId = getFonte("Fomento Paraná");
  const araucariaId = getFonte("Fundação Araucária");
  const diarioId = getFonte("Diário Oficial do PR");

  type ExemploEdital = {
    titulo: string;
    orgao_financiador: string;
    numero_edital: string;
    modalidade: Modalidade;
    fonte_id: string;
    data_publicacao: string;
    prazo_inscricao: string;
    data_resultado_prevista: string;
    valor_total_disponivel: number;
    valor_maximo_por_projeto: number;
    exige_contrapartida: boolean;
    percentual_contrapartida: number;
    publico_alvo: string[];
    cnaes_aceitos: string[];
    portes_aceitos: string[];
    natureza_juridica_aceita: string[];
    abrangencia_geografica: string[];
    exige_ict_parceira: boolean;
    tempo_minimo_fundacao_meses: number;
    faturamento_minimo: number | null;
    faturamento_maximo: number | null;
    certidoes_exigidas: string[];
    areas_tematicas: string[];
    permite_submissao_multipla: boolean;
    resumo_executivo: string;
    status: StatusEdital;
    criado_em: string;
    avaliacao: {
      status_elegibilidade: StatusElegibilidade;
      nota_fit: number;
      classificacao: Classificacao;
    };
  };

  const editais: ExemploEdital[] = [
    {
      titulo:
        "Chamada Pública MCTI/FINEP — Baterias Avançadas e Transição Energética 2026",
      orgao_financiador: "FINEP",
      numero_edital: "01/2026",
      modalidade: "SUBVENCAO",
      fonte_id: finepId,
      data_publicacao: "2026-09-01",
      prazo_inscricao: "2026-10-15",
      data_resultado_prevista: "2026-11-30",
      valor_total_disponivel: 50000000,
      valor_maximo_por_projeto: 3500000,
      exige_contrapartida: true,
      percentual_contrapartida: 15,
      publico_alvo: ["Empresas de base tecnológica", "Fabricantes de baterias"],
      cnaes_aceitos: ["27.22-8", "27.21-0"],
      portes_aceitos: ["ME", "EPP", "MEDIA"],
      natureza_juridica_aceita: [
        "Sociedade Empresária Limitada",
        "Sociedade Anônima",
      ],
      abrangencia_geografica: ["Nacional"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 12,
      faturamento_minimo: 360000,
      faturamento_maximo: 48000000,
      certidoes_exigidas: ["CND Federal", "FGTS", "CNDT"],
      areas_tematicas: [
        "Baterias elétricas",
        "Armazenamento de energia",
        "ESG",
      ],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Subvenção econômica direta para desenvolvimento de tecnologias nacionais de armazenamento e baterias elétricas sustentáveis.",
      status: "APROVADO",
      criado_em: "2026-10-09T10:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 88,
        classificacao: "ALTO",
      },
    },
    {
      titulo: "Programa Conectar Soluções ESG e Descarbonização Industrial",
      orgao_financiador: "BNDES",
      numero_edital: "03/2026",
      modalidade: "CREDITO",
      fonte_id: bndesId,
      data_publicacao: "2026-09-10",
      prazo_inscricao: "2026-10-17",
      data_resultado_prevista: "2026-12-15",
      valor_total_disponivel: 100000000,
      valor_maximo_por_projeto: 5000000,
      exige_contrapartida: true,
      percentual_contrapartida: 10,
      publico_alvo: ["Empresas industriais", "Cleantechs"],
      cnaes_aceitos: ["27.22-8", "38.39-4"],
      portes_aceitos: ["ME", "EPP", "MEDIA", "GRANDE"],
      natureza_juridica_aceita: ["Sociedade Empresária Limitada"],
      abrangencia_geografica: ["Brasil"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 24,
      faturamento_minimo: 500000,
      faturamento_maximo: 300000000,
      certidoes_exigidas: ["CND Federal", "Regularidade Ambiental"],
      areas_tematicas: ["Descarbonização", "Sustentabilidade", "Energia"],
      permite_submissao_multipla: true,
      resumo_executivo:
        "Financiamento a condições facilitadas para projetos de inovação focados em descarbonização de processos e soluções de energia limpa.",
      status: "ANALISADO",
      criado_em: "2026-10-10T14:30:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 92,
        classificacao: "ALTO",
      },
    },
    {
      titulo:
        "Chamada Pública Fomento Paraná — Energia Limpa e Sustentabilidade para PMEs",
      orgao_financiador: "Fomento Paraná",
      numero_edital: "05/2026",
      modalidade: "SUBVENCAO",
      fonte_id: fomentoId,
      data_publicacao: "2026-09-15",
      prazo_inscricao: "2026-10-14",
      data_resultado_prevista: "2026-11-20",
      valor_total_disponivel: 15000000,
      valor_maximo_por_projeto: 800000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Pequenas e médias empresas do Paraná"],
      cnaes_aceitos: ["27.22-8", "43.21-5"],
      portes_aceitos: ["ME", "EPP"],
      natureza_juridica_aceita: ["Sociedade Limitada"],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 12,
      faturamento_minimo: 100000,
      faturamento_maximo: 4800000,
      certidoes_exigidas: ["CND Estadual PR", "FGTS"],
      areas_tematicas: ["Energia solar", "Baterias", "Eficiência energética"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Apoio financeiro não reembolsável a pequenas empresas paranaenses com foco em produtos e serviços de eficiência energética.",
      status: "EM_REVISAO",
      criado_em: "2026-10-08T09:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 81,
        classificacao: "ALTO",
      },
    },
    {
      titulo:
        "Edital Copel P&D — Armazenamento de Energia e Baterias de Próxima Geração",
      orgao_financiador: "Copel",
      numero_edital: "02/2026",
      modalidade: "CHAMADA_PUBLICA",
      fonte_id: copelId,
      data_publicacao: "2026-09-20",
      prazo_inscricao: "2026-10-18",
      data_resultado_prevista: "2026-12-01",
      valor_total_disponivel: 25000000,
      valor_maximo_por_projeto: 2200000,
      exige_contrapartida: true,
      percentual_contrapartida: 20,
      publico_alvo: ["Empresas de tecnologia e startups"],
      cnaes_aceitos: ["27.22-8"],
      portes_aceitos: ["ME", "EPP", "MEDIA"],
      natureza_juridica_aceita: ["Sociedade Empresária Limitada"],
      abrangencia_geografica: ["Paraná", "Região Sul"],
      exige_ict_parceira: true,
      tempo_minimo_fundacao_meses: 18,
      faturamento_minimo: 200000,
      faturamento_maximo: 20000000,
      certidoes_exigidas: ["CND Federal", "CND Estadual"],
      areas_tematicas: ["Baterias elétricas", "Smart grid", "Armazenamento"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Desenvolvimento e validação em campo de sistemas de baterias para redes de distribuição elétrica no Paraná.",
      status: "EM_ANALISE",
      criado_em: "2026-10-11T08:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 79,
        classificacao: "ALTO",
      },
    },
    {
      titulo:
        "Chamada CNPq — Inovação Tecnológica em Descarbonização e Economia Circular",
      orgao_financiador: "CNPq",
      numero_edital: "12/2026",
      modalidade: "SUBVENCAO",
      fonte_id: cnpqId,
      data_publicacao: "2026-09-18",
      prazo_inscricao: "2026-10-25",
      data_resultado_prevista: "2026-12-10",
      valor_total_disponivel: 30000000,
      valor_maximo_por_projeto: 1200000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Empresas parceiras com pesquisadores"],
      cnaes_aceitos: ["27.22-8", "72.10-0"],
      portes_aceitos: ["ME", "EPP", "MEDIA"],
      natureza_juridica_aceita: ["Sociedade Limitada", "EIRELI"],
      abrangencia_geografica: ["Nacional"],
      exige_ict_parceira: true,
      tempo_minimo_fundacao_meses: 6,
      faturamento_minimo: 0,
      faturamento_maximo: 50000000,
      certidoes_exigidas: ["CND Federal"],
      areas_tematicas: ["Economia circular", "ESG", "Baterias"],
      permite_submissao_multipla: true,
      resumo_executivo:
        "Bolsas e recursos de custeio para projetos conjuntos de empresas inovadoras e grupos de pesquisa acadêmica.",
      status: "COLETADO",
      criado_em: "2026-10-06T11:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 85,
        classificacao: "ALTO",
      },
    },
    {
      titulo:
        "Programa Tecnova III — Apoio à Inovação em Micro e Pequenas Empresas",
      orgao_financiador: "Fundação Araucária",
      numero_edital: "08/2026",
      modalidade: "SUBVENCAO",
      fonte_id: araucariaId,
      data_publicacao: "2026-08-20",
      prazo_inscricao: "2026-11-05",
      data_resultado_prevista: "2026-12-20",
      valor_total_disponivel: 12000000,
      valor_maximo_por_projeto: 450000,
      exige_contrapartida: true,
      percentual_contrapartida: 10,
      publico_alvo: ["Microempresas e EPPs"],
      cnaes_aceitos: ["27.22-8", "62.01-5"],
      portes_aceitos: ["ME", "EPP"],
      natureza_juridica_aceita: ["Sociedade Empresária Limitada"],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 12,
      faturamento_minimo: 50000,
      faturamento_maximo: 4800000,
      certidoes_exigidas: ["CND Estadual", "CND Municipal"],
      areas_tematicas: ["Inovação", "Sustentabilidade", "Energia"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Subvenção econômica a micro e pequenas empresas do Paraná para introdução de produtos e processos inovadores no mercado.",
      status: "ANALISADO",
      criado_em: "2026-09-28T10:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 74,
        classificacao: "ALTO",
      },
    },
    {
      titulo:
        "Chamada Pública FINEP — Cidades Inteligentes e Mobilidade Elétrica",
      orgao_financiador: "FINEP",
      numero_edital: "04/2026",
      modalidade: "SUBVENCAO",
      fonte_id: finepId,
      data_publicacao: "2026-09-25",
      prazo_inscricao: "2026-11-20",
      data_resultado_prevista: "2027-01-15",
      valor_total_disponivel: 40000000,
      valor_maximo_por_projeto: 4000000,
      exige_contrapartida: true,
      percentual_contrapartida: 25,
      publico_alvo: ["Consórcios empresariais"],
      cnaes_aceitos: ["27.22-8", "29.45-0"],
      portes_aceitos: ["EPP", "MEDIA", "GRANDE"],
      natureza_juridica_aceita: ["Sociedade Limitada", "Sociedade Anônima"],
      abrangencia_geografica: ["Brasil"],
      exige_ict_parceira: true,
      tempo_minimo_fundacao_meses: 24,
      faturamento_minimo: 1000000,
      faturamento_maximo: 90000000,
      certidoes_exigidas: ["CND Federal", "FGTS"],
      areas_tematicas: ["Mobilidade elétrica", "Cidades inteligentes"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Financiamento não reembolsável para infraestrutura de recarga e soluções veiculares elétricas em centros urbanos.",
      status: "EM_REVISAO",
      criado_em: "2026-10-09T16:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "INDETERMINADO",
        nota_fit: 62,
        classificacao: "MEDIO",
      },
    },
    {
      titulo:
        "Licitação Copel — Aquisição de Painéis e Módulos Solares Fotovoltaicos",
      orgao_financiador: "Copel",
      numero_edital: "09/2026",
      modalidade: "LICITACAO",
      fonte_id: copelId,
      data_publicacao: "2026-09-28",
      prazo_inscricao: "2026-10-13",
      data_resultado_prevista: "2026-11-01",
      valor_total_disponivel: 1500000,
      valor_maximo_por_projeto: 750000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Fornecedores cadastrados"],
      cnaes_aceitos: ["43.21-5", "27.22-8"],
      portes_aceitos: ["ME", "EPP", "MEDIA", "GRANDE"],
      natureza_juridica_aceita: ["Qualquer"],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 12,
      faturamento_minimo: 200000,
      faturamento_maximo: null,
      certidoes_exigidas: ["CND Federal", "CND Estadual", "SICAF"],
      areas_tematicas: ["Energia solar", "Equipamentos elétricos"],
      permite_submissao_multipla: true,
      resumo_executivo:
        "Pregão eletrônico para aquisição de módulos solares e baterias de backup para subestações.",
      status: "ANALISADO",
      criado_em: "2026-10-07T12:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "INDETERMINADO",
        nota_fit: 55,
        classificacao: "MEDIO",
      },
    },
    {
      titulo: "Prêmio Paranaense de Inovação e Sustentabilidade 2026",
      orgao_financiador: "Fomento Paraná",
      numero_edital: "01/2026",
      modalidade: "PREMIO",
      fonte_id: fomentoId,
      data_publicacao: "2026-08-15",
      prazo_inscricao: "2026-11-30",
      data_resultado_prevista: "2026-12-18",
      valor_total_disponivel: 500000,
      valor_maximo_por_projeto: 100000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Empreendedores e startups"],
      cnaes_aceitos: [],
      portes_aceitos: ["MEI", "ME", "EPP"],
      natureza_juridica_aceita: [],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 6,
      faturamento_minimo: 0,
      faturamento_maximo: 4800000,
      certidoes_exigidas: [],
      areas_tematicas: ["ESG", "Inovação verde", "Educação"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Premiação financeira direta e reconhecimento de soluções inovadoras desenvolvidas no estado do Paraná.",
      status: "APROVADO",
      criado_em: "2026-09-15T15:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 48,
        classificacao: "MEDIO",
      },
    },
    {
      titulo:
        "Chamada Pública BNDES — Grandes Empreendimentos de Infraestrutura Fóssil",
      orgao_financiador: "BNDES",
      numero_edital: "07/2026",
      modalidade: "CREDITO",
      fonte_id: bndesId,
      data_publicacao: "2026-08-01",
      prazo_inscricao: "2026-12-15",
      data_resultado_prevista: "2027-02-28",
      valor_total_disponivel: 500000000,
      valor_maximo_por_projeto: 50000000,
      exige_contrapartida: true,
      percentual_contrapartida: 30,
      publico_alvo: ["Grandes mineradoras e refinarias"],
      cnaes_aceitos: ["19.21-7"],
      portes_aceitos: ["GRANDE"],
      natureza_juridica_aceita: ["Sociedade Anônima"],
      abrangencia_geografica: ["Brasil"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 60,
      faturamento_minimo: 100000000,
      faturamento_maximo: null,
      certidoes_exigidas: ["Todas"],
      areas_tematicas: ["Combustíveis fósseis", "Refino"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Crédito voltado exclusivamente para expansão de dutos e refino tradicional.",
      status: "DESCARTADO",
      criado_em: "2026-09-10T10:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "INELEGIVEL",
        nota_fit: 25,
        classificacao: "BAIXO",
      },
    },
    {
      titulo:
        "Edital CNPq — Bolsas de Pós-Doutorado Empresarial em Agronegócio",
      orgao_financiador: "CNPq",
      numero_edital: "15/2026",
      modalidade: "OUTRO",
      fonte_id: cnpqId,
      data_publicacao: "2026-09-12",
      prazo_inscricao: "2026-10-16",
      data_resultado_prevista: "2026-11-25",
      valor_total_disponivel: 5000000,
      valor_maximo_por_projeto: 300000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Empresas do agronegócio exportador"],
      cnaes_aceitos: ["01.11-3"],
      portes_aceitos: ["MEDIA", "GRANDE"],
      natureza_juridica_aceita: ["Sociedade Anônima"],
      abrangencia_geografica: ["Centro-Oeste"],
      exige_ict_parceira: true,
      tempo_minimo_fundacao_meses: 36,
      faturamento_minimo: 10000000,
      faturamento_maximo: null,
      certidoes_exigidas: ["CND Federal"],
      areas_tematicas: ["Soja", "Fertilizantes"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Inserção de doutores em indústrias de fertilizantes e defensivos agrícolas.",
      status: "DESCARTADO",
      criado_em: "2026-10-05T08:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "INELEGIVEL",
        nota_fit: 32,
        classificacao: "BAIXO",
      },
    },
    {
      titulo:
        "Chamada Fomento Paraná — Financiamento de Eficiência Energética Industrial",
      orgao_financiador: "Fomento Paraná",
      numero_edital: "11/2026",
      modalidade: "CREDITO",
      fonte_id: fomentoId,
      data_publicacao: "2026-09-05",
      prazo_inscricao: "2026-10-31",
      data_resultado_prevista: "2026-12-05",
      valor_total_disponivel: 20000000,
      valor_maximo_por_projeto: 1500000,
      exige_contrapartida: true,
      percentual_contrapartida: 10,
      publico_alvo: ["Indústrias de transformação"],
      cnaes_aceitos: ["27.22-8", "28.11-9"],
      portes_aceitos: ["ME", "EPP", "MEDIA"],
      natureza_juridica_aceita: ["Sociedade Limitada"],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 12,
      faturamento_minimo: 300000,
      faturamento_maximo: 30000000,
      certidoes_exigidas: ["CND Estadual"],
      areas_tematicas: ["Eficiência energética", "Baterias"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Linha de crédito para aquisição de bancos de baterias e redução de pico de consumo elétrico industrial.",
      status: "INSCRITO",
      criado_em: "2026-09-22T14:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 68,
        classificacao: "MEDIO",
      },
    },
    {
      titulo:
        "Edital Diário Oficial do PR — Apoio ao Desenvolvimento de Startups ESG",
      orgao_financiador: "Diário Oficial do PR",
      numero_edital: "03/2026",
      modalidade: "SUBVENCAO",
      fonte_id: diarioId,
      data_publicacao: "2026-08-01",
      prazo_inscricao: "2026-10-02",
      data_resultado_prevista: "2026-10-20",
      valor_total_disponivel: 2000000,
      valor_maximo_por_projeto: 250000,
      exige_contrapartida: false,
      percentual_contrapartida: 0,
      publico_alvo: ["Startups paranaenses"],
      cnaes_aceitos: ["27.22-8", "62.01-5"],
      portes_aceitos: ["MEI", "ME"],
      natureza_juridica_aceita: ["Sociedade Limitada"],
      abrangencia_geografica: ["Paraná"],
      exige_ict_parceira: false,
      tempo_minimo_fundacao_meses: 3,
      faturamento_minimo: 0,
      faturamento_maximo: 1000000,
      certidoes_exigidas: [],
      areas_tematicas: ["ESG", "Sustentabilidade"],
      permite_submissao_multipla: false,
      resumo_executivo:
        "Incentivo para validação de protótipos de startups com impacto socioambiental no Paraná.",
      status: "EXPIRADO",
      criado_em: "2026-08-30T10:00:00.000Z",
      avaliacao: {
        status_elegibilidade: "ELEGIVEL",
        nota_fit: 70,
        classificacao: "ALTO",
      },
    },
  ];

  for (const item of editais) {
    const { avaliacao, ...dadosEdital } = item;
    const editalCriado = repositorios.edital.inserir(dadosEdital);

    repositorios.avaliacao.inserir({
      id: novoId(),
      edital_id: editalCriado.id,
      status_elegibilidade: avaliacao.status_elegibilidade,
      nota_fit: avaliacao.nota_fit,
      classificacao: avaliacao.classificacao,
      criterios_violados:
        avaliacao.status_elegibilidade === "INELEGIVEL"
          ? [
              {
                criterio_id: "cnae_incompativel",
                nome: "CNAE incompatível",
                motivo:
                  "O edital restringe aos setores especificados não compatíveis com a empresa.",
                evidencia_id: null,
              },
            ]
          : null,
      criterios_indeterminados:
        avaliacao.status_elegibilidade === "INDETERMINADO"
          ? [
              {
                criterio_id: "documentacao_especifica",
                nome: "Exigência documental específica",
                campo_faltante: "certidoes_exigidas",
              },
            ]
          : null,
      detalhamento_pontuacao: [
        {
          criterio_id: "area_tematica",
          peso: 4,
          pontuacao: avaliacao.nota_fit > 70 ? 1 : 0.6,
          contribuicao: Math.round(avaliacao.nota_fit * 0.4),
        },
        {
          criterio_id: "porte_empresa",
          peso: 3,
          pontuacao: 1,
          contribuicao: Math.round(avaliacao.nota_fit * 0.3),
        },
        {
          criterio_id: "valor_projeto",
          peso: 3,
          pontuacao: 0.8,
          contribuicao: Math.round(avaliacao.nota_fit * 0.3),
        },
      ],
      nota_ajustada_manual: null,
      ajustada_por: null,
      perfil_atualizado_em: null,
    });
  }

  // Coletas executadas para painel de saúde (P02 / P08)
  const execucoes: {
    fonte_id: string;
    iniciada_em: string;
    finalizada_em: string;
    status: "SUCESSO" | "FALHA" | "PARCIAL";
    itens_coletados: number;
    mensagem_erro: string | null;
  }[] = [
    {
      fonte_id: finepId,
      iniciada_em: "2026-10-11T08:00:00.000Z",
      finalizada_em: "2026-10-11T08:02:15.000Z",
      status: "SUCESSO",
      itens_coletados: 4,
      mensagem_erro: null,
    },
    {
      fonte_id: bndesId,
      iniciada_em: "2026-10-10T09:30:00.000Z",
      finalizada_em: "2026-10-10T09:31:40.000Z",
      status: "SUCESSO",
      itens_coletados: 2,
      mensagem_erro: null,
    },
    {
      fonte_id: cnpqId,
      iniciada_em: "2026-10-11T10:15:00.000Z",
      finalizada_em: "2026-10-11T10:17:22.000Z",
      status: "SUCESSO",
      itens_coletados: 3,
      mensagem_erro: null,
    },
    {
      fonte_id: copelId,
      iniciada_em: "2026-10-11T07:00:00.000Z",
      finalizada_em: "2026-10-11T07:00:10.000Z",
      status: "FALHA",
      itens_coletados: 0,
      mensagem_erro:
        "Erro 503: Serviço indisponível temporariamente no portal Copel.",
    },
    {
      fonte_id: fomentoId,
      iniciada_em: "2026-10-09T14:00:00.000Z",
      finalizada_em: "2026-10-09T14:03:05.000Z",
      status: "PARCIAL",
      itens_coletados: 2,
      mensagem_erro: "Timeout ao baixar anexo em 1 dos 3 editais localizados.",
    },
    {
      fonte_id: araucariaId,
      iniciada_em: "2026-10-08T11:00:00.000Z",
      finalizada_em: "2026-10-08T11:01:30.000Z",
      status: "SUCESSO",
      itens_coletados: 1,
      mensagem_erro: null,
    },
  ];

  for (const ex of execucoes) {
    repositorios.coletaExecucao.inserir({
      id: novoId(),
      ...ex,
    });
    repositorios.fonte.atualizar(ex.fonte_id, {
      ultima_coleta_em: ex.finalizada_em,
      ultimo_status: ex.status,
      ultima_mensagem_erro: ex.mensagem_erro,
    });
  }
}
