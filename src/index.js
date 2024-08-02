var shell = require('shelljs');

// Mapping of file extensions to comment symbols
var supportedExtensions = {
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
  '.json': '//',          // JSON comments (unofficial)
  '.jsonc': '//',         // JSON with comments
  'Dockerfile': '#',      // Dockerfile comments
  '.md': '<!--',          // Markdown with HTML comments
  // Add more mappings as needed
};

function getCommentSymbol(filename) {
  // Extract the file extension by finding the last dot in the filename
  var ext = filename.indexOf('.') !== -1 ? filename.substring(filename.lastIndexOf('.')) : '';
  // Special case for Dockerfile, which has no extension
  if (filename === 'Dockerfile') {
    return supportedExtensions['Dockerfile'];
  }
  return supportedExtensions[ext] || '//'; // Default to '//' if not found
}

function processFile(action, filename, regexPattern, stringsArray) {
  var regex = new RegExp(regexPattern);
  var strings = stringsArray.split(',');

  // Determine the comment symbol based on file type
  var commentSymbol = getCommentSymbol(filename);
  var endCommentSymbol = commentSymbol === '<!--' ? '-->' : (commentSymbol === '/*' ? '*/' : '');

  // Read the file using shelljs
  var fileContent = shell.cat(filename).stdout;
  var lines = fileContent.split('\n');

  var processedLines = lines.map(function(line) {
    var containsString = strings.some(function(str) {
      return line.indexOf(str) !== -1;
    });

    // Split the line at the first occurrence of the comment symbol to preserve inline comments
    var commentIndex = line.indexOf(commentSymbol);
    if (commentIndex === -1) {
      commentIndex = line.indexOf('#'); // For hash-based comments
    }
    if (commentIndex === -1) {
      commentIndex = line.indexOf('<!--'); // For HTML comments
    }
    var mainPart = commentIndex > -1 ? line.substring(0, commentIndex).trim() : line.trim();
    var inlineComment = commentIndex > -1 ? line.substring(commentIndex) : '';

    // Determine how many comment symbols are present at the start of the main part
    var commentLevel = 0;
    var tempLine = mainPart;
    while (tempLine.indexOf(commentSymbol) === 0) {
      commentLevel++;
      tempLine = tempLine.slice(commentSymbol.length).trim();
    }

    // Check if the main part is already commented
    var isCommented = commentLevel > 0;

    if (action === 'comment') {
      if ((regex.test(mainPart) || containsString) && !isCommented) {
        // Add an additional layer of comments to the main part
        if (commentSymbol === '<!--' || commentSymbol === '/*') {
          return commentSymbol + ' ' + mainPart.trim() + ' ' + endCommentSymbol + ' ' + inlineComment;
        }
        return commentSymbol + ' ' + mainPart + ' ' + inlineComment;
      }
    } else if (action === 'uncomment') {
      if (isCommented) {
        if (commentSymbol === '<!--' || commentSymbol === '/*') {
          // Remove one layer of block comments from the main part
          var startRegex = new RegExp('^\\s*' + commentSymbol + '\\s*');
          var endRegex = new RegExp('\\s*' + endCommentSymbol + '\\s*$');
          mainPart = mainPart.replace(startRegex, '').replace(endRegex, '').trim();
        } else {
          // Remove one level of single-line comments from the main part
          mainPart = mainPart.slice(commentSymbol.length).trim();
        }
        return mainPart + ' ' + inlineComment;
      }
    }
    return line;
  });

  // Write back to the file using shelljs
  shell.ShellString(processedLines.join('\n')).to(filename);
  console.log("Lines have been processed in '" + filename + "' with action '" + action + "'.");
}

module.exports = processFile;
