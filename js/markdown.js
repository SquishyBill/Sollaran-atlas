// A tiny, safe markdown subset for lore text.
// Supports: # / ## headings, **bold**, *italic*, - lists, > quotes, ---, [text](url),
// and [[Wiki Links]] / [[Target|label]] to other places and pages.

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);
const unesc = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => Object.keys(ENT).find((k) => ENT[k] === m));

function inline(text, resolve) {
  let s = esc(text);
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, name, label) => {
    const target = resolve?.(unesc(name).trim());
    const shown = label || name;
    return target
      ? `<a href="#" class="wiki" data-kind="${target.kind}" data-id="${esc(target.id)}">${shown}</a>`
      : `<span class="wiki missing" title="Not in the atlas yet">${shown}</span>`;
  });
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|\.\/|#)[^\s)]*)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(src, resolve) {
  if (!src || !src.trim()) return '';
  return src.replace(/\r/g, '').split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) return '';
    if (lines.length === 1 && /^-{3,}$/.test(lines[0].trim())) return '<hr>';
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''), resolve)}</li>`).join('')}</ul>`;
    }
    if (lines.every((l) => /^>/.test(l))) {
      return `<blockquote>${lines.map((l) => inline(l.replace(/^>\s?/, ''), resolve)).join('<br>')}</blockquote>`;
    }
    let head = '';
    const h = /^(#{1,2}) (.*)/.exec(lines[0]);
    if (h) {
      head = h[1].length === 1 ? `<h3>${inline(h[2], resolve)}</h3>` : `<h4>${inline(h[2], resolve)}</h4>`;
      lines.shift();
    }
    return head + (lines.length ? `<p>${lines.map((l) => inline(l, resolve)).join('<br>')}</p>` : '');
  }).join('\n');
}

// Turn pasted rich text (from Google Docs, Word, a web page) into the atlas's markdown, keeping
// bold, italics, headings, bullet and numbered lists and links. Returns '' if it can't make sense of it.
export function htmlToMarkdown(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const weight = (el) => {
    const w = (el.style && el.style.fontWeight) || '';
    if (el.matches && el.matches('b, strong')) return w !== 'normal' && w !== '400';
    return w === 'bold' || w === 'bolder' || parseInt(w, 10) >= 600;
  };
  const slanted = (el) => (el.matches && el.matches('i, em')) || (el.style && el.style.fontStyle === 'italic');

  const inline = (node) => {
    if (node.nodeType === 3) return node.nodeValue.replace(/[ \s]+/g, ' ');
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (['script', 'style', 'head'].includes(tag)) return '';
    let text = [...node.childNodes].map(inline).join('');
    if (tag === 'a' && /^https?:/i.test(node.getAttribute('href') || '') && text.trim()) text = `[${text.trim()}](${node.getAttribute('href')})`;
    const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim();
    if (!core) return text;
    let wrapped = core;
    if (weight(node) && !/^\*\*/.test(core)) wrapped = `**${wrapped}**`;
    if (slanted(node) && !wrapped.startsWith('*')) wrapped = `*${wrapped}*`;  // bold + italic stays bold: the atlas has no bold-italic
    return lead + wrapped + trail;
  };

  const blocks = [];
  const walk = (node, listDepth = 0) => {
    for (const el of node.childNodes) {
      if (el.nodeType === 3) { const t = el.nodeValue.replace(/[ \s]+/g, ' ').trim(); if (t) blocks.push(t); continue; }
      if (el.nodeType !== 1) continue;
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) { const t = inline(el).trim(); if (t) blocks.push(`${Number(tag[1]) <= 2 ? '#' : '##'} ${t.replace(/^\*\*|\*\*$/g, '')}`); }
      else if (tag === 'ul' || tag === 'ol') {
        const items = [...el.children].filter((c) => c.tagName.toLowerCase() === 'li').map((li, i) => {
          const sub = [...li.childNodes].filter((c) => !(c.nodeType === 1 && /^(ul|ol)$/i.test(c.tagName)));
          const t = sub.map(inline).join('').replace(/\s*\n\s*/g, ' ').trim();
          return `${'  '.repeat(listDepth)}${tag === 'ol' ? `${i + 1}.` : '-'} ${t}`;
        });
        blocks.push(items.join('\n'));
        for (const li of el.children) for (const child of li.children) if (/^(ul|ol)$/i.test(child.tagName)) walk({ childNodes: [child] }, listDepth + 1);
      }
      else if (tag === 'table') { for (const row of el.querySelectorAll('tr')) { const t = [...row.children].map((c) => inline(c).trim()).filter(Boolean).join(' | '); if (t) blocks.push(t); } }
      else if (['p', 'div', 'blockquote', 'section', 'article', 'body', 'html', 'span', 'b', 'strong', 'font', 'center'].includes(tag)) {
        const hasBlock = [...el.children].some((c) => /^(p|div|h[1-6]|ul|ol|table|blockquote|section)$/i.test(c.tagName));
        if (hasBlock) walk(el, listDepth);
        else { const t = inline(el).replace(/[ \t]*\n[ \t]*/g, '\n').trim(); if (t) blocks.push(tag === 'blockquote' ? t.split('\n').map((l) => `> ${l}`).join('\n') : t); }
      }
      else if (tag === 'br') { /* paragraph gaps come from the blocks */ }
      else { const t = inline(el).trim(); if (t) blocks.push(t); }
    }
  };
  walk(doc.body);
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
