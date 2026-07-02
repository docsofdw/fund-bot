// Convert GitHub-flavored / standard markdown (as emitted by the LLM) into
// Slack "mrkdwn" so FundBot answers render correctly in Slack instead of
// showing literal asterisks, raw [text](url) links, and `#` headers.
//
// Slack mrkdwn differs from standard markdown:
//   - bold:    **text** / __text__   ->  *text*
//   - italic:  *text* / _text_       ->  _text_
//   - link:    [text](url)           ->  <url|text>
//   - header:  # / ## / ### text     ->  *text*  (Slack has no headers)
//   - bullet:  - item / * item       ->  • item
//
// Inline code (`x`) and fenced code blocks (```...```) are left untouched so
// their contents (which may legitimately contain *, _, #, etc.) are preserved.
//
// We chose a focused hand-rolled converter over the `slackify-markdown` npm
// package: that package is ESM-only at its current major (the project is
// CommonJS / Vercel serverless) and even its CommonJS release injects
// zero-width spaces around bold and extra padding into bullets, which would
// corrupt FundBot's exact numbers (e.g. "*121,086,240 shares*"). This
// converter produces clean, predictable output.

// Matches a Markdown table separator row, e.g. "|---|:--:|---|" or
// "--- | ---" (outer pipes optional). Requires at least two columns.
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

// Matches a "numeric-ish" cell: optional ~ $ + - prefix, digits/commas, an
// optional decimal, and an optional trailing %. Used to right-align columns
// that hold only numbers (dollar/percent figures read better right-aligned).
const NUMERIC_CELL = /^[~$+-]?[\d,]+(\.\d+)?%?$/;

// Strip inline emphasis markers from a table cell so they don't show up
// literally inside the monospace code block (e.g. "_(2nd line)_" -> "(2nd
// line)"). Paired markers are removed longest-first so "**" isn't mistaken
// for two "*".
function stripCellEmphasis(cell: string): string {
  return cell
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1');
}

// Split a table row into trimmed cells, dropping the empty first/last cell
// produced by leading/trailing pipes (but keeping genuinely empty interior
// cells).
function parseTableRow(row: string): string[] {
  const cells = row.split('|');
  if (cells.length > 1 && cells[0].trim() === '') cells.shift();
  if (cells.length > 1 && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => stripCellEmphasis(c.trim()));
}

// Render a detected Markdown pipe table (header row + body rows, the separator
// row already consumed) as a fixed-width, column-aligned plain-text table
// wrapped in a fenced code block. Slack renders fenced blocks in monospace and
// preserves whitespace, so the columns stay aligned.
function formatTable(headerRow: string, bodyRows: string[]): string {
  const header = parseTableRow(headerRow);
  const body = bodyRows.map(parseTableRow);
  const numCols = Math.max(header.length, ...body.map((r) => r.length));

  const cellAt = (row: string[], col: number): string => row[col] ?? '';

  const widths: number[] = [];
  const rightAlign: boolean[] = [];
  for (let col = 0; col < numCols; col++) {
    let width = cellAt(header, col).length;
    const bodyCells = body.map((r) => cellAt(r, col));
    for (const c of bodyCells) width = Math.max(width, c.length);
    widths.push(width);
    const nonEmpty = bodyCells.filter((c) => c !== '');
    rightAlign.push(nonEmpty.length > 0 && nonEmpty.every((c) => NUMERIC_CELL.test(c)));
  }

  const SEP = ' │ ';
  const pad = (row: string[]): string =>
    widths
      .map((w, col) => {
        const cell = cellAt(row, col);
        return rightAlign[col] ? cell.padStart(w) : cell.padEnd(w);
      })
      .join(SEP);

  const divider = widths.map((w) => '─'.repeat(w)).join('─┼─');
  const lines = [pad(header), divider, ...body.map(pad)];
  return '```\n' + lines.join('\n') + '\n```';
}

// Detect Markdown pipe tables in `text` and replace each with a fenced,
// column-aligned code block (via `stash`, so the block is protected from the
// bold/bullet/link passes that run afterwards). Pre-existing fenced/inline
// code has already been stashed by the caller, so tables inside code are never
// touched here.
function convertPipeTables(text: string, stash: (block: string) => string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const header = lines[i];
    const separator = lines[i + 1];
    const isTable =
      header !== undefined &&
      header.includes('|') &&
      separator !== undefined &&
      TABLE_SEPARATOR.test(separator);
    if (isTable) {
      const bodyRows: string[] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
        bodyRows.push(lines[j]);
        j++;
      }
      out.push(stash(formatTable(header, bodyRows)));
      i = j;
    } else {
      out.push(header);
      i++;
    }
  }
  return out.join('\n');
}

