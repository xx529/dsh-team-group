// @ts-check
/** B1：50 行折叠测量（F29/§6.17） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { foldInfo, measureLines, renderedLineCount, FOLD_MAX_LINES, FOLD_LINE_HEIGHT } from '../../src/core/fold.js';
import { parseMarkdown } from '../../src/core/markdown.js';

test('阈值：49/50 不折、51 折叠；hiddenLines=1', () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => `第${i + 1}行`).join('\n');
  assert.equal(FOLD_MAX_LINES, 50);
  assert.equal(foldInfo(mk(49)).folded, false);
  assert.equal(foldInfo(mk(50)).folded, false);
  assert.equal(foldInfo(mk(50)).lineCount, 50);
  const over = foldInfo(mk(51));
  assert.equal(over.folded, true);
  assert.equal(over.hiddenLines, 1);
  assert.equal(over.canExpand, true);
  assert.equal(over.maxHeight, 50 * FOLD_LINE_HEIGHT);
});

test('M1 长段落软换行计入：40 字符/行时 49/50/51 行阈值成立', () => {
  const long = (chars) => '字'.repeat(chars);
  assert.equal(foldInfo(long(40 * 49)).lineCount, 49);
  assert.equal(foldInfo(long(40 * 50)).lineCount, 50);
  assert.equal(foldInfo(long(40 * 50)).folded, false);
  const over = foldInfo(long(40 * 51));
  assert.equal(over.lineCount, 51);
  assert.equal(over.folded, true);
  assert.equal(over.hiddenLines, 1);
  // 自定义 charsPerLine（窄屏）
  assert.equal(foldInfo(long(40 * 51), { charsPerLine: 20 }).lineCount, 102);
  // 显式换行仍按段计
  assert.equal(foldInfo(Array(50).fill('x').join('\n')).lineCount, 50);
});

test('F32 表格：折叠行数 = 表头 1 行 + 数据行', () => {
  const rows = Array.from({ length: 60 }, (_, i) => `| ${i} | v |`).join('\n');
  const text = `| id | v |\n|---|---|\n${rows}`;
  const info = foldInfo(text);
  assert.equal(info.lineCount, 62);
  assert.equal(info.folded, true);
  assert.equal(info.hiddenLines, 12);
});

test('M5 旧折叠 API 不再从 core/index 公开导出', async () => {
  const core = await import('../../src/core/index.js');
  assert.equal(core.shouldFold, undefined);
  assert.equal(core.foldInfoChars, undefined);
  assert.equal(core.countLines, undefined);
  assert.equal(core.approximateChars, undefined);
  assert.equal(typeof core.foldInfo, 'function', 'v1.7 50 行口径仍在');
});

test('代码块行数计入；>50 行代码块折叠', () => {
  const code = '```js\n' + Array.from({ length: 60 }, (_, i) => `const l${i} = ${i};`).join('\n') + '\n```';
  const info = foldInfo(code);
  assert.equal(info.lineCount, 60);
  assert.equal(info.folded, true);
  assert.equal(info.hiddenLines, 10);
  assert.equal(renderedLineCount(parseMarkdown(code).children[0]), 60);
});

test('列表项每项计入行数', () => {
  const list = '- a\n- b\n- c';
  assert.equal(measureLines(list), 3);
  assert.equal(foldInfo(list, { maxLines: 3 }).folded, false);
  assert.equal(foldInfo(list, { maxLines: 2 }).folded, true);
});

test('空文本/AST 输入/自定义阈值', () => {
  assert.equal(measureLines(''), 0);
  assert.equal(foldInfo('').folded, false);
  const ast = parseMarkdown('a\nb\nc');
  assert.equal(measureLines(ast), 3);
  assert.equal(foldInfo(ast, { maxLines: 2 }).hiddenLines, 1);
  assert.equal(foldInfo('a', { maxLines: 0 }).maxLines, FOLD_MAX_LINES);
});
