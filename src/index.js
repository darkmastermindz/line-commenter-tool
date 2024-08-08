import shell from 'shelljs';

// Mapping of file extensions to comment symbols
const supportedExtensions = {
  '.js': '//',
  '.jsx': '//',
  '.ts': '//',
  '.tsx': '//',
  '.vue': '//',           // Vue uses JS-style comments in script blocks
  '.svelte': '//',        // Svelte uses JS-style comments in script blocks
  '.html': '<!--',        // HTML comments
  '.css': '/*',           // CSS comments
  '.scss': '/*',          // SCSS comments
  '.less': '/*',          // LESS comments
  '.java': '//',
  '.py': '#',
  '.rb': '#',
  '.sh': '#',
  '.c': '//',
  '.cpp': '//',
  '.cs': '//',
  '.php': '//',
  '.xml': '<!--',         // XML comments
  '.yml': '#',            // YAML comments
  '.yaml': '#',           // YAML comments
  'Dockerfile': '#',      // Dockerfile comments
  '.md': '<!--',          // Markdown with HTML comments
};

function getCommentSymbol(filename) {
  const ext = Object.keys(supportedExtensions).find(ext => filename.endsWith(ext));
  return supportedExtensions[ext];
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processFile(action, filename, regexPattern, stringsArray) {
  const commentSymbol = getCommentSymbol(filename);

  if (!commentSymbol) {
    console.error(`Unsupported file type for '${filename}'. No comment symbol found.`);
    return;
  }

  const endCommentSymbol = commentSymbol === '<!--' ? '-->' : (commentSymbol === '/*' ? '*/' : '');

  // Escape the regex pattern to prevent injection
  const escapedPattern = escapeRegex(regexPattern);
  const regex = new RegExp(escapedPattern);
  const strings = stringsArray.split(',');

  // Check if the file exists
  if (!shell.test('-f', filename)) {
    console.error(`File not found: '${filename}'`);
    return;
  }

  // Read the file content using shelljs
  const fileContent = shell.cat(filename).stdout;
  const lines = fileContent.split('\n');

  const processedLines = lines.map(line => {
    const containsString = strings.some(str => line.includes(str));

    // Match leading whitespace
    const leadingWhitespaceMatch = line.match(/^\s*/);
    const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : '';

    // Identify comment parts of the line
    const commentIndex = line.indexOf(commentSymbol);
    const mainPart = commentIndex > -1 ? line.substring(leadingWhitespace.length + commentSymbol.length).trim() : line.trim();
    const inlineComment = commentIndex > -1 ? line.substring(commentIndex) : '';

    let isCommented = commentIndex === leadingWhitespace.length;

    if (commentSymbol && inlineComment.trim().startsWith(commentSymbol)) {
      isCommented = true;
    }

    if (action === 'comment' && (regex.test(mainPart) || containsString) && !isCommented) {
      if (commentSymbol === '<!--' || commentSymbol === '/*') {
        return `${leadingWhitespace}${commentSymbol} ${mainPart} ${endCommentSymbol} ${inlineComment}`.trim();
      }
      return `${leadingWhitespace}${commentSymbol} ${mainPart} ${inlineComment}`.trim();
    } else if (action === 'uncomment' && isCommented) {
      // Only remove the comment at the start of the line
      if (commentSymbol === '<!--' || commentSymbol === '/*') {
        const startRegex = new RegExp(`^\\s*${escapeRegex(commentSymbol)}\\s*`);
        const endRegex = new RegExp(`\\s*${escapeRegex(endCommentSymbol)}\\s*$`);
        const cleanedPart = mainPart.replace(startRegex, '').replace(endRegex, '').trim();
        return `${leadingWhitespace}${cleanedPart} ${inlineComment}`.trim();
      }
      const cleanedPart = line.slice(leadingWhitespace.length + commentSymbol.length).trim();
      return `${leadingWhitespace}${cleanedPart} ${inlineComment}`.trim();
    }
    return line;
  });

  // Write back to the file using shelljs
  shell.ShellString(processedLines.join('\n')).to(filename);
  console.log(`Lines have been processed in '${filename}' with action '${action}'.`);
}

// Command-line arguments
const [action, filename, regexPattern, stringsArray] = process.argv.slice(2);

if (!action || !filename || !regexPattern || !stringsArray) {
  console.error('Usage: node index.js <action> <filename> <regexPattern> <string1,string2,...>');
  process.exit(1);
}

processFile(action, filename, regexPattern, stringsArray);