/**
 * Convert markdown text to Slack mrkdwn.
 *
 * Order of operations matters: bold (`**`/`__`) is converted before italic
 * (`*`/`_`) so the single-character italic rules don't clobber bold markers.
 * Bold output and code spans/blocks are stashed behind tokens while the rest
 * of the text is rewritten, then restored at the end, so nothing inside them
 * is altered.
 */
export function toSlackMrkdwn(text: string): string {
  if (!text) return text;

  // Placeholders use a private-use sentinel char (U+E000) as their delimiter
  // rather than spaces. A sentinel never appears in real text and is not
  // touched by any pass below (it is not a space/tab, `*`, `_`, `#`, `-`, or a
  // word char), so a token survives intact even when it ends up as the sole
  // content of a header or bullet line — whose regexes strip surrounding
  // whitespace and would otherwise orphan a space-delimited token, leaking it
  // verbatim to Slack. Carrying no spaces also means the original text spacing
  // around the stashed run is preserved as-is.
  const SENT = '\uE000';
  const codeStore: string[] = [];
  const boldStore: string[] = [];

  // 1. Protect fenced code blocks and inline code from any conversion.
  const stashCode = (match: string): string => {
    const token = `${SENT}C${codeStore.length}${SENT}`;
    codeStore.push(match);
    return token;
  };

  let out = text
    // Fenced blocks first (```...```), including the language hint line.
    .replace(/```[\s\S]*?```/g, stashCode)
    // Then inline code spans (`...`).
    .replace(/`[^`\n]*`/g, stashCode);

  // 1b. Markdown pipe tables -> aligned fenced code block. Runs after code is
  //     stashed (so tables already inside code are left alone) and stashes its
  //     own output as a code block, so the bold/bullet/link passes below never
  //     run inside the rendered table.
  out = convertPipeTables(out, stashCode);

  // 2. Bold: **text** or __text__ -> *text*. Stash the result behind a token
  //    so the single-char italic pass below can't re-rewrite the Slack bold
  //    markers (which are also single asterisks) into underscores.
  const stashBold = (_m: string, inner: string): string => {
    const token = `${SENT}B${boldStore.length}${SENT}`;
    boldStore.push(`*${inner}*`);
    return token;
  };
  out = out
    .replace(/\*\*([^\n]+?)\*\*/g, stashBold)
    .replace(/__([^\n]+?)__/g, stashBold);

  // 3. Italic: *text* -> _text_ (only standard-markdown single asterisks
  //    remain at this point — bold is stashed) and _text_ stays _text_.
  //    Require non-space immediately inside the markers so we don't match
  //    stray asterisks.
  out = out.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])/g, '$1_$2_');

  // 4. Links: [text](url) -> <url|text>.
  out = out.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<$2|$1>');

  // 5. Headers: leading #, ##, ### ... -> bold line.
  out = out.replace(/^[ \t]*#{1,6}[ \t]+(.+?)[ \t]*$/gm, '*$1*');

  // 6. Bullets: leading "- " or "* " (with optional indentation) -> "• ".
  out = out.replace(/^([ \t]*)[-*][ \t]+/gm, '$1• ');

  // 7. Restore stashed bold (as Slack *bold*).
  out = out.replace(
    new RegExp(`${SENT}B(\\d+)${SENT}`, 'g'),
    (_m, i) => boldStore[Number(i)]
  );

  // 8. A header (or bullet) whose entire text was bold restored to *(*text*)*.
  //    Collapse that redundant double bold to a single *text*. Run this BEFORE
  //    code is restored so it can never touch a literal ** inside a code span.
  out = out.replace(/\*(\*[^*\n]+\*)\*/g, '$1');

  // 9. Restore protected code spans/blocks last, verbatim.
  out = out.replace(
    new RegExp(`${SENT}C(\\d+)${SENT}`, 'g'),
    (_m, i) => codeStore[Number(i)]
  );

  return out;
}
