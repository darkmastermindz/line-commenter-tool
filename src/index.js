import fs from 'fs-extra';
import path from 'node:path';

/**
 * Escape RegExp metacharacters so the input matches literally when interpolated into `new RegExp(...)`.
 * @param {string} string - Raw text to escape.
 * @returns {string} The text with `. * + ? ^ $ { } ( ) | [ ] \` backslash-escaped.
 */
export function escapeRegExp(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @typedef {Object} CommentSymbol
 * @property {string|null} line - Single-line comment prefix, or null if the language only has block comments.
 * @property {string|null} blockStart - Block comment opener, or null if none.
 * @property {string|null} blockEnd - Block comment closer, or null if none.
 */
/**
 * Determine comment syntax from the file's extension or basename.
 * @param {string} filename - File path.
 * @returns {CommentSymbol}
 */
export function getCommentSymbol(filename) {
    const base = path.basename(filename);
    if (/\.(py|rb|sh|yml|yaml)$/.test(base) || base === 'Dockerfile') return { line: '#', blockStart: null, blockEnd: null };
    if (/\.sql$/.test(base)) return { line: '--', blockStart: '/*', blockEnd: '*/' };
    if (/\.(html|xml|md)$/.test(base)) return { line: null, blockStart: '<!--', blockEnd: '-->' };
    if (/\.(css|scss|less)$/.test(base)) return { line: null, blockStart: '/*', blockEnd: '*/' };
    return { line: '//', blockStart: '/*', blockEnd: '*/' }; // js/jsx/ts/tsx/c/cpp/cs/java/php and default
}

function createMatcher(regexPattern, strings) {
    const regex = regexPattern ? new RegExp(regexPattern, 'm') : null;   // no 'g' => .test() is stateless
    const literals = (strings || []).filter(Boolean);
    return text => (regex !== null && regex.test(text)) || literals.some(s => text.includes(s));
}

// Line mode: each line is transformed at most once (so a line matching both a string and the regex loses only one layer).
function transformLines(content, action, { line: lineSym, blockStart, blockEnd }, matches) {
    const prefix = lineSym ?? blockStart;
    const uncommentRe = lineSym
        ? new RegExp(`^([ \\t]*)${escapeRegExp(lineSym)}[ \\t]?([\\s\\S]*)$`)
        : new RegExp(`^([ \\t]*)${escapeRegExp(blockStart)}[ \\t]?([\\s\\S]*?)[ \\t]?${escapeRegExp(blockEnd)}[ \\t]*$`);
    return content.split('\n').map(text => {
        if (action === 'comment') {
            const [, indent, rest] = text.match(/^([ \t]*)([\s\S]*)$/);
            if (rest.startsWith(prefix) || !matches(text)) return text;   // already commented => skip
            return lineSym ? `${indent}${lineSym} ${rest}` : `${indent}${blockStart} ${rest} ${blockEnd}`;
        }
        const m = text.match(uncommentRe);
        if (!m || !matches(m[2])) return text;
        return `${m[1]}${m[2]}`;  // strips one layer + one optional space, keeps indentation
    }).join('\n');
}

// Block mode (--multiline), only when the language has blockStart/blockEnd.
function transformBlocks(content, action, { blockStart, blockEnd }, regexPattern, strings) {
    if (action === 'uncomment') {
        const matches = createMatcher(regexPattern, strings);
        const blockRe = new RegExp(`^([ \\t]*)${escapeRegExp(blockStart)}[ \\t]?([\\s\\S]*?)[ \\t]?${escapeRegExp(blockEnd)}`, 'gm'); // compiled once
        return content.replace(blockRe, (match, indent, inner) => (matches(match) ? `${indent}${inner}` : match));
    }
    // comment: each regex/string match (may span lines) is expanded to whole lines and wrapped in ONE block
    const sources = [regexPattern, ...(strings || []).filter(Boolean).map(escapeRegExp)].filter(Boolean);
    if (sources.length === 0) return content;
    const targetRe = new RegExp(sources.map(s => `(?:${s})`).join('|'), 'gm');
    let result = '';
    let last = 0;
    for (const m of content.matchAll(targetRe)) {
        if (m[0] === '') continue;
        const start = content.lastIndexOf('\n', m.index - 1) + 1;
        if (start < last) continue;               // overlaps a span already wrapped
        let end = m.index + m[0].length;
        if (content[end - 1] === '\n') end -= 1;
        const nl = content.indexOf('\n', end);
        end = nl === -1 ? content.length : nl;
        const span = content.slice(start, end);
        if (span.trimStart().startsWith(blockStart)) continue;
        const indent = span.match(/^[ \t]*/)[0];
        result += content.slice(last, start) + `${indent}${blockStart} ${span.slice(indent.length)} ${blockEnd}`;
        last = end;
    }
    return result + content.slice(last);
}

/**
 * Comment or uncomment matching lines in a file (in place unless dryRun).
 * @param {'comment'|'uncomment'} action
 * @param {string} filename - Path; comment syntax chosen via getCommentSymbol.
 * @param {string} [regexPattern] - JavaScript RegExp source matched against each line (line mode) or the whole file (multiline comment) / block body (multiline uncomment).
 * @param {string[]} [strings=[]] - Literal substrings; a line matching any of them (or the regex) is processed.
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] - Suppress the success log.
 * @param {boolean} [options.multiline=false] - Operate on block comments (only for languages with block syntax).
 * @param {boolean} [options.dryRun=false] - Return the result without writing the file.
 * @returns {Promise<string>} The resulting file content (original line endings preserved).
 * @throws {Error} On invalid action, invalid regex, or I/O failure ("Error processing file <name>: ..." with `cause`). Never calls process.exit.
 */
export async function processFile(action, filename, regexPattern, strings = [], options = {}) {
    const { silent = false, multiline = false, dryRun = false } = options;
    try {
        if (action !== 'comment' && action !== 'uncomment') {
            throw new Error(`Invalid action "${action}": expected "comment" or "uncomment"`);
        }
        const raw = await fs.readFile(filename, 'utf8');
        const lineEnding = raw.includes('\r\n') ? '\r\n' : '\n';
        const content = raw.replace(/\r\n/g, '\n');
        const symbols = getCommentSymbol(filename);
        const updated = (multiline && symbols.blockStart && symbols.blockEnd
            ? transformBlocks(content, action, symbols, regexPattern, strings)
            : transformLines(content, action, symbols, createMatcher(regexPattern, strings))
        ).replace(/\n/g, lineEnding);
        if (!dryRun) {
            await fs.writeFile(filename, updated, 'utf8');
            if (!silent) console.log(`Successfully processed file ${filename}`);
        }
        return updated;
    } catch (error) {
        throw new Error(`Error processing file ${filename}: ${error.message}`, { cause: error });
    }
}

export default processFile;
