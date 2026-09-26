'use strict';

const fs = require('fs');
const { MARKER_START, MARKER_END } = require('./constants');
const { agentsBlock } = require('./template');

function findBlockRange(content) {
  const startIdx = content.indexOf(MARKER_START);
  if (startIdx === -1) return null;
  const endIdx = content.indexOf(MARKER_END, startIdx);
  if (endIdx === -1) return null;
  return { startIdx, endIdx: endIdx + MARKER_END.length };
}

function hasBlock(content) {
  return findBlockRange(content) !== null;
}

/**
 * Insert or refresh the ctxpad block in AGENTS.md content.
 * Returns the new full file content.
 */
function upsertBlock(content) {
  const block = agentsBlock(MARKER_START, MARKER_END);
  if (!content || !content.trim()) {
    return `${block}\n`;
  }
  const range = findBlockRange(content);
  if (range) {
    return (
      content.slice(0, range.startIdx) + block + content.slice(range.endIdx)
    );
  }
  const sep = content.endsWith('\n') ? '\n' : '\n\n';
  return `${content}${sep}${block}\n`;
}

/**
 * Remove the ctxpad block from AGENTS.md content, cleaning up
 * surrounding blank lines it left behind.
 */
function removeBlock(content) {
  const range = findBlockRange(content);
  if (!range) return content;
  let before = content.slice(0, range.startIdx);
  let after = content.slice(range.endIdx);
  // trim trailing blank lines left in `before` and leading blank lines in `after`
  before = before.replace(/\n{2,}$/, '\n');
  after = after.replace(/^\n+/, after.startsWith('\n\n') ? '\n' : after);
  const merged = before + after;
  return merged.replace(/\n{3,}/g, '\n\n');
}

function readAgentsFile(path) {
  if (!fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf8');
}

module.exports = {
  hasBlock,
  upsertBlock,
  removeBlock,
  readAgentsFile,
};
