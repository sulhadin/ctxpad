'use strict';

function sessionTemplate(now) {
  const ts = now.toISOString();
  return `# Session context
started: ${ts}
status: ACTIVE

## Goal
<!-- one or two lines: what this session is trying to get done. Fill this in first. -->

## Current state
<!-- short paragraph, OVERWRITTEN as things change. Not a log. What's true right now. -->

## Decisions
<!-- append-only, one line each. Format: - <what> — because <why> -->

## Rejected
<!-- append-only, one line each. Format: - <what> — because <why>. Prevents re-litigating. -->

## Open questions
<!-- append-only. Check off or annotate when answered, don't delete. -->

## Before deploy
<!-- append-only checklist. Format: - [ ] <what>. Tick to - [x] <what> when done, don't delete. -->

## Log
<!-- append-only, short timestamped bullets for notable events. Format: - <HH:MM> <what happened> -->
`;
}

const AGENTS_BLOCK_BODY = `## Session context (ctxpad)

This repo has an ephemeral, per-session context file at \`.ctx/session.md\`. It
is local-only (gitignored) and exists only for the current work session — it
is not permanent project documentation, and it is not the same thing as this
AGENTS.md file.

Rules:
1. At the start of this session, before doing anything else, read
   \`.ctx/session.md\` in full if it exists.
2. When a decision is made (an approach is picked, a tradeoff is settled),
   append one line under "## Decisions": \`- <what> — because <why>\`. Do not
   rewrite or remove past lines.
3. When an approach is abandoned or reversed, append one line under
   "## Rejected": \`- <what> — because <why>\`, so it does not get re-proposed
   later in this same session.
4. Keep "## Current state" as a short, overwritten summary of where things
   stand right now — this is the only section that gets replaced rather than
   appended to.
5. When work produces something that must be done later outside the code
   (env vars, permissions, migrations, deploy order, manual checks), append
   it under "## Before deploy" as \`- [ ] <what>\`. Tick items off
   (\`- [x] <what>\`) instead of deleting them.
6. Never delete history from "## Decisions", "## Rejected", "## Before
   deploy", or "## Log" — only append to them, or tick "## Before deploy"
   items off.
7. If \`.ctx/session.md\` does not exist, none of this applies — proceed
   normally.

This block and \`.ctx/session.md\` are temporary scaffolding for one session.
From the CLI: \`npx ctxpad clear\` wipes \`.ctx/session.md\` (and any archived
sessions) but leaves this block in place for the next session; \`npx ctxpad
remove\` tears down this block and \`.ctx/\` entirely.`;

function agentsBlock(markerStart, markerEnd) {
  return `${markerStart}\n${AGENTS_BLOCK_BODY}\n${markerEnd}`;
}

module.exports = {
  sessionTemplate,
  agentsBlock,
};
