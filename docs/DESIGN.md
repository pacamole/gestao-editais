# Guia visual

Protótipo das telas: <https://claude.ai/artifact/LDXd1jRXmUK2HTLwBnKxkQ>. As telas usam
exatamente as classes abaixo, então dá para inspecionar o protótipo e copiar a marcação.

Os estilos ficam em `src/client/styles/`:

| Arquivo | Conteúdo |
| --- | --- |
| `tokens.css` | Cores, fontes, espaçamentos e raios (variáveis CSS). **Única fonte de cor.** |
| `base.css` | Reset, tipografia padrão e utilitários de layout |
| `components.css` | Classes de componentes |

Já são importados em `main.tsx`. Não crie arquivos CSS por página: se faltar algo, adicione ao
`components.css` e documente aqui.

## Regras

- Nenhum hexadecimal solto no JSX nem no CSS novo: use `var(--token)`.
- Cor nunca aparece sozinha: selos de elegibilidade levam ícone e texto.
- Números, valores, datas e notas usam `.mono` (ou vêm dentro de um componente que já usa).
- `h1` é o título da página (serifado), um por página, dentro de `.pagina-cabecalho`.
- Botões são `<button>`, navegação é `<Link>`/`<a>`. Botão só com ícone leva `aria-label`.
- Interface em português do Brasil (RNF17).

## Tipografia

| Família | Uso |
| --- | --- |
| Newsreader (`--fonte-titulo`) | `h1`, selos do veredito, trechos de evidência |
| IBM Plex Sans (`--fonte-texto`) | Todo o resto da interface |
| IBM Plex Mono (`--fonte-mono`) | Notas, valores em R$, datas, contagens |

## Estrutura de página

```tsx
<section>
  <header className="pagina-cabecalho">
    <div>
      <h1>Editais</h1>
      <p>38 editais · ordenados por elegibilidade, fit e prazo</p>
    </div>
    <div className="linha">
      <button className="btn">Exportar CSV</button>
      <Link className="btn btn--primario" to="/editais/novo">Nova entrada</Link>
    </div>
  </header>

  <div className="pilha">…</div>
</section>
```

Utilitários de layout: `.pilha` (coluna com espaço, `--sm`/`--lg`), `.linha` (fila,
`.linha--entre`), `.grade-2`/`.grade-3`/`.grade-4`, `.suave`, `.discreto`, `.mono`, `.truncar`,
`.sobretitulo`, `.sr-only`.

## Componentes

### Cartão

```tsx
<section className="card">
  <div className="card__cabecalho"><h2>Editais urgentes</h2></div>
  <div className="card__corpo">…</div>        {/* ou .card__corpo--justo para tabela */}
  <div className="card__rodape">…botões…</div>
</section>
```

Contador do dashboard: `<Link className="contador" to="…"><span className="contador__rotulo">…</span><span className="contador__valor">12</span></Link>`. `.contador--alerta` pinta o número de vermelho.

### Botões

`.btn` + variante: `--primario`, `--sucesso` (Aprovar), `--perigo` (Descartar), `--fantasma`.
Tamanhos: `--sm`, `--icone` (quadrado, precisa de `aria-label`).

### Selos e indicadores

Mapeie os enums do banco direto para a classe (valor em minúsculas):

| Dado | Marcação |
| --- | --- |
| Elegibilidade | `<span className="badge badge--elegivel">` · `--inelegivel` · `--indeterminado` (sempre com ícone ✓ ✕ ?) |
| Modalidade | `<span className="badge badge--modalidade">Subvenção</span>` |
| Status do edital | `<span className={`status status--${status.toLowerCase()}`}>` → `status--em_analise`, `status--aprovado`… |
| Nota de fit | `<span className="fit fit--alto"><span className="fit__nota">75</span><span className="fit__barra" style={{ '--fit': 75 }} /></span>` — `fit--alto` ≥ 70, `--medio` 40–69, `--baixo` < 40, `--vazio` sem nota (mostre "—") |
| Prazo | `<span className="prazo prazo--urgente"><span className="prazo__data">03/10/2026</span><span className="prazo__restante">5 dias</span></span>` — `--urgente` quando ≤ 7 dias |
| Saúde da fonte | `<span className="saude saude--sucesso">FINEP</span>` · `--parcial` · `--falha` |
| Listas (CNAEs, áreas…) | `<span className="etiquetas"><span className="etiqueta">ME</span>…</span>` |

