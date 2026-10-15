import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";
import { extrairPdf } from "./pdf.js";

const LIMITE_BYTES = 5 * 1024 * 1024;
const LIMITE_CARACTERES = 100_000;
const MAXIMO_REDIRECIONAMENTOS = 5;
type ResolverPublico = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<{ address: string; family: number }[]>;

export type ConteudoPagina = {
  titulo: string | null;
  texto: string;
};

function ipv4Publico(endereco: string): boolean {
  const partes = endereco.split(".").map(Number);
  if (
    partes.length !== 4 ||
    partes.some((parte) => !Number.isInteger(parte) || parte < 0 || parte > 255)
  )
    return false;
  const [a, b, c] = partes;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function enderecoPublico(endereco: string): boolean {
  const tipo = isIP(endereco);
  if (tipo === 4) return ipv4Publico(endereco);
  if (tipo === 6) {
    const normalizado = endereco.toLowerCase();
    return (
      /^[23][0-9a-f]{0,3}:/.test(normalizado) &&
      !normalizado.startsWith("2001:db8:")
    );
  }
  return false;
}

async function validarDestino(
  url: URL,
  resolver: ResolverPublico,
): Promise<void> {
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Informe uma URL pública HTTP ou HTTPS, sem credenciais embutidas.",
    );
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error(
      "A leitura aceita somente páginas hospedadas em endereços públicos.",
    );
  }
  if (isIP(hostname)) {
    if (!enderecoPublico(hostname))
      throw new Error(
        "A leitura aceita somente páginas hospedadas em endereços públicos.",
      );
    return;
  }

  let enderecos: { address: string; family: number }[];
  try {
    enderecos = await resolver(hostname, { all: true, verbatim: true });
  } catch (erro) {
    throw new Error(
      `Não foi possível localizar o servidor da página (${hostname}).`,
      { cause: erro },
    );
  }
  if (
    !enderecos.length ||
    enderecos.some(({ address }) => !enderecoPublico(address))
  ) {
    throw new Error(
      "A leitura aceita somente páginas hospedadas em endereços públicos.",
    );
  }
}

async function lerResposta(resposta: Response): Promise<Uint8Array> {
  const comprimento = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(comprimento) && comprimento > LIMITE_BYTES)
    throw new Error("A página excede o limite de 5 MB.");
  const leitor = resposta.body?.getReader();
  if (!leitor) throw new Error("A página respondeu sem conteúdo.");
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const parte = await leitor.read();
      if (parte.done) break;
      tamanho += parte.value.length;
      if (tamanho > LIMITE_BYTES)
        throw new Error("A página excede o limite de 5 MB.");
      partes.push(parte.value);
    }
  } finally {
    await leitor.cancel();
  }
  return Buffer.concat(partes);
}

function textoHtml(html: string): ConteudoPagina {
  const $ = load(html);
  $(
    'script,style,nav,header,footer,noscript,iframe,svg,form,button,aside,[role="navigation"],[role="banner"],[role="contentinfo"]',
  ).remove();
  const titulo =
    $("title").first().text().replace(/\s+/g, " ").trim() ||
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    null;
  const principal = $('main,article,[role="main"]').first();
  const raiz = principal.length ? principal : $("body");
  const blocos: string[] = [];
  raiz.find("h1,h2,h3,h4,p,li,td,th").each((_, elemento) => {
    const bloco = $(elemento).text().replace(/\s+/g, " ").trim();
    if (bloco && bloco.length > 2 && blocos.at(-1) !== bloco)
      blocos.push(bloco);
  });
  if (!blocos.length) {
    const texto = raiz.text().replace(/\s+/g, " ").trim();
    if (texto) blocos.push(texto);
  }
  const conteudo = [titulo, ...blocos]
    .filter(Boolean)
    .join("\n")
    .slice(0, LIMITE_CARACTERES)
    .trim();
  if (conteudo.length < 80)
    throw new Error(
      "A página não contém texto suficiente para consultar. Confira o link ou envie o PDF do edital.",
    );
  return { titulo, texto: conteudo };
}

export async function lerPaginaPublica(
  endereco: string,
  fazerFetch: typeof fetch = fetch,
  resolver: ResolverPublico = lookup,
): Promise<ConteudoPagina> {
  let url: URL;
  try {
    url = new URL(endereco);
  } catch {
    throw new Error("O endereço cadastrado não é uma URL válida.");
  }

  let resposta: Response | undefined;
  for (
    let redirecionamentos = 0;
    redirecionamentos <= MAXIMO_REDIRECIONAMENTOS;
    redirecionamentos++
  ) {
    await validarDestino(url, resolver);
    resposta = await fazerFetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "User-Agent": "GestaoEditais/0.1 (leitura de edital público)",
        Accept: "text/html,application/xhtml+xml,application/pdf",
      },
    });
    if (resposta.status < 300 || resposta.status >= 400) break;
    const local = resposta.headers.get("location");
    if (!local)
      throw new Error(
        `A página respondeu com redirecionamento HTTP ${resposta.status} sem destino.`,
      );
    if (redirecionamentos === MAXIMO_REDIRECIONAMENTOS)
      throw new Error("A página excedeu o limite de redirecionamentos.");
    url = new URL(local, url);
  }

  if (!resposta?.ok)
    throw new Error(
      `Não foi possível ler a página (HTTP ${resposta?.status ?? "desconhecido"}).`,
    );
  const tipo = resposta.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (
    tipo !== "text/html" &&
    tipo !== "application/xhtml+xml" &&
    tipo !== "application/pdf"
  ) {
    throw new Error("O endereço não retornou uma página HTML nem um PDF.");
  }
  const bytes = await lerResposta(resposta);
  if (tipo === "application/pdf") {
    const pdf = await extrairPdf(bytes);
    if (!pdf.paginas.some((pagina) => pagina.texto.trim())) {
      throw new Error(
        "O PDF vinculado não tem texto selecionável. Aplique OCR e envie o arquivo novamente.",
      );
    }
    return { titulo: null, texto: pdf.texto };
  }

  const pagina = textoHtml(Buffer.from(bytes).toString("utf8"));
  return {
    titulo: pagina.titulo,
    texto: `[Fonte URL: ${url.href}]\n${pagina.texto}`,
  };
}
