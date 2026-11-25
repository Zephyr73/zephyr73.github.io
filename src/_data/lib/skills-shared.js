// Canonical skill metadata & normalization shared between Eleventy filters and _data/skillPool.js

export const CANONICAL_META = {
  python: { name: 'Python', category: 'Languages & Runtime' },
  linux: { name: 'Linux', category: 'Infrastructure & Systems' },
  debian: { name: 'Debian', category: 'Infrastructure & Systems' },
  'proxmox ve': { name: 'Proxmox VE', category: 'Infrastructure & Systems' },
  proxmox: { name: 'Proxmox VE', category: 'Infrastructure & Systems' },
  docker: { name: 'Docker', category: 'Infrastructure & Systems' },
  lxc: { name: 'LXC', category: 'Infrastructure & Systems' },
  systemd: { name: 'Systemd', category: 'Infrastructure & Systems' },
  windows: { name: 'Windows', category: 'Infrastructure & Systems' },
  'task scheduler': { name: 'Task Scheduler', category: 'Infrastructure & Systems' },
  caddy: { name: 'Caddy', category: 'Networking & Security' },
  wireguard: { name: 'WireGuard', category: 'Networking & Security' },
  'adguard home': { name: 'AdGuard Home', category: 'Networking & Security' },
  networking: { name: 'Networking', category: 'Networking & Security' },
  dns: { name: 'DNS', category: 'Networking & Security' },
  oauth2: { name: 'OAuth2', category: 'Networking & Security' },
  'reverse engineering': { name: 'Reverse Engineering', category: 'Systems & Hardware' },
  hid: { name: 'HID', category: 'Systems & Hardware' },
  serial: { name: 'Serial', category: 'Systems & Hardware' },
  openrgb: { name: 'OpenRGB', category: 'Systems & Hardware' },
  'rest apis': { name: 'REST APIs', category: 'APIs & Automation' },
  'discord api': { name: 'Discord API', category: 'APIs & Automation' },
  'telegram api': { name: 'Telegram API', category: 'APIs & Automation' },
  playwright: { name: 'Playwright', category: 'APIs & Automation' },
  'web scraping': { name: 'Web Scraping', category: 'APIs & Automation' },
  beautifulsoup: { name: 'BeautifulSoup', category: 'APIs & Automation' },
  watchdog: { name: 'Watchdog', category: 'APIs & Automation' },
  llms: { name: 'LLMs', category: 'APIs & Automation' },
  sqlite: { name: 'SQLite', category: 'Data & Tooling' },
  cli: { name: 'CLI', category: 'Data & Tooling' },
  regex: { name: 'Regex', category: 'Data & Tooling' },
  json: { name: 'JSON', category: 'Data & Tooling' },
  rich: { name: 'Rich', category: 'Data & Tooling' },
  epub: { name: 'EPUB', category: 'Data & Tooling' },
  javascript: { name: 'JavaScript', category: 'Languages & Runtime' },
  bash: { name: 'Bash', category: 'Languages & Runtime' },
  eleventy: { name: 'Eleventy', category: 'Data & Tooling' },
  'tailwind css': { name: 'Tailwind CSS', category: 'Data & Tooling' },
  'web apis': { name: 'Web APIs', category: 'APIs & Automation' },
};

export function toSkillSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeSkill(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase();
  const mapped = CANONICAL_META[key];
  const name = mapped ? mapped.name : String(raw || '').trim();
  const category = mapped ? mapped.category : 'Other Tooling';
  return {
    name,
    slug: toSkillSlug(name),
    category,
  };
}