Os textos dos rótulos vêm de `src/shared/rotulos.ts` (`STATUS_EDITAL`, `ELEGIBILIDADE`, `MODALIDADES`, `CLASSIFICACAO`).

Em TypeScript, variável CSS no `style` precisa de cast: `style={{ '--fit': 75 } as React.CSSProperties}`.

### Tabela

```tsx
<table className="tabela">
  <thead><tr><th>Título</th><th className="tabela__num">Valor</th></tr></thead>
  <tbody>
    <tr>
      <td className="tabela__titulo"><Link to={`/editais/${id}`}>{titulo}</Link></td>
      <td className="tabela__num">R$ 1.500.000</td>
    </tr>
  </tbody>
</table>
```

Acima da tabela: `.filtros` (campos lado a lado; `.campo--busca` estica) e `.lote` (barra de
ações em lote). Abaixo: `.paginacao`. `.tabela__selecao` para a coluna de checkbox.

### Formulários

```tsx
<div className="campo">
  <label htmlFor="cnpj">CNPJ</label>
  <input id="cnpj" className="input" aria-invalid={!!erro} />
  {erro ? <span className="campo__erro">{erro}</span> : <span className="campo__ajuda">Só números</span>}
</div>
```

`.input`, `.select`, `.textarea`. Checkbox com texto: `<label className="checkbox"><input type="checkbox" />Texto</label>`.
Ativo/inativo: `<input type="checkbox" className="interruptor" aria-label="Ativo" />`.
Upload: `<label className="soltar-arquivo">` (`--ativo` enquanto arrasta).

### Abas

`<div className="abas" role="tablist"><button className="aba" role="tab" aria-selected={ativa}>…</button></div>` — o estilo da aba ativa vem de `aria-selected="true"`.

### Mensagens

`.aviso` (informação, azul), `--sucesso`, `--atencao`, `--erro`. Use `role="alert"` em erros.
Estado vazio: `<div className="vazio">Nenhum edital com esses filtros.</div>`.

### Detalhe do edital (P04)

| Bloco | Classes |
| --- | --- |
| Contagem regressiva | `.contagem` (`--urgente`) com `<strong>` no número |
| Veredito | `.veredito` > `.selo.selo--elegivel` (`__icone`, `__rotulo`, `__nota`) + conteúdo |
| Critérios violados / indeterminados | `ul.pendencias` > `li.pendencia` |
| Peso de critério | `.peso` > `.peso__barra` com `style={{ '--peso': percentual }}` |
| Evidência | `blockquote.evidencia` > `p.evidencia__trecho` + `p.evidencia__origem` (as aspas são automáticas) |
| Botão de evidência | `button.btn-evidencia` com `aria-expanded` |
| Campo nulo | `<td className="nao-localizado">Não localizado no documento</td>` |
| Linha do tempo | `ol.linha-tempo` > `li` + `.linha-tempo__quando` |
| Chat | `.card.chat` > `.chat__mensagens` (`.msg.msg--usuario` / `.msg--assistente`, citação em `.msg__citacao`), `.chat__sugestoes`, `form.chat__entrada`, `.chat__cota` |

### Estrutura e login

`AppLayout` já usa `.app`, `.app-menu` e `.app-conteudo`. O login (P01) usa `.login` >
`aside.login__lado` + `form.login__form`, como no protótipo.
