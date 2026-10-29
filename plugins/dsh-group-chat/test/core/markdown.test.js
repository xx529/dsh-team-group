// @ts-check
/** B1：安全 Markdown 子集解析（F22/§6.12） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline, escapeHtml, isSafeUrl, markdownToPlainText, ALLOWED_LINK_SCHEMES } from '../../src/core/markdown.js';

const types = (nodes) => nodes.map((n) => n.type);

test('行内语法：粗体/斜体/行内代码/链接 AST', () => {
  const inline = parseInline('**加粗** 与 *斜体* 及 `代码` 和 [链接](https://example.com/a?b=1)');
  assert.deepEqual(types(inline), ['strong', 'text', 'em', 'text', 'code', 'text', 'link']);
  assert.deepEqual(inline[0].children.map((n) => n.value), ['加粗']);
  assert.equal(inline[2].children[0].value, '斜体');
  assert.equal(inline[4].value, '代码');
  assert.equal(inline[6].url, 'https://example.com/a?b=1');
  assert.deepEqual(inline[6].children.map((n) => n.value), ['链接']);
});

test('代码块：```lang 解析、未闭合吞到结尾', () => {
  const ast = parseMarkdown('```js\nconst a = 1;\nconst b = 2;\n```');
  assert.equal(ast.children.length, 1);
  assert.deepEqual(ast.children[0], { type: 'code_block', lang: 'js', value: 'const a = 1;\nconst b = 2;' });
  const unclosed = parseMarkdown('```python\nprint(1)\nprint(2)');
  assert.equal(unclosed.children[0].type, 'code_block');
  assert.equal(unclosed.children[0].lang, 'python');
  assert.ok(unclosed.children[0].value.includes('print(2)'));
});

test('列表：无序/有序/混合分段', () => {
  const ast = parseMarkdown('- a\n- b\n\n1. c\n2. d');
  assert.equal(ast.children.length, 2);
  assert.equal(ast.children[0].type, 'list');
  assert.equal(ast.children[0].ordered, false);
  assert.equal(ast.children[0].items.length, 2);
  assert.equal(ast.children[1].ordered, true);
  assert.equal(ast.children[1].start, 1);
  assert.equal(ast.children[1].items.length, 2);
  // 任务列表降级为普通文本项（不解析 checkbox）
  const task = parseMarkdown('- [ ] 待办\n- [x] 完成');
  assert.equal(task.children[0].type, 'list');
  assert.equal(markdownToPlainText(task).includes('[ ] 待办'), true);
});

test('禁原始 HTML：不产生任何 HTML 节点，文本原样保留', () => {
  const ast = parseMarkdown('<script>alert(1)</script> **bold**');
  const all = JSON.stringify(ast);
  assert.ok(!all.includes('"type":"html"'), '不得产生 html 节点');
  assert.ok(markdownToPlainText(ast).includes('<script>alert(1)</script>'));
  assert.ok(ast.children.some((b) => b.type === 'paragraph' && b.children.some((n) => n.type === 'strong')));
});

test('链接白名单：http/https/mailto 通过；javascript/data/file 降级纯文本', () => {
  assert.deepEqual(ALLOWED_LINK_SCHEMES, ['http:', 'https:', 'mailto:']);
  assert.equal(isSafeUrl('https://x.test'), true);
  assert.equal(isSafeUrl('http://x.test'), true);
  assert.equal(isSafeUrl('mailto:a@b.c'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,x'), false);
  assert.equal(isSafeUrl('file:///etc/passwd'), false);
  assert.equal(isSafeUrl('https://x.test/has space'), false);
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) {
    const ast = parseMarkdown(`[点我](${bad})`);
    assert.ok(!JSON.stringify(ast).includes('"type":"link"'), `${bad} 不得成为 link`);
    assert.ok(markdownToPlainText(ast).includes(bad), '非白名单内容不丢');
  }
});

test('不支持语法降级纯文本：引用/标题/分隔线', () => {
  const ast = parseMarkdown('# 标题\n> 引用\n---');
  assert.ok(ast.children.every((b) => b.type === 'paragraph'));
  const plain = markdownToPlainText(ast);
  assert.ok(plain.includes('# 标题'));
  assert.ok(plain.includes('> 引用'));
});

test('F32 GFM 表格：基础 AST（header/rows + 单元格 inline）', () => {
  const ast = parseMarkdown('| 名称 | 状态 |\n|:---|:---:|\n| **a** | `ok` |\n| b | [链接](https://x.test) |');
  assert.equal(ast.children.length, 1);
  const table = ast.children[0];
  assert.equal(table.type, 'table');
  assert.deepEqual(table.header.align, ['left', 'center']);
  assert.equal(table.header.cells.length, 2);
  assert.deepEqual(table.header.cells[0].children.map((n) => n.value), ['名称']);
  assert.deepEqual(table.header.cells[1].children.map((n) => n.value), ['状态']);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0][0].children[0].type, 'strong');
  assert.equal(table.rows[0][0].children[0].children[0].value, 'a');
  assert.equal(table.rows[0][1].children[0].type, 'code');
  assert.equal(table.rows[0][1].children[0].value, 'ok');
  assert.equal(table.rows[1][1].children[0].type, 'link');
  assert.equal(table.rows[1][1].children[0].url, 'https://x.test');
});

test('F32 对齐四态 + 无外层管道', () => {
  const ast = parseMarkdown('a | b | c | d\n:--- | :---: | ---: | ---\n1 | 2 | 3 | 4');
  const table = ast.children[0];
  assert.equal(table.type, 'table');
  assert.deepEqual(table.header.align, ['left', 'center', 'right', null]);
  assert.deepEqual(markdownToPlainText(table).split('\n')[0], 'a | b | c | d');
});

test('F32 管道转义 \\| 与代码 span 内管道不切列', () => {
  const table = parseMarkdown('| a\\|b | c |\n|---|---|\n| `x|y` | z |').children[0];
  assert.equal(table.type, 'table');
  assert.equal(table.header.cells.length, 2);
  assert.deepEqual(table.header.cells[0].children.map((n) => n.value), ['a|b']);
  assert.equal(table.rows[0][0].children.length, 1, 'code span 内的 | 不切列');
  assert.equal(table.rows[0][0].children[0].type, 'code');
  assert.equal(table.rows[0][0].children[0].value, 'x|y');
});

test('F32 表格前后空行 / 数据行缺列补空、多列截断', () => {
  const ast = parseMarkdown('前文\n\n| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |\n\n后文');
  assert.deepEqual(ast.children.map((b) => b.type), ['paragraph', 'table', 'paragraph']);
  const table = ast.children[1];
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0].length, 2);
  assert.deepEqual(table.rows[0][1].children, [], '缺列补空单元格（空 inline）');
  assert.equal(table.rows[1].length, 2, '多列截断到表头列数');
});

test('F32 非法表格降级段落纯文本（不崩、不产 table）', () => {
  const cases = [
    '| a | b |\n| 1 | 2 |', // 无分隔行
    '| a | b |\n|---|', // 分隔行列数不符
    '| a | b |\n| == | --- |', // 分隔行非法（非 dash）
    'a | b\nnot a separator',
  ];
  for (const text of cases) {
    const ast = parseMarkdown(text);
    assert.ok(ast.children.every((b) => b.type !== 'table'), `不应产 table：${text}`);
    assert.ok(ast.children.some((b) => b.type === 'paragraph'));
    assert.ok(markdownToPlainText(ast).includes('|') || markdownToPlainText(ast).includes('not a separator'));
  }
});

test('F32 表格上限 200×20：行列截断 + truncated 标记；单 dash 分隔行合法', () => {
  const header = Array.from({ length: 25 }, (_, i) => `h${i}`).join(' | ');
  const sep = Array.from({ length: 25 }, () => '-').join('|');
  const body = Array.from({ length: 210 }, (_, r) => Array.from({ length: 25 }, (_, c) => `r${r}c${c}`).join(' | ')).join('\n');
  const table = parseMarkdown(`${header}\n${sep}\n${body}`).children[0];
  assert.equal(table.type, 'table');
  assert.equal(table.header.cells.length, 20);
  assert.equal(table.header.align.length, 20);
  assert.equal(table.rows.length, 200);
  assert.equal(table.rows[0].length, 20);
  assert.equal(table.truncated, true);
  // 单 dash 分隔行（v1.7.2 允许 - 至少 1 个）
  const small = parseMarkdown('| a | b |\n|-|-|\n| 1 | 2 |').children[0];
  assert.equal(small.type, 'table');
});

test('F32 长表格性能（200 行）', () => {
  const rows = Array.from({ length: 200 }, (_, i) => `| ${i} | **v${i}** | \`c${i}\` |`).join('\n');
  const text = `| id | v | code |\n|---|---|---|\n${rows}`;
  const t0 = process.hrtime.bigint();
  const table = parseMarkdown(text).children[0];
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(table.type, 'table');
  assert.equal(table.rows.length, 200);
  assert.ok(ms < 200, `table 200 行解析太慢：${ms.toFixed(2)}ms`);
});

test('escapeHtml / markdownToPlainText / 截断', () => {
  assert.equal(escapeHtml('<a&"\'>'), '&lt;a&amp;&quot;&#39;&gt;');
  assert.equal(markdownToPlainText('**粗** 与 `码`'), '粗 与 码');
  const long = parseMarkdown('x'.repeat(70000));
  assert.equal(long.truncated, true);
  assert.ok(long.children.length > 0);
});

test('性能：约 100KB 混合 Markdown 解析 < 500ms', () => {
  const chunk = '**bold** *em* `code` [l](https://x.test)\n- item\n\n```js\nconst a=1;\n```\n\n';
  const text = chunk.repeat(Math.ceil(100 * 1024 / chunk.length));
  const t0 = process.hrtime.bigint();
  const ast = parseMarkdown(text);
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  console.log(`[perf] markdown 100KB parse: ${ms.toFixed(2)}ms`);
  assert.ok(ast.children.length > 0);
  assert.ok(ms < 500, `markdown parse 太慢：${ms.toFixed(2)}ms`);
});
