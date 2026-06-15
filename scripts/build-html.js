#!/usr/bin/env node
/**
 * Build script: Convert all .md files to .html files
 * Usage: node scripts/build-html.js
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Project directories
const PROJECT_ROOT  = path.join(__dirname, '..');
const CONTENT_DIR   = path.join(PROJECT_ROOT, 'content');
const HTML_DIR      = path.join(PROJECT_ROOT, 'html');
const CONFIG_DIR    = path.join(PROJECT_ROOT, 'config');

// Configure marked
marked.setOptions({ gfm: true, breaks: true });

// Custom renderer for Mermaid diagrams and headings with IDs
const renderer = new marked.Renderer();
renderer.code = function(token) {
  const code = token.text || String(token);
  const language = token.lang || '';
  if (language === 'mermaid') {
    const normalized = code.replace(/<br\s*\/?>/gi, '\n');
    return `<div class="mermaid">${normalized}</div>`;
  }
  const langClass = language ? ` class="language-${language}"` : '';
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre><code${langClass}>${escaped}</code></pre>`;
};
renderer.heading = function(token) {
  const text = token.text || token.tokens?.map(t => t.text || t.raw).join('') || '';
  const depth = token.depth || 1;
  const slug = text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};
marked.use({ renderer });

// Read HTML template
const template = fs.readFileSync(path.join(PROJECT_ROOT, 'template.html'), 'utf8');

// Walk content directory and find all .md files
function findMdFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMdFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Fix links in HTML
function fixLinks(html) {
  return html
    .replace(/href="\.\/([^"]+)"/g, (m, p) => `href="${p}.html"`)
    .replace(/href="(\.\.\/[^"]+)"/g, (m, p) => `href="${p}.html"`)
    .replace(/href="(\/[^"]+)(?<!\.html)(?<!\.md)"/g, (m, p) => `href="${p}.html"`);
}

// Arrow SVG
const arrowSVG = `<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;

// Generate Table of Contents from markdown headings
function generateTOC(mdContent) {
  const lines = mdContent.split('\n');
  let tocHtml = '<div class="toc"><div class="toc-title">目 录</div>';
  let inCodeBlock = false;
  let lastH2 = null;
  
  for (const line of lines) {
    // Track code blocks
    if (line.startsWith('```')) inCodeBlock = !inCodeBlock;
    if (inCodeBlock) continue;
    
    // Match headings
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    
    if (h2Match) {
      const title = h2Match[1].trim();
      // Preserve numbers at start, convert to valid anchor
      const anchor = title.toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '');
      tocHtml += `<div class="toc-item toc-h2"><a href="#${anchor}">${title}</a></div>`;
      lastH2 = title;
    } else if (h3Match) {
      const title = h3Match[1].trim();
      if (!title) continue;
      const anchor = title.toLowerCase()
        .replace(/[^\w\u4e00-\uffff-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      tocHtml += `<div class="toc-item toc-h3"><a href="#${anchor}">${title}</a></div>`;
    }
  }
  
  tocHtml += '</div>';
  return tocHtml;
}

// Parse sidebar markdown to collapsible HTML
function parseSidebar(mdPath, htmlPath) {
  if (!fs.existsSync(mdPath)) return '';

  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  let html = '';
  let currentSection = null;
  let inList = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      if (inList && currentSection) {
        html += '</ul></div></div>';
        currentSection = null;
        inList = false;
      }
      continue;
    }

    if (line.startsWith('# ')) continue;

    const sectionMatch = line.trim().match(/^\* \*\*(.+?)\s*\*\*$/);
    if (sectionMatch) {
      if (inList && currentSection) {
        html += '</ul></div></div>';
      }
      const titleMatch = line.trim().match(/^\* \*\*(.+?)\*\*$/);
      const title = titleMatch ? titleMatch[1] : '';
      const numMatch = title.match(/^(\d+)\.\s*(.+)$/);
      if (numMatch) {
        const num = numMatch[1];
        const sectionTitle = numMatch[2];
        html += `<div class="sidebar-section">
        <div class="sidebar-section-header">
          <span class="section-title">
            <span class="section-num">${num}</span>
            <span class="section-name">${sectionTitle}</span>
          </span>
          ${arrowSVG}
        </div>
        <div class="sidebar-section-items"><ul>`;
        currentSection = num;
      } else {
        html += `<div class="sidebar-section">
        <div class="sidebar-section-header">
          <span class="section-title">
            <span class="section-name">${title}</span>
          </span>
          ${arrowSVG}
        </div>
        <div class="sidebar-section-items"><ul>`;
        currentSection = title;
      }
      inList = true;
    }
    else if (line.trim().startsWith('* [') && inList) {
      const linkMatch = line.trim().match(/\* \[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        const [_, text, link] = linkMatch;
        const numMatch = text.match(/^(\d+)\s*[·•\.]\s*/) || text.match(/^(\d+\.\d+)\s+/);
        const numSpan = numMatch ? `<span class="num">${numMatch[1]}</span>` : '';
        const cleanText = text.replace(/^\d+\s*[·•\.]\s*/, '').replace(/^\d+\.\d+\s+/, '');

        let href = link;
        if (link.startsWith('/')) {
          href = link + '.html';
        } else if (link.startsWith('http')) {
          href = link;
        } else {
          href = link + '.html';
        }
        html += `<li><a href="${href}">${numSpan}${cleanText}</a></li>`;
      }
    }
  }

  if (inList && currentSection) {
    html += '</ul></div></div>';
  }

  return html;
}

