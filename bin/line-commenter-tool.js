#!/usr/bin/env node

import chalk from 'chalk';
import processFile, { escapeRegExp } from '../src/index.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const args = process.argv.slice(2);

const format = {
    usage: chalk.bold.cyan,
    description: chalk.bold.cyan,
    action: chalk.bold,
    argument: chalk.bold,
    option: chalk.yellow,
    example: chalk.dim,
    success: chalk.green.bold,
    error: chalk.red.bold,
    note: chalk.yellow,
    highlight: chalk.green.bold,
    file: chalk.cyan.bold,
};

async function loadPackageJson() {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJson = await readFile(packageJsonPath, 'utf-8');
    return JSON.parse(packageJson);
}

async function main() {
    if (args.includes('--help')) {
        console.log(`
${format.usage('Usage:')} ${format.action('line-commenter-tool')} <action> <filename> <regexPattern> [string1,string2,...]

${format.description('Description:')}
  The ${format.action('line-commenter-tool')} is a command-line utility designed to ${format.highlight('comment')} or ${format.highlight('uncomment')} specific lines in a file
  based on a regex pattern or specific strings. It supports various file formats and comment styles, making it 
  versatile for multiple programming languages.

  This tool works by searching for lines in the specified file that match the given regex pattern or strings.
  Depending on the specified action (${format.highlight('comment')} or ${format.highlight('uncomment')}), the tool will either add or remove comment
  markers on those lines.

${format.usage('Actions:')}
  ${format.highlight('comment')}     Adds comment markers to lines that match the regex pattern or strings.
  ${format.highlight('uncomment')}   Removes comment markers from lines that match the regex pattern or strings.

${format.usage('Arguments:')}
  ${format.argument('<action>')}          The action to perform: ${format.highlight('comment')} or ${format.highlight('uncomment')}.
  ${format.argument('<filename>')}        The file to process.
  ${format.argument('<regexPattern>')}    A regex pattern to identify lines to be commented or uncommented.
  ${format.argument('[string1,string2,...]')} ${format.option('(Optional)')} A comma-separated list of strings to be matched exactly.

${format.usage('Options:')}
  ${format.option('--help')}          Show this help message and exit.
  ${format.option('--version')}       Show the tool's version and exit.
  ${format.option('--silent')}        Suppress output messages. When this flag is used, the tool will run without logging any 
                  success or error messages.
  ${format.option('--multiline')}     Enable processing of multiline comments. When this flag is used, the tool will comment or
                  uncomment entire multiline block comments (e.g., /* ... */, <!-- ... -->) based on a full 
                  match of the regex pattern.

${format.usage('Examples:')}
  ${format.example('1.')} ${format.highlight('Comment')} all lines containing the string ${format.argument('console.log')} in a JavaScript file:
     ${format.file('$ line-commenter-tool comment app.js "console\\.log"')}

  ${format.example('2.')} ${format.highlight('Uncomment')} all lines that match the regex pattern ${format.argument('TODO')} in a Python file:
     ${format.file('$ line-commenter-tool uncomment script.py "TODO"')}

  ${format.example('3.')} ${format.highlight('Comment')} specific lines in a file using multiple strings:
     ${format.file('$ line-commenter-tool comment config.yml "DEBUG" "error,warning"')}

  ${format.example('4.')} ${format.highlight('Uncomment')} a full multiline block comment in a CSS file:
     ${format.file('$ line-commenter-tool uncomment styles.css "/*" --multiline')}

${format.usage('Notes:')}
  ${format.note('⚠️')} The tool is case-sensitive by default. Ensure your regex patterns and strings match the case of the content
    you want to comment or uncomment.
  ${format.note('💡')} The ${format.option('--multiline')} option is particularly useful for handling languages that use block comments for larger sections
    of code, such as CSS, HTML, or JavaScript.
`);
        process.exit(0);
    }

    if (args.includes('--version')) {
        const pkg = await loadPackageJson();
        console.log(`${format.action('line-commenter-tool')} version ${format.highlight(pkg.version)}`);
        process.exit(0);
    }

    const silent = args.includes('--silent');
    const multiline = args.includes('--multiline');
    const filteredArgs = args.filter(arg => !arg.startsWith('--'));

    const action = filteredArgs[0];
    const filename = filteredArgs[1];
    const regexPattern = filteredArgs[2];
    const strings = filteredArgs[3] ? filteredArgs[3].split(',') : [];

    if (!action || !filename || !regexPattern) {
        console.error(`${format.error('Error:')} Invalid usage. ${format.option('Usage:')} ${format.action('line-commenter-tool')} <action> <filename> <regexPattern> [string1,string2,...]`);
        process.exit(1);
    }

    try {
        const options = { silent, multiline };
        const sanitizedRegexPattern = escapeRegExp(regexPattern);
        await processFile(action, filename, sanitizedRegexPattern, strings, options);
        if (!silent) {
            console.log(format.success(filename));
        }
    } catch (error) {
        console.error(format.error(error.message));
        process.exit(1);
    }
}

main();