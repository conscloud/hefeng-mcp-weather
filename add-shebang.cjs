const fs = require('fs');
const path = 'dist/index.js';
const content = fs.readFileSync(path, 'utf8');
if (!content.startsWith('#!/usr/bin/env node')) {
  fs.writeFileSync(path, '#!/usr/bin/env node\n' + content);
}