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

        const processMultilineBlockComment = (startPattern, endPattern, actionType) => {
            const blockCommentRegex = new RegExp(
                `^([\s]*)${startPattern}\s*[\s\S]*?${endPattern}`,
                'gm'
            );
            if (actionType === 'comment') {
                content = content.replace(blockCommentRegex, match => {
                    // Properly handle nested block comments
                    if (match.trim().startsWith(startPattern)) {
                        return match;
                    }
                    return `${startPattern} ${match.trim()} ${endPattern}`;
                });
            } else if (actionType === 'uncomment') {
                content = content.replace(blockCommentRegex, match => match.replace(new RegExp(`^\s*${startPattern}\s*|\s*${endPattern}\s*$`, 'g'), ''));
            }
        };

        const processPythonMultilineStrings = (actionType) => {
            const tripleQuoteRegex = /(["']{3})([\s\S]*?)\1/gm;
            if (actionType === 'comment') {
                content = content.replace(tripleQuoteRegex, (match, p1, p2) => {
                    // Skip processing inside triple-quoted strings
                    return match;
                });
            }
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
                if (filename.endsWith('.py') && action === 'comment') {
                    // Process Python multiline strings first to avoid modifying them
                    processPythonMultilineStrings(action);

                    const regex = new RegExp(`^\s*${regexPattern}`, 'gm');
                    content = content.replace(regex, (match) => {
                        if (match.trimStart().startsWith(commentSymbol)) {
                            return match;
                        }
                        return `${startComment} ${match}`;
                    });
                } else if (filename.endsWith('.css') && action === 'comment') {
                    const regex = new RegExp(regexPattern, 'g');
                    content = content.replace(regex, (match) => {
                        // Wrap matched content in block comments
                        return `/* ${match.trim()} */`;
                    });
                } else {
                    if (strings && strings.length > 0) {
                        strings.forEach((string) => {
                            const escapedString = escapeRegExp(string);
                            const commentRegex = new RegExp(`^([\s]*)${action === 'uncomment' ? startComment + '\s*' : ''}(.*${escapedString}.*)$`, 'gm');
                            processSingleLineComment(commentRegex, action);
                        });
                    }

                    if (regexPattern) {
                        const regexCommentRegex = new RegExp(`^([\s]*)${action === 'uncomment' ? startComment + '\s*' : ''}(.*${regexPattern}.*)$`, 'gm');
                        processSingleLineComment(regexCommentRegex, action);
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
