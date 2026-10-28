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

test('不支持语法降级纯文本：表格/引用/标题/分隔线', () => {
  const ast = parseMarkdown('# 标题\n> 引用\n| a | b |\n|---|---|');
  assert.ok(ast.children.every((b) => b.type === 'paragraph'));
  const plain = markdownToPlainText(ast);
  assert.ok(plain.includes('# 标题'));
  assert.ok(plain.includes('> 引用'));
  assert.ok(plain.includes('| a | b |'));
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
