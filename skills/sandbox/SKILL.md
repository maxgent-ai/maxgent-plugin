---
name: sandbox
description: Cloud code interpreter sandbox. Use when users ask to run code in a sandbox, execute Python/JS/Bash remotely, do data analysis, or need an isolated execution environment.
---

# Cloud Sandbox

Cloud sandbox for executing code. Supports Python, JavaScript, TypeScript, Bash, Java, R.
The sandbox is stateful — variables, files, and installed packages persist across executions.

## Running Commands

All commands use `sandbox-helper.js` from the skill directory:

```bash
bun skills/sandbox/sandbox-helper.js <command> [arguments]
```

## Workflow

1. **Create** a sandbox (once per session)
2. **Upload** files if needed
3. **Run** code as needed
4. **Download** results when done
5. User can see your executions in the right panel and take over at any time

## Command Reference

```bash
# Create sandbox (required before first run)
bun skills/sandbox/sandbox-helper.js create

# Execute code (default: python)
bun skills/sandbox/sandbox-helper.js run "print('hello')"

# Specify language
bun skills/sandbox/sandbox-helper.js run --lang bash "pip install pandas && ls"
bun skills/sandbox/sandbox-helper.js run --lang javascript "console.log(Date.now())"

# Upload file to sandbox
bun skills/sandbox/sandbox-helper.js upload /local/path/to/file.csv
bun skills/sandbox/sandbox-helper.js upload /local/path/to/file.csv /home/user/data/file.csv

# Upload directory to sandbox (recursive)
bun skills/sandbox/sandbox-helper.js upload /local/path/to/project
bun skills/sandbox/sandbox-helper.js upload /local/path/to/project /home/user/project

# Download file from sandbox
bun skills/sandbox/sandbox-helper.js download /home/user/output.csv
bun skills/sandbox/sandbox-helper.js download /home/user/output.csv /local/path/output.csv

# Download directory from sandbox (recursive)
bun skills/sandbox/sandbox-helper.js download /home/user/results ./results

# List files in sandbox directory
bun skills/sandbox/sandbox-helper.js ls
bun skills/sandbox/sandbox-helper.js ls /home/user/data

# Check sandbox status
bun skills/sandbox/sandbox-helper.js status

# Pause (preserve state, save cost)
bun skills/sandbox/sandbox-helper.js pause

# Resume paused sandbox
bun skills/sandbox/sandbox-helper.js resume

# Destroy (irreversible)
bun skills/sandbox/sandbox-helper.js destroy
```

## File Operations

- `upload <local> [remote]` — Upload a local file or directory to the sandbox. If remote path is omitted, uploads to `/home/user/<filename>`.
- `download <remote> [local]` — Download a file or directory from the sandbox. If local path is omitted, saves to current directory with the same filename.
- `ls [path]` — List contents of a sandbox directory. Defaults to `/home/user`.

## Important

- Always `create` before first `run`
- If `run` returns "sandbox not found", create a new one
- User shares the same sandbox — they can see your output and interact
- Sandbox auto-pauses after 10 minutes idle, use `resume` to continue
- Default working directory in sandbox is `/home/user`
- Directory upload/download is recursive — all nested files are transferred
