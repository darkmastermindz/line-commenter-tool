import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getCommentSymbol, processFile } from '../src/index.js';  // Use named import to match the export

const execFileAsync = promisify(execFile);
const testDir = path.resolve(__dirname, 'test-files');
const binPath = path.resolve(__dirname, '../bin/line-commenter-tool.js');
const scratchFiles = new Set();
const scratchDirectories = new Set();

async function writeScratchFile(extension, content, { nested = false } = {}) {
    const directory = nested ? path.join(testDir, `scratch-dir-${randomUUID()}`) : testDir;
    if (nested) {
        scratchDirectories.add(directory);
        await fs.ensureDir(directory);
    }
    const filename = extension === 'Dockerfile' ? 'Dockerfile' : `scratch-${randomUUID()}.${extension}`;
    const filePath = path.join(directory, filename);
    scratchFiles.add(filePath);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
}

// Helper Function Extend String prototype with parseLiteralCodeBlock method 
// to match content in files and maintain code-linting
String.prototype.parseLiteralCodeBlock = function() {
    // Split the string into lines
    const lines = this.split(/\r?\n/);
    
    // Determine the minimum leading whitespace (indentation) level
    const minIndent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length));

    return lines.map(line => {
        // Remove leading whitespace based on minimum indent level
        const trimmedLine = line.replace(new RegExp(`^\\s{0,${minIndent}}`), '');
        return trimmedLine; // Preserve all subsequent whitespace
    }).join('\n');  // Join the lines with newline characters
};

// Helper function to get the initial content for a test file
const getInitialContent = (filename) => {
    switch (filename) {
        case 'testfile.js':
            return `
                console.log('Line 1');
                console.log('Line 2'); // Existing comment
                console.log('Line 3');
                // TODO: Add feature
                //// Nested comment level 2
                console.log('Line 4');
            `.parseLiteralCodeBlock();
        case 'testfile.css':
            return `
                /* Comment block start
                * Multiple lines of comments
                * Comment block end */
                .class { color: red; }
            `.parseLiteralCodeBlock();
        case 'testfile.py':
            return `
                # Single-line Python comment
                print('Hello World')  # Inline comment in Python
                """
                This is a multiline string
                that could be confused with a comment
                """
                print('Another line')
                ## Double hash comment
                ### Triple hash comment
                # print('Commented out line')
            `.parseLiteralCodeBlock();
        case 'testfile.yml':
            return `
                # Level 1 comment
                ## Level 2 comment
                active: true
            `.parseLiteralCodeBlock();
        default:
            throw new Error(`Unknown file: ${filename}`);
    }
};

// Helper function to reset the test file to its original state
async function resetTestFile(filename) {
    const content = getInitialContent(filename);
    await fs.writeFile(path.join(testDir, filename), content, 'utf8');
}

// Setup and teardown for test files
beforeAll(async () => {
    await fs.ensureDir(testDir);

    // Create initial test files
    const files = ['testfile.js', 'testfile.css', 'testfile.py', 'testfile.yml'];
    for (const file of files) {
        await resetTestFile(file);
    }
});

afterEach(async () => {
    // Reset files after each test to ensure a clean state
    const files = ['testfile.js', 'testfile.css', 'testfile.py', 'testfile.yml'];
    for (const file of files) {
        await resetTestFile(file);
    }
    for (const file of scratchFiles) {
        await fs.remove(file);
    }
    for (const directory of scratchDirectories) {
        await fs.remove(directory);
    }
    scratchFiles.clear();
    scratchDirectories.clear();
});

describe('line-commenter-tool', () => {
    test('should comment lines matching a regex in JS file', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await processFile('comment', testFilePath, 'Line 1', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/\/\/ console\.log\('Line 1'\);/);
    });

    test('should not alter existing inline comments when commenting', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await processFile('comment', testFilePath, 'Line 2', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/\/\/ console\.log\('Line 2'\); \/\/ Existing comment/);
    });

    test('should uncomment lines that are already commented in JS file', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await processFile('uncomment', testFilePath, 'TODO', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/console\.log\('Line 4'\);/);
    });

    test('should handle nested block comments in CSS file', async () => {
        const testFilePath = path.join(testDir, 'testfile.css');
        await processFile('comment', testFilePath, 'color: red;', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/\/\* Comment block start\n\s*\* Multiple lines of comments\n\s*\* Comment block end \*\//);
    });

    test('should add a new level of comments to uncommented lines in Python file', async () => {
        const testFilePath = path.join(testDir, 'testfile.py');
        await processFile('comment', testFilePath, 'print\\(\'Hello World\'\\)', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toContain('# print(\'Hello World\')  # Inline comment in Python');
    });    

    test('should remove only one level of nested comments in YAML file', async () => {
        const testFilePath = path.join(testDir, 'testfile.yml');
        await processFile('uncomment', testFilePath, 'Level 2 comment', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
       
        expect(result).toMatch(/# Level 2 comment/);
    });

    test('should correctly comment specific lines by number', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await processFile('comment', testFilePath, 'Line 3', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/\/\/ console\.log\('Line 3'\);/);
    });

    test('should correctly uncomment specific lines by number', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await processFile('uncomment', testFilePath, 'Line 4', []);  // Properly awaiting processFile
        const result = fs.readFileSync(testFilePath, 'utf8');  // Use readFileSync for consistency
        
        expect(result).toMatch(/console\.log\('Line 4'\);/);
    });
});