// Parse sidebar into flat ordered page list with titles
function parseSidebarPageList(sidebarPath) {
  if (!fs.existsSync(sidebarPath)) return [];

  const content = fs.readFileSync(sidebarPath, 'utf8');
  const lines = content.split('\n');
  const pages = [];

  for (const line of lines) {
    const linkMatch = line.trim().match(/\* \[([^\]]+)\]\(([^\)]+)\)/);
    if (linkMatch) {
      let [_, text, link] = linkMatch;
      let href = link;
      if (link.startsWith('/')) {
        href = link + '.html';
      } else if (!link.startsWith('http')) {
        href = link + '.html';
      }
      // Clean up text
      const cleanText = text.replace(/^\d+\s*[·•\.]\s*/, '').replace(/^\d+\.\d+\s+/, '');
      const numText = text.match(/^(\d+)\s*[·•\.]\s*/) ? text.match(/^(\d+)\s*[·•\.]\s*/)[1] : '';
      // Get filename for matching
      const filename = href.split('/').pop();
      pages.push({ text: cleanText, numText, href, filename });
    }
  }
  return pages;
}

// Generate navigation HTML (prev/next)
function generateNav(currentPage, pageList) {
  const idx = pageList.findIndex(p => p.filename === currentPage);
  if (idx === -1) return '';

  const prev = idx > 0 ? pageList[idx - 1] : null;
  const next = idx < pageList.length - 1 ? pageList[idx + 1] : null;

  let navHtml = '<div class="nav">';
  if (prev) {
    navHtml += `<a href="${prev.href}" class="nav-prev">‹ ${prev.numText ? prev.numText + ' ' : ''}${prev.text}</a>`;
  } else {
    navHtml += '<span></span>';
  }
  if (next) {
    navHtml += `<a href="${next.href}" class="nav-next">${next.numText ? next.numText + ' ' : ''}${next.text} ›</a>`;
  } else {
    navHtml += '<span></span>';
  }
  navHtml += '</div>';
  return navHtml;
}

// Convert a single file
function convertFile(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  let html = marked(content);

  // Inject generated TOC after the 目录 heading
  const toc = generateTOC(content);
  html = html.replace('<h2 id="目录">目录</h2>', '<h2 id="目录">目录</h2>' + toc);

  html = fixLinks(html);

  // Relative path from content/ (e.g. "01-intro/00-brief.html")
  const relative = path.relative(CONTENT_DIR, mdPath);
  const withoutExt = relative.replace(/\.md$/, '.html');
  const outputPath = path.join(HTML_DIR, withoutExt);

  // Create output directory
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get page title - look for first heading (# or ##)
  const titleMatch = content.match(/^(#{1,2})\s+(.+)$/m);
  const pageTitle = titleMatch ? titleMatch[2] : 'Document';

  // Get sidebar
  const rootSidebarHtml = parseSidebar(path.join(CONFIG_DIR, '_sidebar.md'), outputPath);
  const fullSidebar = rootSidebarHtml;

  // Get page list for navigation
  const pageList = parseSidebarPageList(path.join(CONFIG_DIR, '_sidebar.md'));

  // Generate navigation
  const currentFilename = path.basename(withoutExt);
  const navHtml = generateNav(currentFilename, pageList);

  // Generate HTML with template
  const htmlPage = template
    .replace('{{TITLE}}', pageTitle)
    .replace('{{CONTENT}}', html + navHtml)
    .replace('{{SIDEBAR}}', fullSidebar);

  fs.writeFileSync(outputPath, htmlPage, 'utf8');
  console.log(`✓ ${withoutExt}`);
}

// Main
console.log('Building HTML files from Markdown...\n');
fs.mkdirSync(HTML_DIR, { recursive: true });

const mdFiles = findMdFiles(CONTENT_DIR);
mdFiles.forEach(convertFile);

console.log(`\n✓ Built ${mdFiles.length} HTML files`);
console.log('Output directory: html/');
