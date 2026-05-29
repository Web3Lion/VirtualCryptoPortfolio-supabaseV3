# Claude Code Instructions

## Git
- Always commit and push to main without asking for confirmation.
- Use `git checkout main && git merge <branch> --ff-only && git push origin main` when on a feature branch.
- Stage specific files by name (not `git add -A`) unless everything in the tree should be committed.
