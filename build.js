const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function minify(code) {
  const strings = [];
  // Tokenize strings to make the minifier string-safe (handles single, double, and backtick quotes with escapes)
  const stringRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g;
  
  let minified = code.replace(stringRegex, (match) => {
    strings.push(match);
    return `__STR_LIT_PLACEHOLDER_${strings.length - 1}__`;
  });
  
  // Remove block comments
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single line comments
  minified = minified.replace(/\/\/[^\r\n]*/g, '');
  
  // Replace newlines and carriage returns with spaces
  minified = minified.replace(/[\r\n]+/g, ' ');
  // Collapse multiple whitespace characters into a single space
  minified = minified.replace(/\s+/g, ' ');
  
  // Remove spaces around common symbols/operators
  const symbols = ['{', '}', '(', ')', '[', ']', ',', ';', ':', '=', '+', '-', '*', '/', '%', '<', '>', '&', '|', '!', '?', '^', '~'];
  for (const sym of symbols) {
    const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    minified = minified.replace(new RegExp(`\\s*${escaped}\\s*`, 'g'), sym);
  }
  
  // Restore strings
  minified = minified.replace(/__STR_LIT_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return strings[parseInt(index, 10)];
  });
  
  return minified.trim();
}

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (filePath.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

function run() {
  console.log('Compiling TypeScript...');
  try {
    console.log('Building CommonJS (CJS)...');
    execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
    
    console.log('Building ES Modules (ESM)...');
    execSync('npx tsc -p tsconfig.esm.json', { stdio: 'inherit' });
  } catch (err) {
    console.error('Compilation failed:', err);
    process.exit(1);
  }

  console.log('\nMinifying output files...');
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('Dist folder does not exist.');
    process.exit(1);
  }

  const jsFiles = getFilesRecursively(distDir);
  let totalSize = 0;

  jsFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const minifiedContent = minify(content);
    fs.writeFileSync(file, minifiedContent, 'utf8');
    
    const size = fs.statSync(file).size;
    totalSize += size;
    console.log(`Minified ${path.relative(__dirname, file)}: ${size} bytes`);
  });

  const limit = 5120; // 5KB
  console.log(`\nTotal bundle size: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);
  if (totalSize > limit) {
    console.error(`Error: Total bundle size exceeds 5KB limit!`);
    process.exit(1);
  } else {
    console.log(`Success: Bundle size is well within the 5KB ceiling.`);
  }
}

run();
