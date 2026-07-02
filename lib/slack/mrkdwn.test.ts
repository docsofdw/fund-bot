import { test, expect, describe } from 'bun:test';
import { toSlackMrkdwn } from './mrkdwn';

describe('toSlackMrkdwn', () => {
  test('converts **bold** to *bold* (preserving numbers verbatim)', () => {
    expect(toSlackMrkdwn('**121,086,240 shares**')).toBe('*121,086,240 shares*');
  });

  test('real broken example: bold figures render via single asterisks', () => {
    const input =
      'The fund holds **121,086,240 shares** of Moon Inc (1723), valued at **$14,205,603**';
    const expected =
      'The fund holds *121,086,240 shares* of Moon Inc (1723), valued at *$14,205,603*';
    expect(toSlackMrkdwn(input)).toBe(expected);
  });

  test('converts __bold__ to *bold*', () => {
    expect(toSlackMrkdwn('__strong__')).toBe('*strong*');
  });

  test('converts markdown links to <url|text>', () => {
    expect(toSlackMrkdwn('see [Moon Inc](https://example.com/moon)')).toBe(
      'see <https://example.com/moon|Moon Inc>'
    );
  });

  test('converts ## Heading to *Heading*', () => {
    expect(toSlackMrkdwn('## Portfolio Summary')).toBe('*Portfolio Summary*');
  });

  test('converts #, ##, ### headers', () => {
    expect(toSlackMrkdwn('# H1')).toBe('*H1*');
    expect(toSlackMrkdwn('### H3')).toBe('*H3*');
  });

  test('converts "- item" bullets to "• item"', () => {
    expect(toSlackMrkdwn('- item')).toBe('• item');
  });

  test('converts "* item" bullets to "• item"', () => {
    expect(toSlackMrkdwn('* item')).toBe('• item');
  });

  test('converts a multi-line bullet list', () => {
    const input = '- one\n- two\n- three';
    expect(toSlackMrkdwn(input)).toBe('• one\n• two\n• three');
  });

  test('converts *italic* to _italic_', () => {
    expect(toSlackMrkdwn('this is *important* today')).toBe(
      'this is _important_ today'
    );
  });

  test('leaves _italic_ as _italic_', () => {
    expect(toSlackMrkdwn('this is _important_ today')).toBe(
      'this is _important_ today'
    );
  });

  test('does not let italic clobber bold', () => {
    expect(toSlackMrkdwn('**bold** and *italic*')).toBe('*bold* and _italic_');
  });

  test('preserves inline code untouched', () => {
    expect(toSlackMrkdwn('run `npm **install** test`')).toBe(
      'run `npm **install** test`'
    );
  });

  test('preserves fenced code blocks untouched', () => {
    const input = 'before\n```\nx = **not bold**\n# not a header\n- not a bullet\n```\nafter';
    expect(toSlackMrkdwn(input)).toBe(input);
  });

  test('converts markdown outside but preserves code inside the same string', () => {
    const input = 'Use **bold** then `**raw**`';
    expect(toSlackMrkdwn(input)).toBe('Use *bold* then `**raw**`');
  });

  test('leaves plain text unchanged', () => {
    const input = 'The fund holds 121,086,240 shares of Moon Inc (1723).';
    expect(toSlackMrkdwn(input)).toBe(input);
  });

  test('leaves the as-of footer intact', () => {
    const footer = '_(as of 4:00 PM ET · 210k terminal)_';
    expect(toSlackMrkdwn(footer)).toBe(footer);
  });

  test('output bold uses single asterisks, never doubled **', () => {
    const out = toSlackMrkdwn('**bold** and **more**');
    expect(out).toBe('*bold* and *more*');
    expect(out).not.toContain('**');
  });

  test('leaves an already-Slack link untouched (partial pre-formatting)', () => {
    const input = 'see <https://x.co/a|link> for **details**';
    expect(toSlackMrkdwn(input)).toBe('see <https://x.co/a|link> for *details*');
  });

  test('handles empty string', () => {
    expect(toSlackMrkdwn('')).toBe('');
  });

  test('a header whose text is bold collapses to a single bold line', () => {
    expect(toSlackMrkdwn('## **Bold Heading**')).toBe('*Bold Heading*');
    expect(toSlackMrkdwn('### **Holdings**')).toBe('*Holdings*');
  });

  test('never leaks an internal placeholder token', () => {
    const inputs = [
      '## **Bold Heading**',
      '- **bold bullet**',
      '## `code heading`',
      '## see **this** detail',
    ];
    for (const input of inputs) {
      const out = toSlackMrkdwn(input);
      expect(out).not.toContain('\uE000'); // sentinel must never survive
      expect(out).not.toMatch(/\bB\d+\b|\bC\d+\b/); // no bare token ids
    }
  });

  test('converts a basic 2-column table to an aligned fenced code block', () => {
    const input = ['| Name | Value |', '|------|-------|', '| A | 1 |', '| Beta | 22 |'].join('\n');
    const out = toSlackMrkdwn(input);
    // Wrapped in a fenced block, no raw separator leaking.
    expect(out.startsWith('```\n')).toBe(true);
    expect(out.endsWith('\n```')).toBe(true);
    expect(out).not.toContain('|---');
    expect(out).not.toContain('|------|');
    // Header padded to the widest cell ("Beta"), text column left-aligned.
    expect(out).toContain('Name');
    expect(out).toContain('Beta');
    // Numeric column right-aligned: "1" padded to width 2 -> " 1".
    const lines = out.split('\n');
    const dataA = lines.find((l) => l.includes('A '));
    expect(dataA).toBeDefined();
    expect(dataA).toContain(' 1');
  });

  test('converts the 5-column holdings table cleanly (aligned, emphasis stripped, numbers right-aligned)', () => {
    const input = [
      '| # | Company | Ticker | Weight | Est. USD Value |',
      '|---|---------|--------|--------|----------------|',
      '| 1 | Astra Enterprise Public Company Limited | ASTR | 29.49% | $26,757,284 |',
      '| 2 | Moon Inc _(2nd line)_ | 1723 | 13.74% | $12,462,104 |',
    ].join('\n');
    const out = toSlackMrkdwn(input);
    expect(out.startsWith('```\n')).toBe(true);
    expect(out.endsWith('\n```')).toBe(true);
    // No raw markdown table separator remains.
    expect(out).not.toContain('|---');
    // Emphasis markers stripped inside the cell.
    expect(out).toContain('Moon Inc (2nd line)');
    expect(out).not.toContain('_(2nd line)_');
    // Dollar column right-aligned: shorter value gets leading padding.
    const lines = out.split('\n');
    const row2 = lines.find((l) => l.includes('Moon Inc'));
    expect(row2).toBeDefined();
    expect(row2).toContain(' $12,462,104');
    // Every column present and consistently separated.
    expect(out).toContain('ASTR');
    expect(out).toContain('29.49%');
    // All content rows share the same length (column alignment).
    const contentLines = lines.slice(1, -1); // drop the ``` fences
    const len = contentLines[0].length;
    for (const l of contentLines) expect(l.length).toBe(len);
  });

  test('emphasis outside a table still converts (no regression)', () => {
    const input = [
      'Top holdings:',
      '',
      '| Ticker | Weight |',
      '|--------|--------|',
      '| ASTR | 29.49% |',
      '',
      'That is **29.49%** of the fund.',
    ].join('\n');
    const out = toSlackMrkdwn(input);
    expect(out).toContain('That is *29.49%* of the fund.');
    expect(out).toContain('```');
  });

  test('leaves a pre-existing fenced code block containing pipes untouched', () => {
    const input = ['```', '| a | b |', '|---|---|', '| 1 | 2 |', '```'].join('\n');
    expect(toSlackMrkdwn(input)).toBe(input);
  });

  test('handles a table with no outer pipes (a | b style)', () => {
    const input = ['Name | Value', '--- | ---', 'A | 1', 'Beta | 22'].join('\n');
    const out = toSlackMrkdwn(input);
    expect(out.startsWith('```\n')).toBe(true);
    expect(out).not.toContain('--- | ---');
    expect(out).toContain('Name');
    expect(out).toContain('Beta');
    expect(out).toContain('22');
  });

  test('full answer: bold figures, a link, and footer all survive', () => {
    const input =
      'The fund holds **121,086,240 shares** of [Moon Inc](https://x.co/m), ' +
      'valued at **$14,205,603**.\n\n_(as of 4:00 PM ET · 210k terminal)_';
    const expected =
      'The fund holds *121,086,240 shares* of <https://x.co/m|Moon Inc>, ' +
      'valued at *$14,205,603*.\n\n_(as of 4:00 PM ET · 210k terminal)_';
    expect(toSlackMrkdwn(input)).toBe(expected);
  });
});
