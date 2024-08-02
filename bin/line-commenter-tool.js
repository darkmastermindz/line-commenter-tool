#!/usr/bin/env node

var processFile = require('../src/index.js');

var action = process.argv[2];
var filename = process.argv[3];
var regexPattern = process.argv[4];
var strings = process.argv[5];

if (!action || !filename || !regexPattern || !strings) {
  console.error('Usage: line-commenter-tool <action> <filename> <regexPattern> <string1,string2,...>');
  process.exit(1);
}

processFile(action, filename, regexPattern, strings);
