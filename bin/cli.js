#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { CTX_DIR, SESSION_FILE, ARCHIVE_DIR, AGENTS_FILE } = require('../lib/constants');
const { sessionTemplate } = require('../lib/template');
const { hasBlock, upsertBlock, removeBlock, readAgentsFile } = require('../lib/agents');
const { ensureIgnored } = require('../lib/gitignore');

const cwd = process.cwd();
const ctxDirPath = path.join(cwd, CTX_DIR);
const sessionPath = path.join(ctxDirPath, SESSION_FILE);
const agentsPath = path.join(cwd, AGENTS_FILE);
const gitignorePath = path.join(cwd, '.gitignore');

function log(msg) {
  process.stdout.write(msg + '\n');
}

function fail(msg) {
  process.stderr.write('ctxpad: ' + msg + '\n');
  process.exitCode = 1;
}

function printHelp() {
  log(`ctxpad — ephemeral, per-session context for AI coding agents that read AGENTS.md

Usage:
  ctxpad init [--force]   Create .ctx/session.md and wire AGENTS.md to it
  ctxpad show             Print the current session context
  ctxpad status           One-line summary of the current session
  ctxpad stop [options]   Unwire AGENTS.md and retire the session file

Options for stop:
  --keep     Remove the AGENTS.md block but leave .ctx/session.md as is
  --purge    Delete .ctx/session.md instead of archiving it

Notes:
  - .ctx/ is added to .gitignore automatically; nothing here is meant to be committed.
  - Safe to run in any repo; it never touches files other than AGENTS.md, .gitignore, and .ctx/.
`);
}

function cmdInit(args) {
  const force = args.includes('--force');

  if (!fs.existsSync(ctxDirPath)) {
    fs.mkdirSync(ctxDirPath, { recursive: true });
  }

  if (fs.existsSync(sessionPath) && !force) {
    log(`.ctx/${SESSION_FILE} already exists — leaving it as is (use --force to reset).`);
  } else {
    fs.writeFileSync(sessionPath, sessionTemplate(new Date()));
    log(`created .ctx/${SESSION_FILE}`);
  }

  const ignoreAdded = ensureIgnored(gitignorePath);
  if (ignoreAdded) {
    log('added .ctx/ to .gitignore');
  }

  const existingAgents = readAgentsFile(agentsPath);
  const alreadyWired = existingAgents ? hasBlock(existingAgents) : false;
  const updated = upsertBlock(existingAgents || '');
  fs.writeFileSync(agentsPath, updated);
  if (existingAgents === null) {
    log(`created ${AGENTS_FILE} with the ctxpad block`);
  } else if (alreadyWired) {
    log(`${AGENTS_FILE} already wired — refreshed the ctxpad block`);
  } else {
    log(`added the ctxpad block to ${AGENTS_FILE}`);
  }

  log('');
  log(`Now open .ctx/${SESSION_FILE} and fill in "## Goal", then start your agent.`);
}

function cmdShow() {
  if (!fs.existsSync(sessionPath)) {
    fail(`no .ctx/${SESSION_FILE} found — run "ctxpad init" first.`);
    return;
  }
  process.stdout.write(fs.readFileSync(sessionPath, 'utf8'));
}

function cmdStatus() {
  const wired = fs.existsSync(agentsPath) && hasBlock(readAgentsFile(agentsPath) || '');
  if (!fs.existsSync(sessionPath)) {
    log(`session: none (.ctx/${SESSION_FILE} not found)`);
    log(`AGENTS.md wired: ${wired ? 'yes (stale — no session file)' : 'no'}`);
    return;
  }
  const content = fs.readFileSync(sessionPath, 'utf8');
  const startedMatch = content.match(/^started:\s*(.+)$/m);
  const statusMatch = content.match(/^status:\s*(.+)$/m);
  const countLines = (heading) => {
    const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(\\n## |$)`);
    const m = content.match(re);
    if (!m) return 0;
    return m[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- ')).length;
  };

  log(`session: .ctx/${SESSION_FILE}`);
  log(`status: ${statusMatch ? statusMatch[1] : 'unknown'}`);
  log(`started: ${startedMatch ? startedMatch[1] : 'unknown'}`);
  log(`decisions: ${countLines('Decisions')}`);
  log(`rejected: ${countLines('Rejected')}`);
  log(`open questions: ${countLines('Open questions')}`);
  log(`AGENTS.md wired: ${wired ? 'yes' : 'no'}`);
}

function cmdStop(args) {
  const keep = args.includes('--keep');
  const purge = args.includes('--purge');

  if (fs.existsSync(agentsPath)) {
    const content = readAgentsFile(agentsPath);
    if (hasBlock(content)) {
      const updated = removeBlock(content);
      fs.writeFileSync(agentsPath, updated);
      log(`removed the ctxpad block from ${AGENTS_FILE}`);
    } else {
      log(`${AGENTS_FILE} has no ctxpad block — nothing to remove`);
    }
  }

  if (!fs.existsSync(sessionPath)) {
    log(`no .ctx/${SESSION_FILE} found — nothing to retire`);
    return;
  }

  if (keep) {
    log(`left .ctx/${SESSION_FILE} in place (--keep)`);
    return;
  }

  if (purge) {
    fs.unlinkSync(sessionPath);
    log(`deleted .ctx/${SESSION_FILE}`);
    return;
  }

  const archiveDirPath = path.join(ctxDirPath, ARCHIVE_DIR);
  if (!fs.existsSync(archiveDirPath)) {
    fs.mkdirSync(archiveDirPath, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(archiveDirPath, `session-${stamp}.md`);
  fs.renameSync(sessionPath, archivePath);
  log(`archived session to .ctx/${ARCHIVE_DIR}/session-${stamp}.md`);
}

function main() {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case 'init':
      cmdInit(rest);
      break;
    case 'show':
      cmdShow();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'stop':
      cmdStop(rest);
      break;
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      fail(`unknown command "${cmd}"\n`);
      printHelp();
      process.exitCode = 1;
  }
}

main();
