# Root cause: v3-polish re-land dropped the lane files

Verdict: the twelve polish fixes were dropped by a path bug plus a masked failure in step 4 of `pig-wake-resume.sh`. The lane worker's local work is real; the delivery chain never committed it.

## Confirmed causal chain (each link verified live on the Pig or in the status file)

1. Step 4 of `pig-wake-resume.sh` builds the Pig-side command by expanding `$FILELIST` LOCALLY. The script sets `FILELIST=~/workspace/design-sprint-2026-09-26/lane-polish-f1-files.txt`, which on this sandbox resolves to `/home/hatch/workspace/...`. The Pig receives the literal string `cat /home/hatch/workspace/design-sprint-2026-09-26/lane-polish-f1-files.txt`.

2. `/home/hatch` does not exist on the Pig (Pig home is `/home/nolan`). Verified live: `cat /home/hatch/workspace/design-sprint-2026-09-26/lane-polish-f1-files.txt` on the Pig returns "No such file or directory".

3. The cat failure yields an EMPTY command substitution, so the Pig runs a bare `git add` with no pathspec. Nothing is staged.

4. `git commit` then fails with "no changes added to commit". This is recorded VERBATIM in `pig-wake-resume.status` at 13:26:16Z, immediately before the line `8dc68e4a sprint: merge design/fix-evidence-ref-current` (the old HEAD, unchanged).

5. The failure is MASKED: the step's failure branch is `... | "$PIGRUN" -s 2>&1 | tail -2 >> "$STATUS" || { log "FAILED: commit"; exit 1; }`. `tail` always exits 0, so the pipeline exit status is 0 and the `|| FAILED` branch never fires. The script logs "committed" and marks DONE commit.

6. Step 5's `git merge --no-ff design/lane-polish-f1` then has nothing new to merge and reports "Already up to date." (also verbatim in the status file). Its `| tail -3` has the same masking property, so it is marked DONE merge.

7. Steps 6-8 rebuild, restart :3200, and screenshot the UNCHANGED base tree (HEAD still 8dc68e4a). The 15/15 adjudication captures proving the fixes absent are consistent with this: the served tree never contained them.

8. The rsync in step 2 DID land: `git status` in `/home/nolan/worktrees/design-lane-polish-f1` shows all 30 files as modified/untracked, and `git log design/lane-polish-f1` shows no commits of its own (top is 8dc68e4a). Step 3's tsc + 36/30 passing tests ran against the worktree WITH the lane files present but uncommitted, so the test-green signal was real evidence the files were correct even though nothing was committed.

## Contributing factors

- Path-baking across machine boundaries: a local `$HOME` path was interpolated into a remote command without a Pig-side equivalent. The script already treats the Pig as a separate machine everywhere else (ssh/rsync), so this line was the anomaly.
- Pipeline exit-status masking: `| tail` after the remote command makes step failure undetectable by construction. Any step using this pattern cannot fail, which is the opposite of what a stateful chain needs.
- No post-step assertion: step 4 never verified the commit exists (e.g. `git log -1 --grep=lane-polish-f1` or diff against the merge base), and step 5 never verified HEAD moved past the merge base of the two branches. A merge that reports "Already up to date" when the chain's entire purpose is to land new changes should be treated as failure.
- The lane worker's shipped-state report claimed delivery without the chain having produced any commit; the report was taken at face value and the screenshots were of the wrong tree, so the falsification was only caught by the 15/15 fresh captures.

## Fixes applied (in pig-wake-resume.sh)

- Step 4: the file list is now scp'd to the Pig at `/home/nolan/design-sprint/lane-polish-f1-files.txt` before use (Pig-side path inside the remote command). The commit step captures remote output and requires a `COMMIT-OK` marker echoed after a successful `git commit`; a missing marker (including the masked-tail case) now triggers FAILED.
- Step 5: the merge step captures remote output and requires the new merge commit `sprint: merge design/lane-polish-f1` to appear in `git log --oneline -2` afterward. "Already up to date" no longer passes as success.
- Standing lesson: never interpolate a local `$HOME` path into a remote command; never put `| tail` between a remote command and its failure detector.
