import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '../package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '1.0.00';
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (match) {
    const major = match[1];
    const minor = match[2];
    const patchStr = match[3];
    const patchVal = parseInt(patchStr, 10) + 1;
    const padLength = Math.max(patchStr.length, 2);
    const newPatch = String(patchVal).padStart(padLength, '0');
    pkg.version = `${major}.${minor}.${newPatch}`;
  } else {
    pkg.version = '1.0.01';
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`HexFlipp: Version incremented to v${pkg.version}`);
} catch (error) {
  console.error('Failed to increment version:', error);
  process.exit(1);
}
