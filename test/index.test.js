var processFile = require('../src/index.js');
var fs = require('fs');
var path = require('path');

// Set up test file paths and contents
var testFiles = [
  { 
    path: path.resolve(__dirname, './testFile.js'), 
    content: `console.log('Line 1');
console.log('Line 2'); // Existing comment
console.log('Line 3');
// TODO: Add feature
//// Nested comment level 2
console.log('Line 4');
` 
  },
  { 
    path: path.resolve(__dirname, './testFile.html'), 
    content: `<!-- Initial comment -->
<p>Paragraph</p>
<p>Another paragraph</p>
<!--<!-- Nested HTML comment level 2 -->
<p>Last paragraph</p>
` 
  },
  { 
    path: path.resolve(__dirname, './testFile.css'), 
    content: `/* Initial CSS comment */
body { margin: 0; }
div { padding: 0; }
/*/* Nested CSS comment level 2 */
span { display: none; }
` 
  },
  { 
    path: path.resolve(__dirname, './testFile.py'), 
    content: `# Initial Python comment
print('Hello World')
print('Another line')
## Nested Python comment level 2
print('Last line')
` 
  },
  { 
    path: path.resolve(__dirname, './testFile.yml'), 
    content: `# Initial YAML comment
key: value
another_key: another_value
## Nested YAML comment level 2
final_key: final_value
` 
  },
];

describe('line-commenter-tool', function() {
  beforeEach(function() {
    // Reset test files before each test
    testFiles.forEach(function(file) {
      fs.writeFileSync(file.path, file.content);
    });
  });

  afterAll(function() {
    // Clean up test files after all tests
    testFiles.forEach(function(file) {
      fs.unlinkSync(file.path);
    });
  });

  test('should comment lines matching a regex in JS file', function() {
    var jsFile = testFiles[0].path;
    processFile('comment', jsFile, 'Line 1', '');
    var result = fs.readFileSync(jsFile, 'utf8');
    expect(result).toMatch(/\/\/ console\.log\('Line 1'\);/);
  });

  test('should not alter existing inline comments when commenting', function() {
    var jsFile = testFiles[0].path;
    processFile('comment', jsFile, 'Line 2', '');
    var result = fs.readFileSync(jsFile, 'utf8');
    expect(result).toMatch(/\/\/ console\.log\('Line 2'\); \/\/ Existing comment/);
  });

  test('should uncomment lines that are already commented in HTML file', function() {
    var htmlFile = testFiles[1].path;
    processFile('uncomment', htmlFile, 'Initial', '');
    var result = fs.readFileSync(htmlFile, 'utf8');
    expect(result).toMatch(/Initial comment -->/);
  });

  test('should handle nested block comments in CSS file', function() {
    var cssFile = testFiles[2].path;
    processFile('uncomment', cssFile, 'Nested', '');
    var result = fs.readFileSync(cssFile, 'utf8');
    expect(result).toMatch(/\/\* Nested CSS comment level 2 \*\//);
  });

  test('should add a new level of comments to uncommented lines in Python file', function() {
    var pyFile = testFiles[3].path;
    processFile('comment', pyFile, 'print\\(\'Hello World\'\\)', '');
    var result = fs.readFileSync(pyFile, 'utf8');
    expect(result).toMatch(/# print\('Hello World'\)/);
  });

  test('should remove only one level of nested comments in YAML file', function() {
    var ymlFile = testFiles[4].path;
    processFile('uncomment', ymlFile, 'Nested', '');
    var result = fs.readFileSync(ymlFile, 'utf8');
    expect(result).toMatch(/# Nested YAML comment level 2/);
  });

  test('should correctly comment specific lines by number', function() {
    var jsFile = testFiles[0].path;
    // Simulate commenting line 4
    var fileContent = fs.readFileSync(jsFile, 'utf8').split('\n');
    fileContent[3] = '// ' + fileContent[3];
    fs.writeFileSync(jsFile, fileContent.join('\n'));
    
    var result = fs.readFileSync(jsFile, 'utf8');
    expect(result).toMatch(/\/\/ TODO: Add feature/);
  });

  test('should correctly uncomment specific lines by number', function() {
    var jsFile = testFiles[0].path;
    // Simulate uncommenting line 2
    processFile('uncomment', jsFile, 'Line 2', '');
    var result = fs.readFileSync(jsFile, 'utf8');
    expect(result).toMatch(/console\.log\('Line 2'\); \/\/ Existing comment/);
  });
});