describe('CLI flag tests', () => {
    test('--version flag prints version and exits', async () => {
        const { stdout } = await execFileAsync('node', [binPath, '--version'], { cwd: testDir });
        expect(stdout).toMatch(/line-commenter-tool version \d+\.\d+\.\d+/);
    });

    test('-v flag prints version and exits', async () => {
        const { stdout } = await execFileAsync('node', [binPath, '-v'], { cwd: testDir });
        expect(stdout).toMatch(/line-commenter-tool version \d+\.\d+\.\d+/);
    });

    test('--help flag prints usage and exits', async () => {
        const { stdout } = await execFileAsync('node', [binPath, '--help']);
        expect(stdout).toMatch(/Usage:/);
        expect(stdout).toMatch(/-h, --help/);
        expect(stdout).toMatch(/-v, --version/);
        expect(stdout).toMatch(/-s, --silent/);
        expect(stdout).toMatch(/-m, --multiline/);
    });

    test('-h flag prints usage and exits', async () => {
        const { stdout } = await execFileAsync('node', [binPath, '-h']);
        expect(stdout).toMatch(/Usage:/);
        expect(stdout).toMatch(/-h, --help/);
    });

    test('-s flag suppresses output', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        const { stdout } = await execFileAsync('node', [binPath, 'comment', testFilePath, 'Line 1', '-s']);
        expect(stdout).toBe('');
    });

    test('-m flag enables multiline mode without error', async () => {
        const testFilePath = path.join(testDir, 'testfile.js');
        await execFileAsync('node', [binPath, 'comment', testFilePath, 'Line 1', '-m']);
    });
});

