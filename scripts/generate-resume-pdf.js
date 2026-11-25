import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import PDFDocument from 'pdfkit';
import { normalizeSkill } from '../src/_data/lib/skills-shared.js';

const DEFAULT_ABOUT_PATH = './src/v2/about/index.md';
const DEFAULT_PROJECTS_DIR = './src/v2/projects';
const DEFAULT_OUTPUT_PATH = './_site/assets/resume.pdf';

// US Letter (612 x 792 pt) with clean ATS-friendly single-column margins
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 42;
const MARGIN_TOP = 38;
const MARGIN_BOTTOM = 38;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  black: '#111111',
  body: '#222222',
  muted: '#444444',
  rule: '#333333',
  link: '#111111',
};

/**
 * Decode common HTML entities and strip inline HTML tags so PDF text streams
 * contain clean, plain UTF-8 text for ATS parsers and OCR engines.
 */
function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a map of project URL -> normalized skill names from src/v2/projects/*.md
 * so project tags in the PDF stay in sync with the global skill pool.
 */
function loadProjectSkillsMap(projectsDir) {
  const map = new Map();
  if (!fs.existsSync(projectsDir)) return map;

  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(projectsDir, file), 'utf8');
    const { data } = matter(raw);
    const fileSlug = path.basename(file, '.md');
    const url = data.permalink || `/projects/${fileSlug}/`;

    if (Array.isArray(data.skills) && data.skills.length > 0) {
      const seen = new Set();
      const normalized = [];
      for (const rawSkill of data.skills) {
        const s = normalizeSkill(rawSkill);
        if (s.slug && !seen.has(s.slug)) {
          seen.add(s.slug);
          normalized.push(s.name);
        }
      }
      map.set(url, normalized);
    }
  }
  return map;
}

function ensureSpace(doc, neededHeight) {
  if (doc.y + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    doc.y = MARGIN_TOP;
  }
}

function drawSectionHeader(doc, title) {
  ensureSpace(doc, 26);
  doc.moveDown(0.55);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.black)
    .text(title.toUpperCase(), MARGIN_X, doc.y, {
      width: CONTENT_WIDTH,
      characterSpacing: 0.6,
    });
  const ruleY = doc.y + 1.5;
  doc
    .moveTo(MARGIN_X, ruleY)
    .lineTo(MARGIN_X + CONTENT_WIDTH, ruleY)
    .lineWidth(0.75)
    .strokeColor(COLORS.rule)
    .stroke();
  doc.y = ruleY + 5;
}

function drawLeftRightRow(doc, leftText, rightText, opts = {}) {
  const {
    leftFont = 'Helvetica-Bold',
    leftSize = 9.5,
    leftColor = COLORS.black,
    rightFont = 'Helvetica',
    rightSize = 8.5,
    rightColor = COLORS.muted,
    link = null,
  } = opts;

  const y = doc.y;
  const rightWidth = rightText
    ? doc.font(rightFont).fontSize(rightSize).widthOfString(rightText) + 10
    : 0;
  const leftWidth = CONTENT_WIDTH - rightWidth;

  doc.font(leftFont).fontSize(leftSize).fillColor(leftColor);
  const leftOpts = { width: leftWidth, continued: false };
  if (link) leftOpts.link = link;
  doc.text(leftText, MARGIN_X, y, leftOpts);
  const nextY = doc.y;

  if (rightText) {
    doc
      .font(rightFont)
      .fontSize(rightSize)
      .fillColor(rightColor)
      .text(rightText, MARGIN_X + leftWidth, y + 0.5, {
        width: rightWidth,
        align: 'right',
      });
  }

  doc.y = Math.max(nextY, doc.y);
}

