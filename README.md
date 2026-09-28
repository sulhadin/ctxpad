# ctxpad

*A disposable, per-session memory file for AI coding agents that read AGENTS.md.*

Ephemeral, per-session context for AI coding agents that read `AGENTS.md`
(Claude Code, Gemini CLI, Codex, etc). Zero dependencies, one small file,
gone when you're done.

## The problem this solves

A long back-and-forth session with an agent racks up decisions made,
approaches tried and abandoned, and tradeoffs settled — none of which
survive a compaction, a context reset, or you closing the terminal and
coming back tomorrow. You end up re-explaining the same context, and the
agent re-proposes things you already rejected.

You don't need a permanent project-memory system for this. You need a
scratch pad that lives for *this* piece of work and then disappears.

## What it does

`ctxpad init` does three things in the current repo:

1. Creates `.ctx/session.md` — a small markdown file with sections for
   Goal, Current state, Decisions, Rejected, Open questions, Before deploy,
   and a Log.
2. Adds `.ctx/` to `.gitignore` — nothing here is meant to be committed.
3. Appends a short instruction block to `AGENTS.md` (creating it if it
   doesn't exist) telling the agent to read `.ctx/session.md` at the start
   of the session and append to it as decisions get made or dropped.

Your agent then keeps that file updated for you as you work — you don't
edit it by hand (though you can).

When the session is over, `ctxpad clear` wipes the session data but
leaves `AGENTS.md` wired for next time; `ctxpad remove` tears everything
down. Your repo is left exactly as it was.

## Format

Decisions and Rejected lines follow one shape, written the moment it
happens, not batched at the end of the session:

```
- <specific what> — because <specific why>
```

Name the actual file, function, config key, or endpoint involved, not
"this approach" or "that way" — one concrete sentence, roughly 15-25
words, enough to mean something on a cold read months later:

```
- Moved token refresh to a 15min interval in useAuth.ts — because 5min
  was hitting the /refresh endpoint's staging rate limit
```

## Install

No install needed — run it with `npx` from the repo root:

```
npx ctxpad init
```

Or install it globally if you use it often:

```
npm install -g ctxpad
ctxpad init
```

## Usage

```
ctxpad init [--force]   Create .ctx/session.md and wire AGENTS.md to it
ctxpad show             Print the current session context
ctxpad status           One-line summary (decisions/rejected/open counts)
ctxpad clear [options]  Wipe session data, leave AGENTS.md wired
ctxpad remove           Full teardown: unwire AGENTS.md and delete .ctx/
```

`clear` options:

```
--keep-session   Don't touch .ctx/session.md, only clear .ctx/archive/
--keep-archive   Don't touch .ctx/archive/, only clear .ctx/session.md
(with neither flag, both are wiped; with both, there's nothing to do)
```

`remove` takes no options — it unwires `AGENTS.md`, deletes `.ctx/`
entirely, and removes the `.ctx/` entry it added to `.gitignore`.

## Example

```
$ npx ctxpad init
created .ctx/session.md
added .ctx/ to .gitignore
added the ctxpad block to AGENTS.md

Now open .ctx/session.md and fill in "## Goal", then start your agent.

$ claude   # or gemini, or whatever reads AGENTS.md
# ... long session, lots of back and forth ...

$ npx ctxpad status
session: .ctx/session.md
status: ACTIVE
started: 2026-09-26T09:12:03.000Z
decisions: 4
rejected: 2
open questions: 1
before deploy: 2 pending, 1 done
AGENTS.md wired: yes

$ npx ctxpad clear
deleted .ctx/session.md
deleted .ctx/archive/

AGENTS.md left untouched — run "ctxpad init" to start a fresh session.

$ npx ctxpad remove
removed the ctxpad block from AGENTS.md
deleted .ctx/
removed the .ctx/ entry from .gitignore
```

## What it is not

- Not a replacement for real project documentation. If a decision matters
  beyond this session, write it into your actual docs before you run
  `ctxpad clear` or `ctxpad remove`.
- Not multi-session memory. There's no concept of resuming a *different*
  unit of work later, no closure/anchor bookkeeping, no dispatch model.
  One repo, one live session file, append until you're done.
- Not tied to any one agent or vendor. It only ever touches `AGENTS.md`,
  `.gitignore`, and `.ctx/` with plain file I/O — any agent that reads
  `AGENTS.md` picks it up automatically.

## License

MIT
