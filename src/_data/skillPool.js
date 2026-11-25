import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { normalizeSkill } from './lib/skills-shared.js';

const PROJECTS_DIR = './src/v2/projects';
const ABOUT_PATH = './src/v2/about/index.md';

export default function () {
  const pool = new Map();

  if (fs.existsSync(PROJECTS_DIR)) {
    const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const fullPath = path.join(PROJECTS_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(raw);
      const fileSlug = path.basename(file, '.md');
      const projectRef = {
        title: data.title || fileSlug,
        url: data.permalink || `/projects/${fileSlug}/`,
        fileSlug,
        date: data.date || null,
      };

      const rawSkills = Array.isArray(data.skills) ? data.skills : [];
      const seenForProject = new Set();

      for (const rawTag of rawSkills) {
        const norm = normalizeSkill(rawTag);
        if (!norm.slug || seenForProject.has(norm.slug)) continue;
        seenForProject.add(norm.slug);

        if (!pool.has(norm.slug)) {
          pool.set(norm.slug, {
            name: norm.name,
            slug: norm.slug,
            category: norm.category,
            count: 0,
            projects: [],
          });
        }

        const entry = pool.get(norm.slug);
        entry.count += 1;
        entry.projects.push(projectRef);
      }
    }
  }

  // Apply manual add/remove overrides from src/v2/about/index.md (skillOverrides)
  if (fs.existsSync(ABOUT_PATH)) {
    const rawAbout = fs.readFileSync(ABOUT_PATH, 'utf8');
    const { data: aboutData } = matter(rawAbout);
    const overrides = aboutData.skillOverrides || {};

    const additions = Array.isArray(overrides.add) ? overrides.add : [];
    for (const item of additions) {
      const rawName = typeof item === 'string' ? item : item?.name;
      if (!rawName) continue;
      const norm = normalizeSkill(rawName);
      if (!norm.slug) continue;

      const category =
        typeof item === 'object' && item?.category ? String(item.category).trim() : norm.category;

      if (!pool.has(norm.slug)) {
        pool.set(norm.slug, {
          name: norm.name,
          slug: norm.slug,
          category,
          count: 0,
          projects: [],
        });
      } else if (typeof item === 'object' && item?.category) {
        pool.get(norm.slug).category = category;
      }
    }

    const removals = Array.isArray(overrides.remove) ? overrides.remove : [];
    for (const rawRemove of removals) {
      const norm = normalizeSkill(rawRemove);
      if (norm.slug) pool.delete(norm.slug);
    }
  }

  const all = Array.from(pool.values()).sort((a, b) => a.name.localeCompare(b.name));
  const withProjects = all.filter((s) => s.count > 0);

  const top = [...withProjects]
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name)))
    .slice(0, 12)
    .sort((a, b) => a.name.localeCompare(b.name));

  const bySlug = Object.fromEntries(all.map((s) => [s.slug, s]));

  const categoryOrder = [
    'Languages & Runtime',
    'Infrastructure & Systems',
    'Networking & Security',
    'APIs & Automation',
    'Systems & Hardware',
    'Data & Tooling',
    'Other Tooling',
  ];

  const categories = categoryOrder
    .map((cat) => ({
      category: cat,
      items: all.filter((s) => s.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return {
    all,
    withProjects,
    top,
    bySlug,
    categories,
  };
}
