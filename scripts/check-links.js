/* eslint-disable no-console */
import { check } from 'linkinator';

const isLocalHost = (host) =>
  host === '' || host === 'localhost' || host === '127.0.0.1' || host === '::1';

function skipExternal(link) {
  if (/^mailto:/.test(link)) return true;
  try {
    return !isLocalHost(new URL(link).hostname);
  } catch {
    return false;
  }
}

async function main() {
  const { links } = await check({
    path: './_site',
    recurse: true,
    concurrency: 8,
    linksToSkip: (link) => Promise.resolve(skipExternal(link)),
  });

  const broken = links.filter((r) => r.state === 'BROKEN');

  if (broken.length > 0) {
    console.error(`Broken internal links (${broken.length}):`);
    for (const r of broken) {
      console.error(`  ${r.url} (linked from ${r.parent})`);
    }
    process.exit(1);
  }

  const okCount = links.filter((r) => r.state === 'OK').length;
  const skippedCount = links.length - okCount - broken.length;
  console.log(
    `OK: ${okCount} internal links checked${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`,
  );
}

main();
