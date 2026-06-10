const fs = require('fs');
const path = require('path');

const rootDir = path.resolve('d:/HomeoAssist/apps/meditonic');
const targets = ['lib', 'components', 'types'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = walk(rootDir);

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  targets.forEach(target => {
    const regex = new RegExp(`@/${target}(/?[a-zA-Z0-9_-]*)`, 'g');
    if (content.match(regex)) {
      changed = true;
      
      const fileDepth = file.replace(rootDir + '\\', '').split('\\').length - 1;
      let relativePrefix = '';
      for (let i = 0; i < fileDepth; i++) {
        relativePrefix += '../';
      }
      if (relativePrefix === '') relativePrefix = './';

      content = content.replace(regex, `${relativePrefix}${target}$1`);
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file.replace(rootDir, '')}`);
  }
});