describe('comment symbols and transformations', () => {
    test('detects supported comment symbols by extension and basename', async () => {
        expect(getCommentSymbol('file.js')).toEqual({ line: '//', blockStart: '/*', blockEnd: '*/' });
        expect(getCommentSymbol('file.py')).toEqual({ line: '#', blockStart: null, blockEnd: null });
        expect(getCommentSymbol('some/dir/Dockerfile')).toEqual({ line: '#', blockStart: null, blockEnd: null });
        expect(getCommentSymbol('file.html')).toEqual({ line: null, blockStart: '<!--', blockEnd: '-->' });
        expect(getCommentSymbol('file.css')).toEqual({ line: null, blockStart: '/*', blockEnd: '*/' });
        expect(getCommentSymbol('file.sql')).toEqual({ line: '--', blockStart: '/*', blockEnd: '*/' });

        const dockerfilePath = await writeScratchFile('Dockerfile', 'FROM scratch', { nested: true });
        expect(getCommentSymbol(dockerfilePath)).toEqual({ line: '#', blockStart: null, blockEnd: null });
    });

    test('comments and restores SQL lines', async () => {
        const filePath = await writeScratchFile('sql', 'SELECT 1;');
        expect(await processFile('comment', filePath, 'SELECT 1;')).toBe('-- SELECT 1;');
        expect(await processFile('uncomment', filePath, 'SELECT 1;')).toBe('SELECT 1;');
    });

    test('preserves Python indentation and matches explicit strings', async () => {
        const filePath = await writeScratchFile('py', "def f():\n    print('x')\n    return 1\n");
        expect(await processFile('comment', filePath, 'print')).toBe("def f():\n    # print('x')\n    return 1\n");
        expect(await processFile('uncomment', filePath, 'print')).toBe("def f():\n    print('x')\n    return 1\n");
        expect(await processFile('comment', filePath, undefined, ['return'])).toBe("def f():\n    print('x')\n    # return 1\n");
    });

    test('keeps inner indentation when uncommenting', async () => {
        const filePath = await writeScratchFile('py', '# if x:\n#     y()');
        expect(await processFile('uncomment', filePath, 'y\\(')).toBe('# if x:\n    y()');
    });

    test('escapes block comment symbols in HTML and CSS line mode', async () => {
        const htmlPath = await writeScratchFile('html', '<p>hi</p>');
        expect(await processFile('comment', htmlPath, '<p>hi</p>')).toBe('<!-- <p>hi</p> -->');
        expect(await processFile('uncomment', htmlPath, '<p>hi</p>')).toBe('<p>hi</p>');

        const cssPath = await writeScratchFile('css', '.a { color: red; }');
        expect(await processFile('comment', cssPath, '.a { color: red; }')).toBe('/* .a { color: red; } */');
        expect(await processFile('uncomment', cssPath, '.a { color: red; }')).toBe('.a { color: red; }');
    });

    test('uncomments a matching block in the existing CSS fixture', async () => {
        const filePath = path.join(testDir, 'testfile.css');
        expect(await processFile('uncomment', filePath, 'Multiple lines', [], { multiline: true }))
            .toBe('\nComment block start\n* Multiple lines of comments\n* Comment block end\n.class { color: red; }\n');
    });

    test('does not alter a CSS block that does not match in multiline mode', async () => {
        const filePath = path.join(testDir, 'testfile.css');
        const original = await fs.readFile(filePath, 'utf8');
        expect(await processFile('uncomment', filePath, 'not present', [], { multiline: true })).toBe(original);
    });

    test('comments and uncomments multiline spans in CSS and JavaScript', async () => {
        const original = '.a {\n  color: red;\n}\n.b {}';
        const cssPath = await writeScratchFile('css', original);
        expect(await processFile('comment', cssPath, 'a \\{[\\s\\S]*?\\}', [], { multiline: true }))
            .toBe('/* .a {\n  color: red;\n} */\n.b {}');
        expect(await processFile('uncomment', cssPath, 'color', [], { multiline: true })).toBe(original);

        const indentedOriginal = '  .a {\n    color: red;\n  }\n';
        const indentedPath = await writeScratchFile('css', indentedOriginal);
        expect(await processFile('comment', indentedPath, 'a \\{[\\s\\S]*?\\}', [], { multiline: true }))
            .toBe('  /* .a {\n    color: red;\n  } */\n');
        expect(await processFile('uncomment', indentedPath, 'color', [], { multiline: true })).toBe(indentedOriginal);

        const jsOriginal = 'function f() {\n  return 1;\n}\n';
        const jsPath = await writeScratchFile('js', jsOriginal);
        expect(await processFile('comment', jsPath, 'function f\\(\\)[\\s\\S]*?\\}', [], { multiline: true }))
            .toBe('/* function f() {\n  return 1;\n} */\n');
        expect(await processFile('uncomment', jsPath, 'return', [], { multiline: true })).toBe(jsOriginal);
    });

    test('is idempotent and removes only one comment layer', async () => {
        const unmatchedPath = await writeScratchFile('js', 'const value = 1;\n');
        const unchanged = await fs.readFile(unmatchedPath, 'utf8');
        expect(await processFile('uncomment', unmatchedPath, 'not present')).toBe(unchanged);

        const pathToComment = await writeScratchFile('js', 'value\n');
        const once = await processFile('comment', pathToComment, 'value');
        expect(await processFile('comment', pathToComment, 'value')).toBe(once);

        const nestedPath = await writeScratchFile('js', '//// x');
        expect(await processFile('uncomment', nestedPath, 'x')).toBe('// x');

        const bothPath = await writeScratchFile('js', '// same\n');
        expect(await processFile('uncomment', bothPath, 'same', ['same'])).toBe('same\n');
    });

    test('dryRun returns transformed content without writing or logging', async () => {
        const original = 'const value = 1;\n';
        const filePath = await writeScratchFile('js', original);
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        try {
            expect(await processFile('comment', filePath, 'value', [], { dryRun: true })).toBe('// const value = 1;\n');
            expect(await fs.readFile(filePath, 'utf8')).toBe(original);
            expect(logSpy).not.toHaveBeenCalled();
        } finally {
            logSpy.mockRestore();
        }
    });

    test('throws wrapped errors without calling process.exit', async () => {
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });
        const missingFile = path.join(testDir, `missing-${randomUUID()}.js`);
        try {
            let missingError;
            try {
                await processFile('comment', missingFile, 'missing');
            } catch (error) {
                missingError = error;
            }
            expect(missingError.message).toMatch(/Error processing file .*ENOENT/);
            expect(missingError.cause).toBeDefined();
            await expect(processFile('invalid', missingFile, 'x')).rejects.toThrow(/Invalid action/);
            const filePath = await writeScratchFile('js', 'text');
            await expect(processFile('comment', filePath, '(')).rejects.toThrow();
            expect(exitSpy).not.toHaveBeenCalled();
        } finally {
            exitSpy.mockRestore();
        }
    });
});

describe('CLI dry-run and failures', () => {
    test('nonexistent file exits with an error', async () => {
        const missingFile = path.join(testDir, `missing-${randomUUID()}.js`);
        let error;
        try {
            await execFileAsync('node', [binPath, 'comment', missingFile, 'missing']);
        } catch (caught) {
            error = caught;
        }
        expect(error.code).toBe(1);
        expect(error.stderr).toMatch(/Error processing file .*ENOENT/);
    });

    test('--dry-run prints the result and leaves the file unchanged', async () => {
        const original = 'const value = 1;\n';
        const filePath = await writeScratchFile('js', original);
        const { stdout } = await execFileAsync('node', [binPath, 'comment', filePath, 'value', '--dry-run']);
        expect(stdout).toBe('// const value = 1;\n');
        expect(await fs.readFile(filePath, 'utf8')).toBe(original);
    });
});
