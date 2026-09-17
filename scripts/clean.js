import fs from 'node:fs';

try {
  fs.rmSync('_site', { recursive: true, force: true });
} catch (error) {
  console.error('Error cleaning _site:', error);
}