function drawBullet(doc, text, fontSize = 8.75) {
  const bulletIndent = 10;
  const textX = MARGIN_X + bulletIndent;
  const textWidth = CONTENT_WIDTH - bulletIndent;

  doc.font('Helvetica').fontSize(fontSize);
  const needed = doc.heightOfString(text, { width: textWidth, lineGap: 1.5 }) + 3;
  ensureSpace(doc, needed);

  const y = doc.y;
  doc
    .font('Helvetica')
    .fontSize(fontSize)
    .fillColor(COLORS.body)
    .text('•', MARGIN_X + 2, y);
  doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.body).text(text, textX, y, {
    width: textWidth,
    lineGap: 1.5,
    align: 'left',
  });
  doc.y += 2;
}

export async function generateResumePdf(options = {}) {
  const aboutPath = options.aboutPath || DEFAULT_ABOUT_PATH;
  const projectsDir = options.projectsDir || DEFAULT_PROJECTS_DIR;
  const outputPath = options.outputPath || DEFAULT_OUTPUT_PATH;

  const rawAbout = fs.readFileSync(aboutPath, 'utf8');
  const { data } = matter(rawAbout);
  const projectSkillsMap = loadProjectSkillsMap(projectsDir);

  const profile = data.profile || {};
  const skills = (Array.isArray(data.skills) ? data.skills : []).filter(
    (group) => cleanText(group.category).toLowerCase() !== 'other interests',
  );
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const education = (Array.isArray(data.education) ? data.education : []).filter(
    (item) => !item.hideInPrint,
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const name = cleanText(profile.name || 'Tasrif');
  const role = cleanText(profile.role || '');
  const location = cleanText(profile.location || '');
  const email = cleanText(profile.email || '');
  const summary = cleanText(profile.summary || '');

  const skillKeywords = skills.flatMap((c) => (c.items || []).map(cleanText));

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: {
      top: MARGIN_TOP,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_X,
      right: MARGIN_X,
    },
    info: {
      Title: `${name} — Resume`,
      Author: name,
      Subject: role || 'Resume',
      Keywords: skillKeywords.join(', '),
      Creator: 'tasrif.dev resume generator (PDFKit)',
    },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // ── 1. HEADER ───────────────────────────────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.black)
    .text(name, MARGIN_X, MARGIN_TOP, { width: CONTENT_WIDTH, align: 'center' });

  if (role) {
    doc.moveDown(0.1);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text(role, MARGIN_X, doc.y, { width: CONTENT_WIDTH, align: 'center' });
  }

  // Build contact items with plain-text URLs so ATS & OCR read them reliably
  const contactParts = [];
  if (location) contactParts.push({ text: location, link: null });
  if (email) contactParts.push({ text: email, link: `mailto:${email}` });

  for (const social of profile.socials || []) {
    if (social.icon === 'github' || social.icon === 'linkedin') {
      const displayUrl = String(social.url || '')
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/\/$/, '');
      if (displayUrl) contactParts.push({ text: displayUrl, link: social.url });
    }
  }
  contactParts.push({ text: 'tasrif.dev', link: 'https://tasrif.dev' });

  if (contactParts.length > 0) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.body);
    const separator = '  |  ';
    const fullLine = contactParts.map((p) => p.text).join(separator);
    const totalWidth = doc.widthOfString(fullLine);
    let cursorX = Math.max(MARGIN_X, MARGIN_X + (CONTENT_WIDTH - totalWidth) / 2);
    const contactY = doc.y;

    contactParts.forEach((part, idx) => {
      const w = doc.widthOfString(part.text);
      const textOpts = { lineBreak: false };
      if (part.link) textOpts.link = part.link;
      doc.fillColor(COLORS.link).text(part.text, cursorX, contactY, textOpts);
      cursorX += w;
      if (idx < contactParts.length - 1) {
        const sepW = doc.widthOfString(separator);
        doc.fillColor(COLORS.muted).text(separator, cursorX, contactY, { lineBreak: false });
        cursorX += sepW;
      }
    });
    doc.y = contactY + 12;
  }

  // ── 2. SUMMARY ──────────────────────────────────────────────────────────────
  if (summary) {
    drawSectionHeader(doc, 'Summary');
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.body).text(summary, MARGIN_X, doc.y, {
      width: CONTENT_WIDTH,
      lineGap: 1.8,
      align: 'left',
    });
  }

  // ── 3. TECHNICAL SKILLS ─────────────────────────────────────────────────────
  if (skills.length > 0) {
    drawSectionHeader(doc, 'Technical Skills');
    for (const group of skills) {
      const category = cleanText(group.category);
      const itemsText = (group.items || []).map(cleanText).filter(Boolean).join(', ');
      if (!category || !itemsText) continue;

      ensureSpace(doc, 16);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.75)
        .fillColor(COLORS.black)
        .text(`${category}: `, MARGIN_X, doc.y, {
          width: CONTENT_WIDTH,
          continued: true,
        })
        .font('Helvetica')
        .fontSize(8.75)
        .fillColor(COLORS.body)
        .text(itemsText, {
          width: CONTENT_WIDTH,
          lineGap: 1.5,
        });
      doc.y += 2;
    }
  }

  // ── 4. EXPERIENCE & PROJECTS ────────────────────────────────────────────────
  if (projects.length > 0) {
    drawSectionHeader(doc, 'Experience & Projects');
    for (const proj of projects) {
      ensureSpace(doc, 48);
      const title = cleanText(proj.title);
      const date = cleanText(proj.date);
      const resolvedUrl = proj.url
        ? proj.url.startsWith('http')
          ? proj.url
          : `https://tasrif.dev${proj.url}`
        : null;

      drawLeftRightRow(doc, title, date, {
        leftFont: 'Helvetica-Bold',
        leftSize: 9.5,
        rightFont: 'Helvetica',
        rightSize: 8.5,
        link: resolvedUrl,
      });

      const rawTags = projectSkillsMap.get(proj.url) || proj.tags || [];
      const tags = rawTags.map((t) => normalizeSkill(cleanText(t)).name).filter(Boolean);
      if (tags.length > 0) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8.25)
          .fillColor(COLORS.muted)
          .text(`Technologies: ${tags.join(', ')}`, MARGIN_X, doc.y + 1, {
            width: CONTENT_WIDTH,
          });
        doc.y += 2;
      }

      for (const bullet of proj.bullets || []) {
        const cleanBullet = cleanText(bullet);
        if (cleanBullet) drawBullet(doc, cleanBullet, 8.75);
      }
      doc.y += 4;
    }
  }

  // ── 5. EDUCATION ────────────────────────────────────────────────────────────
  if (education.length > 0) {
    drawSectionHeader(doc, 'Education');
    for (const edu of education) {
      ensureSpace(doc, 38);
      const degree = cleanText(edu.degree);
      const date = cleanText(edu.date);
      const institution = cleanText(edu.institution);
      const badges = (edu.badges || [])
        .map((b) => cleanText(b.text))
        .filter((t) => t && !/^Major:/i.test(t));

      drawLeftRightRow(doc, degree, date, {
        leftFont: 'Helvetica-Bold',
        leftSize: 9.25,
        rightFont: 'Helvetica',
        rightSize: 8.5,
      });

      const subLine = [institution, ...badges].filter(Boolean).join('  |  ');
      if (subLine) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text(subLine, MARGIN_X, doc.y + 0.5, { width: CONTENT_WIDTH });
      }

      const desc = cleanText(edu.desc);
      if (desc) {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COLORS.body)
          .text(desc, MARGIN_X, doc.y + 1.5, {
            width: CONTENT_WIDTH,
            lineGap: 1.4,
          });
      }
      doc.y += 5;
    }
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outputPath;
}

// Allow direct CLI execution: node scripts/generate-resume-pdf.js
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

if (isDirectRun) {
  generateResumePdf()
    .then((out) => {
      process.stdout.write(`[resume-pdf] Generated ${out}\n`);
    })
    .catch((err) => {
      console.error('[resume-pdf] Failed:', err);
      process.exitCode = 1;
    });
}
