const fs = require('fs');
const content = fs.readFileSync('g:/b2b/src/main/ipc/handlers.ts', 'utf8');
const lines = content.split('\n');
let matches = 0;
lines.forEach((line, i) => {
  if (line.includes('clientCaseReport') || line.includes('ClientCaseReport') || line.includes('sessionOutcome')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
    matches++;
  }
});
console.log('Total matches found:', matches);
