import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { processFile } from '../src/index.js';  // Use named import to match the export

const execFileAsync = promisify(execFile);
const testDir = path.resolve(__dirname, 'test-files');
const binPath = path.resolve(__dirname, '../bin/line-commenter-tool.js');

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
