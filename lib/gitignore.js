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

module.exports = { ensureIgnored, IGNORE_LINE };
