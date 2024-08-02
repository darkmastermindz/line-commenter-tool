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
```

### Local Installation

```bash
npm install line-commenter-tool
```

## Usage

Once installed, you can use the tool via command line:

```bash
line-commenter-tool <action> <filename> <regexPattern> <string1,string2,...>
```

- `action`: Either `comment` or `uncomment`.
- `filename`: The path to the file to process.
- `regexPattern`: The regex pattern to match.
- `strings`: A comma-separated list of strings to match.

### Example

To comment lines containing `TODO` or matching the regex `console.log()` in `file.js`:

```bash
line-commenter-tool comment path/to/file.js 'console\.log\(\)' 'TODO'
```

This will add comments to lines containing `console.log()` or `TODO`, without affecting any existing inline comments.

### Preserve Inline Comments Example

Given a file `example.js` with the following content:

```javascript
console.log('Hello'); // Greet the user
console.log('World'); // Another greeting
```

Running the command:

```bash
line-commenter-tool comment path/to/example.js 'Hello' ''
```

Results in:

```javascript
// console.log('Hello'); // Greet the user
console.log('World'); // Another greeting
```

## Integration with Husky

Husky is a tool for managing Git hooks. Here's how you can integrate `line-commenter-tool` with Husky to automatically comment or uncomment lines during certain Git actions.

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
npx husky add .husky/pre-commit "npx line-commenter-tool comment path/to/file.js 'console\.log\(\)' 'TODO'"
```

This will ensure that every time you commit, the specified lines in `file.js` are commented according to your defined patterns.

### Recommended Husky Configuration (Husky v9+)

Here's an example of configuring Husky to run `line-commenter-tool` as part of your pre-commit hook:

1. **Create `.husky/pre-commit`**

   ```bash
   npx husky add .husky/pre-commit "npx line-commenter-tool comment path/to/file.js 'console\.log\(\)' 'TODO'"
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
   npx line-commenter-tool comment path/to/file.js 'console\.log\(\)' 'TODO'
   ```

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

## Contribution

Contributions are welcome! Please open an issue or submit a pull request for improvements.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
