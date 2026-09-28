'use strict';

const fs = require('fs');

const IGNORE_LINE = '.ctx/';
const MARKER = '# added by ctxpad';

function ensureIgnored(gitignorePath) {
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }
  const lines = content.split('\n');
  const already = lines.some((l) => l.trim() === IGNORE_LINE);
  if (already) return false;
  const sep = content.length && !content.endsWith('\n') ? '\n' : '';
  const addition = `${sep}${content.length ? '\n' : ''}${MARKER}\n${IGNORE_LINE}\n`;
  fs.writeFileSync(gitignorePath, content + addition);
  return true;
}

/**
 * Remove exactly the marker+line pair that ensureIgnored added. Leaves the
 * file alone if that pair isn't found (e.g. the person edited it by hand).
 */
function removeIgnored(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) return false;
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split('\n');
  let changed = false;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === MARKER && lines[i + 1] !== undefined && lines[i + 1].trim() === IGNORE_LINE) {
      changed = true;
      i++; // also skip the ignore line
      continue;
    }
    out.push(lines[i]);
  }
  if (!changed) return false;
  const result = out.join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(gitignorePath, result);
  return true;
}

module.exports = { ensureIgnored, removeIgnored, IGNORE_LINE };
