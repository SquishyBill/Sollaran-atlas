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
