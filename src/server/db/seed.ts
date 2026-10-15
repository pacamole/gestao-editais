import { fontesIniciais } from "../coleta/fontes.js";
import { CRITERIOS_PADRAO } from "../dominio/criteriosPadrao.js";
import {
  PARAMETROS_PADRAO,
  TIPOS_NOTIFICACAO,
} from "../notificacao/parametros.js";
import { repositorios } from "../repositorios/index.js";
import { transacao } from "./index.js";

// Dados iniciais. Roda sobre um banco recém-criado (ver reset.ts).
// Sem usuários: o primeiro entra por "Criar conta" no login.
export function semear() {
  const { fonte, perfilEmpresa, configAlerta, config } = repositorios;

  transacao(() => {
    for (const dados of fontesIniciais) fonte.inserir(dados);

    // Perfil da empresa: valores provisórios até o parceiro responder (§14, perguntas 1 e 8-10).
    perfilEmpresa.inserir({
      id: 1,
      razao_social: "I9+ Consultoria e Inovação",
      nome_fantasia: "I9+",
      cnpj: "00.000.000/0000-00",
      cnae_principal: "5821-1/00",
      cnaes_secundarios: ["6201-5/00", "7210-0/00"],
      porte: "ME",
      natureza_juridica: "Sociedade Empresária Limitada",
      data_fundacao: "2020-01-01",
      faturamento_anual: 4200000,
      uf: "PR",
      municipio: "Curitiba",
      areas_atuacao: [
        "ESG",
        "Sustentabilidade",
        "Inovação",
        "Energia",
        "Descarbonização",
      ],
      palavras_chave: [
        "ESG",
        "sustentabilidade",
        "inovação",
        "energia",
        "descarbonização",
        "clima",
      ],
      possui_ict_parceira: false,
      certidoes_disponiveis: ["CND", "FGTS", "CRLV"],
      capacidade_contrapartida_percentual: 30,
      valor_minimo_interesse: 500000,
      prazo_minimo_preparo_dias: 30,
    });

    // Configurações de alerta (P09) com os defaults da especificação.
    for (const tipo of TIPOS_NOTIFICACAO)
      configAlerta.inserir({ tipo, parametros: PARAMETROS_PADRAO[tipo] });

    if (repositorios.criterio.contar() === 0) {
      for (const criterio of CRITERIOS_PADRAO) repositorios.criterio.inserir(criterio);
    }

    // Limite diário de perguntas no chat por usuário (CH07).
    config.definir("chat_limite_diario", "20");
  });
}
