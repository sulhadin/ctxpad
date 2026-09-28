#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { CTX_DIR, SESSION_FILE, ARCHIVE_DIR, AGENTS_FILE } = require('../lib/constants');
const { sessionTemplate } = require('../lib/template');
const { hasBlock, upsertBlock, removeBlock, readAgentsFile } = require('../lib/agents');
const { ensureIgnored, removeIgnored } = require('../lib/gitignore');

const cwd = process.cwd();
const ctxDirPath = path.join(cwd, CTX_DIR);
const sessionPath = path.join(ctxDirPath, SESSION_FILE);
const archiveDirPath = path.join(ctxDirPath, ARCHIVE_DIR);
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
  ctxpad clear [options]  Wipe session data, leave AGENTS.md wired
  ctxpad remove           Full teardown: unwire AGENTS.md and delete .ctx/

Options for clear:
  --keep-session   Don't touch .ctx/session.md, only clear .ctx/archive/
  --keep-archive   Don't touch .ctx/archive/, only clear .ctx/session.md
  (with neither flag, both are wiped; with both, there's nothing to do)

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

function rimraf(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function cmdClear(args) {
  const keepSession = args.includes('--keep-session');
  const keepArchive = args.includes('--keep-archive');

  if (keepSession && keepArchive) {
    log('both --keep-session and --keep-archive given — nothing to clear.');
    return;
  }

  let didSomething = false;

  if (!keepSession) {
    if (rimraf(sessionPath)) {
      log(`deleted .ctx/${SESSION_FILE}`);
      didSomething = true;
    }
  }

  if (!keepArchive) {
    if (rimraf(archiveDirPath)) {
      log(`deleted .ctx/${ARCHIVE_DIR}/`);
      didSomething = true;
    }
  }

  if (!didSomething) {
    log('nothing to clear.');
    return;
  }

  log('');
  log(`${AGENTS_FILE} left untouched — run "ctxpad init" to start a fresh session.`);
}

function cmdRemove() {
  let didSomething = false;

  if (fs.existsSync(agentsPath)) {
    const content = readAgentsFile(agentsPath);
    if (hasBlock(content)) {
      fs.writeFileSync(agentsPath, removeBlock(content));
      log(`removed the ctxpad block from ${AGENTS_FILE}`);
      didSomething = true;
    }
  }

  if (rimraf(ctxDirPath)) {
    log('deleted .ctx/');
    didSomething = true;
  }

  if (removeIgnored(gitignorePath)) {
    log('removed the .ctx/ entry from .gitignore');
    didSomething = true;
  }

  if (!didSomething) {
    log('nothing to remove — ctxpad was not set up in this repo.');
  }
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
    case 'clear':
      cmdClear(rest);
      break;
    case 'remove':
      cmdRemove();
      break;
    case 'stop':
      fail(
        '"stop" was replaced. Use "ctxpad clear" (wipe session data, keep AGENTS.md wired) ' +
          'or "ctxpad remove" (full teardown: unwire AGENTS.md and delete .ctx/).'
      );
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
