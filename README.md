# Line Commenter Tool

[![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/line-commenter-tool)
[![Node.js Package](https://github.com/darkmastermindz/line-commenter-tool/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/darkmastermindz/line-commenter-tool/actions/workflows/npm-publish.yml)

A developer experience utility to comment or uncomment specific lines in files (by regex or explicit strings), while preserving existing inline comments. Built with Node.js for easy integration into developer workflows (for example via Husky Git hooks).

- Preferred usage: pair it with Husky to automatically comment/uncomment lines during post-checkout, pre-commit, or other Git hooks to streamline local development.
- Have a success story or a use case to share? Email: oss@hanselwei.dev
- If this tool helped your team, please consider sponsoring the project.

## Features

- Comment and uncomment individual lines based on regex patterns or exact string matches.
- Support for many file types and comment styles (single-line and block comments).
- Preserves existing inline comments when adding or removing comment wrappers.
- Handles nested comments by adding or removing one layer of commenting at a time.
- Command-line interface for easy automation and integration.

## Supported comment styles

The tool works with common single-line and block comment styles including, but not limited to:
- Single-line: `//` (JS/TS), `#` (sh, py), `--` (SQL)
- Block comments: `/* ... */` (CSS/JS), `<!-- ... -->` (HTML)
Note: behavior varies with language; use `--multiline` to operate on block comments.

## Installation

Install globally:
```bash
npm install -g line-commenter-tool
```

Or use without installing via npx:
```bash
npx line-commenter-tool --help
```

## Basic Usage

CLI pattern:
```bash
line-commenter-tool <action> <filename> <regexPattern> [string1,string2,...] [options]
```

- `<action>`: `comment` or `uncomment`
- `<filename>`: path to the file to process (relative or absolute)
- `<regexPattern>`: regex pattern (as a quoted string) used to match lines
- `[string1,string2,...]` (optional): comma-separated exact strings to match

Options:
- `--help`           Show help and exit
- `--version`        Show version and exit
- `--silent`         Suppress output messages
- `--multiline`      Enable processing of multiline block comments (e.g., `/* ... */`, `<!-- ... -->`)

Behavior notes:
- The tool is case-sensitive by default. Ensure your regex or string matches the target casing.
- The tool modifies files in place. Use version control or back up files before running on important files.

## Examples

1. Comment all lines containing `console.log` in a JS file:
```bash
line-commenter-tool comment app.js "console\\.log"
```

2. Uncomment all lines that contain `TODO` in a Python file:
```bash
line-commenter-tool uncomment script.py "TODO"
```

3. Comment lines matching multiple explicit strings (comma-separated):
```bash
line-commenter-tool comment config.yml "DEBUG" "error,warning"
```

4. Uncomment a full multiline block in a CSS file:
```bash
line-commenter-tool uncomment styles.css "/\\*" --multiline
```

5. Use with npx (no install):
```bash
npx line-commenter-tool comment src/index.js "debug\\(" --silent
```

Tips:
- When writing shell commands in examples, escape regex metacharacters appropriately (see examples above).
- If a pattern contains spaces or shell-special characters, wrap it in single quotes.

## Integration with Husky

Husky can run this tool as part of Git hooks to automatically apply comment/uncomment transformations.

Install Husky:
```bash
npm install husky --save-dev
npx husky install
```

Add a pre-commit hook that runs the tool:
```bash
npx husky add .husky/pre-commit "npx line-commenter-tool comment path/to/file.js 'console\\.log\\(\\)' 'TODO'"
chmod +x .husky/pre-commit
```

Example `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Comment out console.log and TODO lines before commit
npx line-commenter-tool comment path/to/file.js 'console\.log\(' 'TODO'
```

## Safety & Best Practices

- The tool edits files in place. Keep files under version control so changes can be reviewed and reverted.
- Test your regex patterns on small files or with controlled inputs before running across a codebase.
- Consider running the command locally with `--silent` disabled to confirm behavior before automating in hooks.

## Contribution

Contributions and improvements are welcome. Please open an issue or submit a pull request.

If you'd like me to prepare a branch and PR with this README update, tell me the target branch name and I can create it for you.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter issues or have questions, please open an issue on the GitHub repository:
https://github.com/darkmastermindz/line-commenter-tool/issues