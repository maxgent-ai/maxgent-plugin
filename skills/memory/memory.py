#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Memory reader with smart truncation.
Reads memory files, truncating large files to last N characters.
"""

import os
import sys
from pathlib import Path

# Max characters per file (≈3% of 200K context)
MAX_CHARS = 15000


def get_memory_dir() -> Path | None:
    """Get memory directory from environment variables."""
    project_id = os.environ.get("MAX_PROJECT_ID")
    session_id = os.environ.get("MAX_SESSION_ID")

    if not project_id or not session_id:
        print("Error: MAX_PROJECT_ID and MAX_SESSION_ID environment variables required")
        return None

    return Path.home() / ".claude" / "projects" / project_id / "max" / session_id / "memory"


def read_file(filepath: Path, max_chars: int = MAX_CHARS) -> tuple[str, bool]:
    """
    Read file, truncating if too large.
    Returns (content, was_truncated).
    """
    if not filepath.exists():
        return "", False

    content = filepath.read_text(encoding="utf-8")
    if len(content) <= max_chars:
        return content, False

    # Truncate: keep last max_chars (most recent content is at the end)
    truncated = content[-max_chars:]
    # Find first complete section marker to avoid cutting mid-section
    section_marker = "\n## "
    first_section = truncated.find(section_marker)
    if first_section > 0:
        truncated = truncated[first_section + 1 :]  # +1 to skip the leading \n

    return truncated, True


def main():
    memory_dir = get_memory_dir()
    if not memory_dir:
        sys.exit(1)

    if not memory_dir.exists():
        print(f"Memory directory not found: {memory_dir}")
        print("This session hasn't been compacted yet.")
        sys.exit(0)

    # Define files to read in priority order
    files = [
        ("errors.md", "Error Fixes (CRITICAL - avoid repeating mistakes)"),
        ("context.md", "User Messages & Technical Concepts"),
        ("files.md", "Code References"),
    ]

    # Check which files to read based on args
    requested = sys.argv[1:] if len(sys.argv) > 1 else ["errors.md"]

    for filename, description in files:
        if filename not in requested and "all" not in requested:
            continue

        filepath = memory_dir / filename
        if not filepath.exists():
            continue

        content, truncated = read_file(filepath)
        if not content:
            continue

        # Print header
        print(f"\n{'='*60}")
        print(f"📁 {filename} - {description}")
        if truncated:
            print(f"⚠️  File truncated (showing last ~{MAX_CHARS} chars)")
        print(f"{'='*60}\n")

        print(content)


if __name__ == "__main__":
    main()
