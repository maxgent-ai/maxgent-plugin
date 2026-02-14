# Release

Release a new version: bump the minor version, update CLAUDE.md, and create a PR to main.

## Instructions

Follow these steps to execute the release process:

### Step 1: Confirm with user

Read the current version from `.claude-plugin/plugin.json`, compute the new version (bump minor), then ask the user to confirm:

"Current version is X.Y.Z. Bump minor version to X.(Y+1).0?"

Minor version bump rules:
- 0.1.0 -> 0.2.0
- 0.2.5 -> 0.3.0
- 1.0.0 -> 1.1.0

If the user declines, do not proceed.

### Step 3: Create release branch

```bash
git checkout -b release/vX.Y.Z
```

Branch name uses the new version number.

### Step 4: Update plugin.json

Update the `version` field in `.claude-plugin/plugin.json` to the new version.

### Step 5: Update CLAUDE.md

Update the version number at the top of CLAUDE.md:

```markdown
# Maxgent Plugin

> Version: X.Y.Z
```

### Step 6: Commit changes

```bash
git add .claude-plugin/plugin.json CLAUDE.md
git commit -m "chore: bump version to vX.Y.Z"
```

### Step 7: Push branch

```bash
git push -u origin release/vX.Y.Z
```

### Step 8: Create PR

Use the gh command to create a PR:

```bash
gh pr create --base main --title "Release vX.Y.Z" --body "$(cat <<'EOF'
## Summary

- Bump version to vX.Y.Z

## Checklist

- [ ] Version updated in plugin.json
- [ ] CLAUDE.md updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 9: Report results

Tell the user:
- New version number
- PR link
- Next steps (review and merge the PR)
