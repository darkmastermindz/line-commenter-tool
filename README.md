
# Line Commenter Tool

A Node.js package to comment or uncomment lines in a file based on regex patterns and specific strings, while preserving existing inline comments.

## Features

- **Comment and Uncomment Lines**: Add or remove comments from lines matching specified regex patterns or containing specific strings.
- **Support for Multiple File Types**: Handles various comment styles, including single-line comments (`//`, `#`) and block comments (`/* */`, `<!-- -->`).
- **Preserve Inline Comments**: Ensures existing inline comments remain unchanged when commenting or uncommenting lines.
- **Nested Comment Handling**: Supports commenting and uncommenting nested comments by adding or removing one layer at a time.
- **Command-Line Interface**: Easily use the tool via CLI for integration with various workflows.

## Installation

You can install this package globally or locally in your project.

### Global Installation

```bash
npm install -g line-commenter-tool
npm line-commenter-tool --help
```

### Run with npx without installation

```bash
npx line-commenter-tool --help
```

## Usage

Once installed, you can use the tool via command line:

```bash
line-commenter-tool <action> <filename> <regexPattern> [string1,string2,...]
```

### Description

The `line-commenter-tool` is a command-line utility designed to comment or uncomment specific lines in a file based on a regex pattern or specific strings. It supports various file formats and comment styles, making it versatile for multiple programming languages.

This tool works by searching for lines in the specified file that match the given regex pattern or strings. Depending on the specified action (`comment` or `uncomment`), the tool will either add or remove comment markers on those lines.

### Actions

- `comment`: Adds comment markers to lines that match the regex pattern or strings.
- `uncomment`: Removes comment markers from lines that match the regex pattern or strings.

### Arguments

- `<action>`: The action to perform: `comment` or `uncomment`.
- `<filename>`: The file to process.
- `<regexPattern>`: A regex pattern to identify lines to be commented or uncommented.
- `[string1,string2,...]` (Optional): A comma-separated list of strings to be matched exactly.

### Options

- `--help`: Show this help message and exit.
- `--version`: Show the tool\'s version and exit.
- `--silent`: Suppress output messages. When this flag is used, the tool will run without logging any success or error messages.
- `--multiline`: Enable processing of multiline comments. When this flag is used, the tool will comment or uncomment entire multiline block comments (e.g., `/* ... */`, `<!-- ... -->`) based on a full match of the regex pattern.

### Examples

1. **Comment all lines containing the string `console.log` in a JavaScript file:**
   ```bash
   line-commenter-tool comment app.js "console\\.log"
   ```

2. **Uncomment all lines that match the regex pattern `TODO` in a Python file:**
   ```bash
   line-commenter-tool uncomment script.py "TODO"
   ```

3. **Comment specific lines in a file using multiple strings:**
   ```bash
   line-commenter-tool comment config.yml "DEBUG" "error,warning"
   ```

4. **Uncomment a full multiline block comment in a CSS file:**
   ```bash
   line-commenter-tool uncomment styles.css "/*" --multiline
   ```

### Notes

- ⚠️ The tool is case-sensitive by default. Ensure your regex patterns and strings match the case of the content you want to comment or uncomment.
- 💡 The `--multiline` option is particularly useful for handling languages that use block comments for larger sections of code, such as CSS, HTML, or JavaScript.

## Integration with Husky

Husky is a tool for managing Git hooks. Here\'s how you can integrate `line-commenter-tool` with Husky to automatically comment or uncomment lines during certain Git actions.

### Setup Husky

First, install Husky in your project:

```bash
npm install husky --save-dev
```

Enable Git hooks:

```bash
npx husky install
```

### Add a Hook

Create a new hook, for example, a pre-commit hook to comment specific lines:

```bash
npx husky add .husky/pre-commit "npx line-commenter-tool comment path/to/file.js 'console\\.log\\(\\)' 'TODO'"
```

This will ensure that every time you commit, the specified lines in `file.js` are commented according to your defined patterns.

### Recommended Husky Configuration (Husky v9+)

Here\'s an example of configuring Husky to run `line-commenter-tool` as part of your pre-commit hook:

1. **Create `.husky/pre-commit`**

   ```bash
   npx husky add .husky/pre-commit "npx line-commenter-tool comment path/to/file.js 'console\\.log\\(\\)' 'TODO'"
   ```

2. **Make sure your hooks are executable**

   ```bash
   chmod +x .husky/pre-commit
   ```

3. **Example pre-commit hook file content**

   ```bash
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"

   # Run line-commenter-tool before committing
   npx line-commenter-tool comment path/to/file.js 'console\\.log\\(\\)' 'TODO'
   ```

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

## Contribution

Contributions are welcome! Please open an issue or submit a pull request for improvements.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
