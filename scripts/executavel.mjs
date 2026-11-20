// Gera o executável do sistema em que roda: dist/gestao-editais.exe no Windows, dist/gestao-editais no Linux.
// O servidor num arquivo só (esbuild) injetado numa cópia do node (Node SEA), com o front-end, o
// db/schema.sql e o binário do libsql embutidos. Roda depois do vite build, que gera dist/client.
// Para o Linux, gere numa máquina Linux (WSL, VM ou o próprio servidor). Quem usa não precisa instalar nada.
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parseEnv } from 'node:util'

// Pacote do binário do libsql para este sistema (o mesmo nome que o libsql procura).
function pacoteLibsql() {
  const { platform, arch } = process
  if (platform === 'win32' && arch === 'x64') return '@libsql/win32-x64-msvc'
  if (platform === 'linux' && (arch === 'x64' || arch === 'arm64')) {
    const glibc = Boolean(process.report?.getReport().header.glibcVersionRuntime)
    return `@libsql/linux-${arch}-${glibc ? 'gnu' : 'musl'}`
  }
  console.error(`O executável é gerado só no Windows x64 e no Linux x64/arm64 (este é ${platform}-${arch}).`)
  process.exit(1)
}

const require = createRequire(import.meta.url)
const binarioLibsql = pacoteLibsql()
const pastaTemp = 'dist/exe'
const executavel = process.platform === 'win32' ? 'dist/gestao-editais.exe' : 'dist/gestao-editais'
const servidor = path.join(pastaTemp, 'servidor.cjs')
const blob = path.join(pastaTemp, 'servidor.blob')
const configSea = path.join(pastaTemp, 'sea-config.json')

fs.rmSync(pastaTemp, { recursive: true, force: true })
fs.mkdirSync(pastaTemp, { recursive: true })

// O libsql carrega o binário com require(`@libsql/${target}`), que não existe dentro do .exe:
// passa a carregar o libsql.node extraído em pastaRecursos (src/server/config/executavel.ts).
const libsqlNativo = {
  name: 'libsql-nativo',
  setup(build) {
    build.onLoad({ filter: /[\\/]node_modules[\\/]libsql[\\/]index\.js$/ }, (args) => {
      const fonte = fs.readFileSync(args.path, 'utf8')
      const trocada = fonte.replace('return require(`@libsql/${target}`);', 'return require("libsql-nativo");')
      if (trocada === fonte) throw new Error('O libsql mudou o jeito de carregar o binário: ajuste o plugin libsql-nativo.')
      return { contents: trocada, loader: 'js', resolveDir: path.dirname(args.path) }
    })
    build.onResolve({ filter: /^libsql-nativo$/ }, () => ({ path: 'libsql-nativo', namespace: 'libsql-nativo' }))
    build.onLoad({ filter: /.*/, namespace: 'libsql-nativo' }, () => ({
      contents: `
        const { pastaRecursos } = require(${JSON.stringify(path.resolve('src/server/config/executavel.ts'))});
        const modulo = { exports: {} };
        process.dlopen(modulo, require("node:path").join(pastaRecursos, "libsql.node"));
        module.exports = modulo.exports;`,
      loader: 'js',
      resolveDir: process.cwd(),
    }))
  },
}

function lerEnvPath() {
  if (!fs.existsSync('.env')) return ''
  return parseEnv(fs.readFileSync('.env', 'utf8')).ENV_PATH?.trim() ?? ''
}

// CommonJS: o Node SEA não roda ESM. vite (só em dev) e playwright ficam de fora do arquivo único:
// o playwright-core vai embutido como arquivos e é carregado da pasta extraída (integracoes/navegador.ts).
await build({
  entryPoints: ['src/server/index.ts'],
  outfile: servidor,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['vite', 'playwright'],
  // ENV_PATH do .env do projeto: onde o .exe vai procurar o .env no servidor (vazio: pasta do usuário).
  define: { 'import.meta.url': 'importMetaUrl', __ENV_PATH__: JSON.stringify(lerEnvPath()) },
  banner: { js: 'const importMetaUrl = require("node:url").pathToFileURL(__filename).href;' },
  plugins: [libsqlNativo],
  logLevel: 'error',
})

// Arquivos embutidos, pelo caminho em que são extraídos (o mesmo do projeto, para paths.ts).
const assets = {
  'db/schema.sql': 'db/schema.sql',
  'libsql.node': createRequire(require.resolve('libsql')).resolve(binarioLibsql),
}
for (const arquivo of fs.readdirSync('dist/client', { recursive: true })) {
  const caminho = path.join('dist/client', arquivo)
  if (fs.statSync(caminho).isFile()) assets[caminho.replaceAll('\\', '/')] = caminho
}

const playwrightCore = path.dirname(require.resolve('playwright-core/package.json'))
for (const arquivo of fs.readdirSync(playwrightCore, { recursive: true })) {
  const caminho = path.join(playwrightCore, arquivo)
  if (fs.statSync(caminho).isFile()) assets[`node_modules/playwright-core/${arquivo.replaceAll(path.sep, '/')}`] = caminho
}

fs.writeFileSync(
  configSea,
  JSON.stringify({
    main: servidor,
    output: blob,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false,
    execArgv: ['--disable-warning=ExperimentalWarning'],
    assets,
  }),
)
execFileSync(process.execPath, ['--experimental-sea-config', configSea], { stdio: 'inherit' })

fs.copyFileSync(process.execPath, executavel)
fs.chmodSync(executavel, 0o755)
execFileSync(
  process.execPath,
  [
    require.resolve('postject/dist/cli.js'),
    executavel,
    'NODE_SEA_BLOB',
    blob,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ],
  { stdio: 'inherit' },
)

console.log(`executável gerado em ${executavel}`)
