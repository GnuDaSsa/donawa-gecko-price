<!-- codex-harness-kit:start -->
# AGENTS Harness Supplement

This file is active only when `AGENTS.md` contains the codex-harness-kit bridge block.

## Harness Rules

1. Read `docs/harness-config.json` first.
2. Resolve the working files from `paths.stateFile`, `paths.memoryFile`, `paths.decisionsFile`, and `paths.contractsDir`.
3. Open the active contract from `currentContract` in the state file before writing code.
4. Restore state before editing, then keep the contract current as scope changes.
5. After edits, run the smallest meaningful verification command from the config and record the result back into the configured state file.
6. If repeated failures hit the configured limit in `rules.maxRepeatedFailures`, stop guessing and produce a diagnosis instead of trying random fixes.
7. Write durable preferences to the memory file and explicit trade-offs to the decisions file.
8. Final responses must say what changed, what verification ran, and what verification did not run.
<!-- codex-harness-kit:end -->
