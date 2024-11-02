import fs from 'fs-extra';

// Helper function to determine the comment symbol based on file extension
function getCommentSymbol(filename) {
    if (filename.match(/\.(js|jsx|ts|tsx|c|cpp|cs|java|php)$/)) return '//';
    if (filename.match(/\.(py|rb|sh|yml|yaml)$/) || filename === 'Dockerfile') return '#';
    if (filename.match(/\.(html|xml|md)$/)) return '<!-- -->';
    if (filename.match(/\.(css|scss|less)$/)) return '/* */';
    return '//';  // Default
}

// Helper function to escape special characters for use in regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to detect line endings
function detectLineEnding(content) {
    const crlf = /\r\n/;
    return crlf.test(content) ? '\r\n' : '\n';
}

// Main function to process the file
export async function processFile(action, filename, regexPattern, strings, options = {}) {
    const { silent = false, multiline = false } = options;

    try {
        let content = await fs.readFile(filename, 'utf8');

        // Detect original line endings
        const originalLineEnding = detectLineEnding(content);

        // Normalize line endings to LF for consistent processing
        content = content.replace(/\r\n/g, '\n');

        const commentSymbol = getCommentSymbol(filename);
        const startComment = commentSymbol.split(' ')[0];
        const endComment = commentSymbol.split(' ')[1] ? commentSymbol.split(' ')[1] : '';

        const processSingleLineComment = (commentRegex, actionType) => {
            if (actionType === 'comment') {
                content = content.replace(commentRegex, (match, p1, p2) => {
                    // Skip lines only if they already start with the comment symbol
                    if (p2.trimStart().startsWith(commentSymbol)) {
                        return match;
                    }
                    return `${p1}${startComment} ${p2}`;
                });
            } else if (actionType === 'uncomment') {
                content = content.replace(commentRegex, (match, p1, p2) => {
                    return `${p1}${p2}`;
                });
            }
        };

        const processPythonComment = (safeRegexPattern) => {
            const regex = new RegExp(`^\\s*${safeRegexPattern}`, 'gm');
            content = content.replace(regex, (match) => {
                if (match.trimStart().startsWith(commentSymbol)) {
                    return match;
                }
                return `${startComment} ${match}`;
            });
        };

        const processCssComment = (safeRegexPattern) => {
            const regex = new RegExp(safeRegexPattern, 'g');
            content = content.replace(regex, (match) => {
                // Wrap matched content in block comments
                return `/* ${match.trim()} */`;
            });
        };

        const processStringComments = (strings, action) => {
            strings.forEach((string) => {
                const escapedString = escapeRegExp(string);
                const commentRegex = new RegExp(`^([\\s]*)${action === 'uncomment' ? startComment + '\\s*' : ''}(.*${escapedString}.*)$`, 'gm');
                processSingleLineComment(commentRegex, action);
            });
        };

        const processRegexComments = (safeRegexPattern, action) => {
            const regexCommentRegex = new RegExp(`^([\\s]*)${action === 'uncomment' ? startComment + '\\s*' : ''}(.*${safeRegexPattern}.*)$`, 'gm');
            processSingleLineComment(regexCommentRegex, action);
        };

        if (action === 'comment' || action === 'uncomment') {
            if (multiline && endComment) {
                // Handle multiline comments
                if (regexPattern) {
                    const startPattern = startComment;
                    const endPattern = endComment;
                    processMultilineBlockComment(startPattern, endPattern, action);
                }
            } else {
                // Sanitize regexPattern before using it in a regex
                const safeRegexPattern = escapeRegExp(regexPattern);

                if (filename.endsWith('.py') && action === 'comment') {
                    processPythonComment(safeRegexPattern);
                } else if (filename.endsWith('.css') && action === 'comment') {
                    processCssComment(safeRegexPattern);
                } else {
                    if (strings && strings.length > 0) {
                        processStringComments(strings, action);
                    }

                    if (regexPattern) {
                        processRegexComments(safeRegexPattern, action);
                    }
                }
            }
        }

        // Restore original line endings
        content = content.replace(/\n/g, originalLineEnding);

        await fs.writeFile(filename, content, 'utf8');
        if (!silent) {
            console.log(`Successfully processed file ${filename}`);
        }
    } catch (error) {
        console.error(`Error processing file: ${error.message}`);
        process.exit(1);
    }
}

export default processFile;
