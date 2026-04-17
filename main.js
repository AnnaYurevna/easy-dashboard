"use strict";

const { Plugin, Notice, PluginSettingTab, Setting, normalizePath } = require("obsidian");

const DEFAULT_SETTINGS = {
  userName: "Friend",
  homeNotePath: "System/Home.md",
  folderViewNotePath: "System/_Folder View.md",
  tagViewNotePath: "System/_Tag View.md",
  inboxFolderPath: "Inbox",
  templatePath: "",
  mapNotePath: "",
  openOnStartup: true,
  openInReadingView: true,
  hasSeenWelcomeNotice: false,
};

module.exports = class EasyDashboardPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    if (!this.settings.hasSeenWelcomeNotice) {
      new Notice("Easy Dashboard: open plugin settings, review paths, then click Generate.", 10000);
      this.settings.hasSeenWelcomeNotice = true;
      await this.saveSettings();
    }

    this.app.workspace.onLayoutReady(async () => {
      if (!this.settings.openOnStartup) return;
      await this.ensureDashboardFiles();
      await this.openDashboard();
    });

    this.addRibbonIcon("house", "Open dashboard", async () => {
      await this.ensureDashboardFiles();
      await this.openDashboard();
    });

    this.addCommand({
      id: "generate-dashboard-files",
      name: "Generate or update dashboard files",
      callback: async () => {
        await this.ensureDashboardFiles();
        new Notice("Dashboard files updated");
      },
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: async () => {
        await this.ensureDashboardFiles();
        await this.openDashboard();
      },
    });

    this.addCommand({
      id: "create-setup-guide",
      name: "Create setup guide note",
      callback: async () => {
        await this.createSetupGuide();
      },
    });

    this.addCommand({
      id: "connect-homepage-plugin",
      name: "Connect dashboard to Homepage plugin",
      callback: async () => {
        await this.ensureDashboardFiles();
        await this.connectHomepagePlugin();
      },
    });

    this.addSettingTab(new EasyDashboardSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async ensureDashboardFiles() {
    await this.upsertFile(this.settings.homeNotePath, this.buildHomeNote());
    await this.upsertFile(this.settings.folderViewNotePath, this.buildFolderViewNote());
    await this.upsertFile(this.settings.tagViewNotePath, this.buildTagViewNote());
  }

  async createSetupGuide() {
    const path = "Easy Dashboard Setup.md";
    await this.upsertFile(path, this.buildSetupGuide());
    const file = this.app.vault.getFileByPath(normalizePath(path));
    if (file) {
      await this.app.workspace.getMostRecentLeaf().openFile(file, { active: true });
    }
    new Notice("Easy Dashboard setup guide created");
  }

  async openDashboard() {
    const file = this.app.vault.getFileByPath(normalizePath(this.settings.homeNotePath));
    if (!file) {
      new Notice("Dashboard note not found");
      return;
    }

    const leaf = this.app.workspace.getMostRecentLeaf();
    await leaf.openFile(file, { active: true });
    if (
      this.settings.openInReadingView &&
      leaf.view &&
      typeof leaf.view.getMode === "function" &&
      typeof leaf.view.setMode === "function" &&
      leaf.view.getMode() !== "preview"
    ) {
      await leaf.view.setMode("preview");
    }
  }

  async connectHomepagePlugin() {
    const homepagePlugin = this.app.plugins.plugins["homepage"];
    if (!homepagePlugin) {
      new Notice("Homepage plugin is not installed");
      return;
    }

    const configPath = normalizePath(".obsidian/plugins/homepage/data.json");
    let config = {
      version: 4,
      homepages: {},
      separateMobile: false,
    };

    try {
      const raw = await this.app.vault.adapter.read(configPath);
      config = Object.assign(config, JSON.parse(raw));
    } catch (_) {
      // Keep defaults if homepage config does not exist yet.
    }

    config.homepages = {
      "Main Homepage": {
        value: this.settings.homeNotePath,
        kind: "File",
        openOnStartup: true,
        openMode: "Replace all open notes",
        manualOpenMode: "Keep open notes",
        view: "Reading view",
        revertView: true,
        openWhenEmpty: true,
        refreshDataview: false,
        autoCreate: false,
        autoScroll: false,
        pin: false,
        commands: [],
        alwaysApply: false,
        hideReleaseNotes: false,
      },
    };

    await this.app.vault.adapter.write(configPath, JSON.stringify(config, null, 2));
    new Notice("Homepage plugin connected to your dashboard");
  }

  async upsertFile(path, content) {
    const normalized = normalizePath(path);
    await this.ensureFolderForFile(normalized);

    const existing = this.app.vault.getFileByPath(normalized);
    if (existing) {
      await this.app.vault.modify(existing, content);
      return;
    }

    await this.app.vault.create(normalized, content);
  }

  async ensureFolderForFile(path) {
    const parts = path.split("/");
    parts.pop();

    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  basenameWithoutExtension(path) {
    const clean = path.split("/").pop() || path;
    return clean.replace(/\.md$/, "");
  }

  toLiteral(value) {
    return JSON.stringify(value || "");
  }

  buildSetupGuide() {
    return [
      "# Easy Dashboard Setup",
      "",
      "## Quick setup",
      "",
      "1. Install and enable `Dataview`.",
      "2. Open `Settings -> Easy Dashboard`.",
      "3. Review these paths:",
      `   - Home note path: \`${this.settings.homeNotePath}\``,
      `   - Folder view note path: \`${this.settings.folderViewNotePath}\``,
      `   - Tag view note path: \`${this.settings.tagViewNotePath}\``,
      `   - Inbox folder: \`${this.settings.inboxFolderPath}\``,
      "4. Optionally set a template path for the `Add new` button.",
      "5. Optionally set a map note path for the map button.",
      "6. Leave `Open on startup` enabled if you want the dashboard to replace Homepage.",
      "7. Click `Generate` in plugin settings.",
      "",
      "## Notes",
      "",
      "- `Dataview` is required.",
      "- `Templater` is optional.",
      "- `Homepage` is optional.",
      "- You can regenerate the dashboard any time from plugin settings or commands.",
      "",
    ].join("\n");
  }

  buildHomeNote() {
    const config = {
      userName: this.settings.userName,
      homeNotePath: this.settings.homeNotePath,
      folderViewNotePath: this.settings.folderViewNotePath,
      tagViewNotePath: this.settings.tagViewNotePath,
      inboxFolderPath: this.settings.inboxFolderPath,
      templatePath: this.settings.templatePath,
      mapNotePath: this.settings.mapNotePath,
    };

    return [
      "```dataviewjs",
      `const HOME_CFG = ${JSON.stringify(config, null, 2)};`,
      "const styleId = 'anna-dashboard-home';",
      "if (!document.getElementById(styleId)) {",
      "  const s = document.createElement('style');",
      "  s.id = styleId;",
      "  s.textContent = `",
      ".home-greeting { font-size: 1.9em; font-weight: 700; margin: 0.2em 0 1em; color: var(--text-normal); }",
      ".home-search { display: flex; align-items: center; gap: 10px; padding: 11px 18px; background: var(--background-secondary); border: 1.5px solid var(--background-modifier-border); border-radius: 12px; cursor: pointer; color: var(--text-muted); font-size: 0.95em; margin-bottom: 1.6em; transition: border-color 0.2s, box-shadow 0.2s; user-select: none; }",
      ".home-search:hover { border-color: var(--interactive-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-accent) 15%, transparent); }",
      ".home-section { font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin: 1.6em 0 0.7em; }",
      ".note-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 10px; margin-bottom: 0.4em; }",
      ".note-card { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; padding: 14px 16px; cursor: pointer; display: block; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }",
      ".note-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.09); border-color: var(--interactive-accent); }",
      ".nc-name { font-weight: 600; font-size: 0.9em; margin-bottom: 5px; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".nc-preview { font-size: 0.8em; color: var(--text-muted); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }",
      ".nc-date { font-size: 0.7em; color: var(--text-faint); margin-top: 8px; }",
      ".folder-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.4em; }",
      ".folder-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 9px; font-size: 0.87em; cursor: pointer; color: var(--text-normal); transition: background 0.15s, border-color 0.15s; user-select: none; }",
      ".folder-pill:hover { background: var(--background-modifier-hover); border-color: var(--interactive-accent); }",
      ".fp-count { font-size: 0.85em; color: var(--text-faint); }",
      ".tag-row { display: flex; flex-wrap: wrap; gap: 7px; }",
      ".tag-pill { padding: 5px 13px; background: color-mix(in srgb, var(--interactive-accent) 12%, transparent); color: var(--interactive-accent); border-radius: 20px; font-size: 0.83em; cursor: pointer; user-select: none; transition: opacity 0.15s; }",
      ".tag-pill:hover { opacity: 0.7; }",
      ".home-actions { display: flex; gap: 10px; margin-bottom: 1.6em; flex-wrap: wrap; }",
      ".home-new-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--interactive-accent); color: var(--text-on-accent); border-radius: 12px; font-size: 0.95em; font-weight: 500; cursor: pointer; user-select: none; transition: opacity 0.15s; }",
      ".home-new-btn:hover { opacity: 0.85; }",
      "  `;",
      "  document.head.appendChild(s);",
      "}",
      "",
      "const hour = new Date().getHours();",
      "const greeting = hour < 6 ? '🌕 Good night' : hour < 12 ? '☀️ Good morning' : hour < 18 ? '🌤️ Good afternoon' : '🌙 Good evening';",
      "dv.el('div', `${greeting} ${HOME_CFG.userName}`.trim(), { cls: 'home-greeting' });",
      "",
      "const searchBtn = dv.el('div', '🔍   Find note...', { cls: 'home-search' });",
      "searchBtn.addEventListener('click', () => app.commands.executeCommandById('global-search:open'));",
      "",
      "const actions = dv.el('div', '', { cls: 'home-actions' });",
      "actions.empty();",
      "const newBtn = actions.createEl('div', { cls: 'home-new-btn', text: '⊕  Add new' });",
      "const inboxBtn = actions.createEl('div', {",
      "  cls: 'home-new-btn',",
      "  text: '📥  Inbox',",
      "  attr: { style: 'background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border);' },",
      "});",
      "inboxBtn.addEventListener('click', () => {",
      "  window._annaDashboardFolder = HOME_CFG.inboxFolderPath;",
      "  app.workspace.openLinkText(HOME_CFG.folderViewNotePath, '', false);",
      "});",
      "newBtn.addEventListener('click', async () => {",
      "  const inboxFolder = app.vault.getAbstractFileByPath(HOME_CFG.inboxFolderPath);",
      "  const templateFile = HOME_CFG.templatePath ? app.vault.getAbstractFileByPath(HOME_CFG.templatePath) : null;",
      "  const tpPlugin = app.plugins.plugins['templater-obsidian'];",
      "  if (tpPlugin && templateFile && inboxFolder) {",
      "    await tpPlugin.templater.create_new_note_from_template(templateFile, inboxFolder);",
      "    return;",
      "  }",
      "  if (inboxFolder) {",
      "    await app.fileManager.createNewMarkdownFile(inboxFolder, 'Untitled');",
      "    return;",
      "  }",
      "  console.warn('Easy Dashboard: inbox folder not found');",
      "});",
      "",
      "if (HOME_CFG.mapNotePath) {",
      "  const mapBtn = actions.createEl('div', {",
      "    cls: 'home-new-btn',",
      "    text: '🗺️  Open map',",
      "    attr: { style: 'background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border);' },",
      "  });",
      "  mapBtn.addEventListener('click', () => app.workspace.openLinkText(HOME_CFG.mapNotePath, '', false));",
      "}",
      "",
      "dv.el('div', 'Recent notes', { cls: 'home-section' });",
      "const grid = dv.el('div', '', { cls: 'note-grid' });",
      "grid.empty();",
      "const recents = dv.pages().where(p => p.file.path !== HOME_CFG.homeNotePath && !p.file.name.startsWith('_') && !p.file.path.endsWith('.base') && !p.file.path.startsWith('Templates/')).sort(p => p.file.mtime, 'desc').limit(6);",
      "for (const p of recents) {",
      "  let preview = '';",
      "  try {",
      "    const tf = app.vault.getAbstractFileByPath(p.file.path);",
      "    const raw = await app.vault.read(tf);",
      "    preview = raw.replace(/^---[\\s\\S]*?---\\n?/, '').replace(/```[\\s\\S]*?```/g, '').replace(/!?\\[\\[.*?\\]\\]/g, '').replace(/\\[.*?\\]\\(.*?\\)/g, '').replace(/[#>*_`\\-=~]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 130);",
      "  } catch (_) {}",
      "  const card = grid.createEl('div', { cls: 'note-card' });",
      "  card.addEventListener('click', () => app.workspace.openLinkText(p.file.path, '', false));",
      "  card.createEl('div', { cls: 'nc-name', text: p.file.name });",
      "  if (preview) card.createEl('div', { cls: 'nc-preview', text: `${preview}…` });",
      "  card.createEl('div', { cls: 'nc-date', text: p.file.mtime.toFormat('dd MMM yyyy') });",
      "}",
      "",
      "dv.el('div', 'Folders', { cls: 'home-section' });",
      "const folderRow = dv.el('div', '', { cls: 'folder-row' });",
      "folderRow.empty();",
      "const hiddenFolders = new Set(['System', '🫆 System', 'Inbox', '📥 Inbox']);",
      "const allFolders = [...new Set(dv.pages().map(p => p.file.folder).filter(f => f && f !== '/' && !hiddenFolders.has(f)))].sort();",
      "for (const folder of allFolders) {",
      "  const count = dv.pages(`\"${folder}\"`).length;",
      "  const label = folder.startsWith('Sort/') ? folder.split('/').pop() : folder;",
      "  const pill = folderRow.createEl('div', { cls: 'folder-pill' });",
      "  pill.createSpan({ text: `📂 ${label}` });",
      "  pill.createEl('span', { cls: 'fp-count', text: `${count}` });",
      "  pill.addEventListener('click', () => {",
      "    window._annaDashboardFolder = folder;",
      "    app.workspace.openLinkText(HOME_CFG.folderViewNotePath, '', false);",
      "  });",
      "}",
      "",
      "dv.el('div', 'Tags', { cls: 'home-section' });",
      "const tagRow = dv.el('div', '', { cls: 'tag-row' });",
      "tagRow.empty();",
      "const allTags = [...new Set(dv.pages().flatMap(p => p.file.tags || []))].filter(Boolean).sort();",
      "for (const tag of allTags) {",
      "  const pill = tagRow.createEl('div', { cls: 'tag-pill', text: tag });",
      "  pill.addEventListener('click', () => {",
      "    window._annaDashboardTag = tag;",
      "    app.workspace.openLinkText(HOME_CFG.tagViewNotePath, '', false);",
      "  });",
      "}",
      "```",
    ].join("\n");
  }

  buildFolderViewNote() {
    return [
      "```dataviewjs",
      `const HOME_NOTE = ${this.toLiteral(this.settings.homeNotePath)};`,
      "const styleId = 'anna-dashboard-folder';",
      "if (!document.getElementById(styleId)) {",
      "  const s = document.createElement('style');",
      "  s.id = styleId;",
      "  s.textContent = `",
      ".fi-back { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--text-muted); cursor: pointer; margin-bottom: 1.2em; padding: 5px 12px; border-radius: 8px; transition: background 0.15s; user-select: none; }",
      ".fi-back:hover { background: var(--background-modifier-hover); color: var(--text-normal); }",
      ".fi-title { font-size: 1.9em; font-weight: 700; margin: 0 0 0.2em; }",
      ".fi-count { font-size: 0.85em; color: var(--text-muted); margin-bottom: 1.4em; }",
      ".note-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }",
      ".note-card { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; padding: 16px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }",
      ".note-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.09); border-color: var(--interactive-accent); }",
      ".nc-name { font-weight: 600; font-size: 0.92em; margin-bottom: 6px; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".nc-preview { font-size: 0.8em; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }",
      ".nc-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; }",
      ".nc-date { font-size: 0.7em; color: var(--text-faint); }",
      ".nc-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }",
      ".nc-tag { font-size: 0.68em; padding: 2px 8px; background: color-mix(in srgb, var(--interactive-accent) 12%, transparent); color: var(--interactive-accent); border-radius: 20px; }",
      ".nc-img { width: calc(100% + 32px); margin: -16px -16px 10px; height: 110px; object-fit: cover; border-radius: 10px 10px 0 0; display: block; }",
      "  `;",
      "  document.head.appendChild(s);",
      "}",
      "",
      "setTimeout(() => {",
      "  dv.container.closest('.markdown-preview-view, .markdown-source-view')?.querySelectorAll('.inline-title').forEach(el => el.style.display = 'none');",
      "}, 50);",
      "",
      "const back = dv.el('div', '← Back to home', { cls: 'fi-back' });",
      "back.addEventListener('click', () => app.workspace.openLinkText(HOME_NOTE, '', false));",
      "",
      "const folder = window._annaDashboardFolder || '';",
      "if (!folder) {",
      "  dv.el('div', 'Folder not selected. Go back to the home dashboard.', {});",
      "} else {",
      "  const notes = dv.pages(`\"${folder}\"`).where(p => !p.file.name.startsWith('_') && !p.file.path.endsWith('.base'));",
      "  dv.el('div', `📂 ${folder}`, { cls: 'fi-title' });",
      "  dv.el('div', `${notes.length} notes`, { cls: 'fi-count' });",
      "  const grid = dv.el('div', '', { cls: 'note-grid' });",
      "  grid.empty();",
      "  const sorted = notes.sort(p => p.file.mtime, 'desc');",
      "  for (const p of sorted) {",
      "    let preview = '';",
      "    let raw = '';",
      "    try {",
      "      const tf = app.vault.getAbstractFileByPath(p.file.path);",
      "      raw = await app.vault.read(tf);",
      "      preview = raw.replace(/^---[\\s\\S]*?---\\n?/, '').replace(/```[\\s\\S]*?```/g, '').replace(/!?\\[\\[.*?\\]\\]/g, '').replace(/\\[.*?\\]\\(.*?\\)/g, '').replace(/[#>*_`\\-=~]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 160);",
      "    } catch (_) {}",
      "    const card = grid.createEl('div', { cls: 'note-card' });",
      "    card.addEventListener('click', () => app.workspace.openLinkText(p.file.path, '', false));",
      "    const imgMatch = raw.match(/!\\[\\[([^\\]]+\\.(png|jpg|jpeg|gif|webp|svg))[^\\]]*\\]\\]/i);",
      "    if (imgMatch) {",
      "      const imgFile = app.metadataCache.getFirstLinkpathDest(imgMatch[1], p.file.path);",
      "      if (imgFile) {",
      "        const img = card.createEl('img', { cls: 'nc-img' });",
      "        img.src = app.vault.getResourcePath(imgFile);",
      "      }",
      "    }",
      "    card.createEl('div', { cls: 'nc-name', text: p.file.name });",
      "    if (!imgMatch && preview) card.createEl('div', { cls: 'nc-preview', text: `${preview}…` });",
      "    const meta = card.createEl('div', { cls: 'nc-meta' });",
      "    meta.createEl('div', { cls: 'nc-date', text: p.file.mtime.toFormat('dd MMM yyyy') });",
      "    if (p.file.tags?.length) {",
      "      const tagWrap = meta.createEl('div', { cls: 'nc-tags' });",
      "      p.file.tags.slice(0, 2).forEach(t => tagWrap.createEl('span', { cls: 'nc-tag', text: t }));",
      "    }",
      "  }",
      "}",
      "```",
    ].join("\n");
  }

  buildTagViewNote() {
    return [
      "```dataviewjs",
      `const HOME_NOTE = ${this.toLiteral(this.settings.homeNotePath)};`,
      "const styleId = 'anna-dashboard-tag';",
      "if (!document.getElementById(styleId)) {",
      "  const s = document.createElement('style');",
      "  s.id = styleId;",
      "  s.textContent = `",
      ".fi-back { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--text-muted); cursor: pointer; margin-bottom: 1.2em; padding: 5px 12px; border-radius: 8px; transition: background 0.15s; user-select: none; }",
      ".fi-back:hover { background: var(--background-modifier-hover); color: var(--text-normal); }",
      ".fi-title { font-size: 1.9em; font-weight: 700; margin: 0 0 0.2em; }",
      ".fi-count { font-size: 0.85em; color: var(--text-muted); margin-bottom: 1.4em; }",
      ".note-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }",
      ".note-card { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; padding: 16px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }",
      ".note-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.09); border-color: var(--interactive-accent); }",
      ".nc-name { font-weight: 600; font-size: 0.92em; margin-bottom: 6px; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".nc-preview { font-size: 0.8em; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }",
      ".nc-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; }",
      ".nc-date { font-size: 0.7em; color: var(--text-faint); }",
      ".nc-tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }",
      ".nc-tag { font-size: 0.68em; padding: 2px 8px; background: color-mix(in srgb, var(--interactive-accent) 12%, transparent); color: var(--interactive-accent); border-radius: 20px; }",
      ".nc-img { width: calc(100% + 32px); margin: -16px -16px 10px; height: 110px; object-fit: cover; border-radius: 10px 10px 0 0; display: block; }",
      "  `;",
      "  document.head.appendChild(s);",
      "}",
      "",
      "setTimeout(() => {",
      "  dv.container.closest('.markdown-preview-view, .markdown-source-view')?.querySelectorAll('.inline-title').forEach(el => el.style.display = 'none');",
      "}, 50);",
      "",
      "const back = dv.el('div', '← Back to home', { cls: 'fi-back' });",
      "back.addEventListener('click', () => app.workspace.openLinkText(HOME_NOTE, '', false));",
      "",
      "const tag = window._annaDashboardTag || '';",
      "if (!tag) {",
      "  dv.el('div', 'Tag not selected. Go back to the home dashboard.', {});",
      "} else {",
      "  const notes = dv.pages(tag).where(p => !p.file.name.startsWith('_') && !p.file.path.endsWith('.base'));",
      "  dv.el('div', `🏷️ ${tag}`, { cls: 'fi-title' });",
      "  dv.el('div', `${notes.length} notes`, { cls: 'fi-count' });",
      "  const grid = dv.el('div', '', { cls: 'note-grid' });",
      "  grid.empty();",
      "  const sorted = notes.sort(p => p.file.mtime, 'desc');",
      "  for (const p of sorted) {",
      "    let preview = '';",
      "    let raw = '';",
      "    try {",
      "      const tf = app.vault.getAbstractFileByPath(p.file.path);",
      "      raw = await app.vault.read(tf);",
      "      preview = raw.replace(/^---[\\s\\S]*?---\\n?/, '').replace(/```[\\s\\S]*?```/g, '').replace(/!?\\[\\[.*?\\]\\]/g, '').replace(/\\[.*?\\]\\(.*?\\)/g, '').replace(/[#>*_`\\-=~]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 160);",
      "    } catch (_) {}",
      "    const card = grid.createEl('div', { cls: 'note-card' });",
      "    card.addEventListener('click', () => app.workspace.openLinkText(p.file.path, '', false));",
      "    const imgMatch = raw.match(/!\\[\\[([^\\]]+\\.(png|jpg|jpeg|gif|webp|svg))[^\\]]*\\]\\]/i);",
      "    if (imgMatch) {",
      "      const imgFile = app.metadataCache.getFirstLinkpathDest(imgMatch[1], p.file.path);",
      "      if (imgFile) {",
      "        const img = card.createEl('img', { cls: 'nc-img' });",
      "        img.src = app.vault.getResourcePath(imgFile);",
      "      }",
      "    }",
      "    card.createEl('div', { cls: 'nc-name', text: p.file.name });",
      "    if (!imgMatch && preview) card.createEl('div', { cls: 'nc-preview', text: `${preview}…` });",
      "    const meta = card.createEl('div', { cls: 'nc-meta' });",
      "    meta.createEl('div', { cls: 'nc-date', text: p.file.mtime.toFormat('dd MMM yyyy') });",
      "    if (p.file.tags?.length) {",
      "      const tagWrap = meta.createEl('div', { cls: 'nc-tags' });",
      "      p.file.tags.slice(0, 2).forEach(t => tagWrap.createEl('span', { cls: 'nc-tag', text: t }));",
      "    }",
      "  }",
      "}",
      "```",
    ].join("\n");
  }
};

class EasyDashboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Easy Dashboard" });
    containerEl.createEl("p", {
      text: "Quick setup: enable Dataview, review your paths, then click Generate.",
    });

    new Setting(containerEl)
      .setName("Open setup guide")
      .setDesc("Create a note with setup instructions for this plugin.")
      .addButton((button) =>
        button.setButtonText("Create guide").onClick(async () => {
          await this.plugin.createSetupGuide();
        })
      );

    new Setting(containerEl)
      .setName("User name")
      .setDesc("Shown in the greeting on the dashboard.")
      .addText((text) =>
        text.setValue(this.plugin.settings.userName).onChange(async (value) => {
          this.plugin.settings.userName = value.trim() || DEFAULT_SETTINGS.userName;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Home note path")
      .setDesc("Path for the generated dashboard note.")
      .addText((text) =>
        text.setValue(this.plugin.settings.homeNotePath).onChange(async (value) => {
          this.plugin.settings.homeNotePath = value.trim() || DEFAULT_SETTINGS.homeNotePath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Folder view note path")
      .setDesc("Path for the generated folder browser note.")
      .addText((text) =>
        text.setValue(this.plugin.settings.folderViewNotePath).onChange(async (value) => {
          this.plugin.settings.folderViewNotePath = value.trim() || DEFAULT_SETTINGS.folderViewNotePath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Tag view note path")
      .setDesc("Path for the generated tag browser note.")
      .addText((text) =>
        text.setValue(this.plugin.settings.tagViewNotePath).onChange(async (value) => {
          this.plugin.settings.tagViewNotePath = value.trim() || DEFAULT_SETTINGS.tagViewNotePath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Inbox folder")
      .setDesc("Where the Add new button creates notes.")
      .addText((text) =>
        text.setValue(this.plugin.settings.inboxFolderPath).onChange(async (value) => {
          this.plugin.settings.inboxFolderPath = value.trim() || DEFAULT_SETTINGS.inboxFolderPath;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Template path")
      .setDesc("Optional Templater file used by the Add new button.")
      .addText((text) =>
        text.setValue(this.plugin.settings.templatePath).onChange(async (value) => {
          this.plugin.settings.templatePath = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Map note path")
      .setDesc("Optional note opened by the secondary quick action button.")
      .addText((text) =>
        text.setValue(this.plugin.settings.mapNotePath).onChange(async (value) => {
          this.plugin.settings.mapNotePath = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Open on startup")
      .setDesc("Automatically open the dashboard when Obsidian starts.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openOnStartup).onChange(async (value) => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Open in reading view")
      .setDesc("Try to open the dashboard in reading view.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openInReadingView).onChange(async (value) => {
          this.plugin.settings.openInReadingView = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Generate dashboard now")
      .setDesc("Create or update all dashboard notes using the current settings.")
      .addButton((button) =>
        button.setButtonText("Generate").onClick(async () => {
          await this.plugin.ensureDashboardFiles();
          new Notice("Dashboard files updated");
        })
      );

    new Setting(containerEl)
      .setName("Connect Homepage plugin")
      .setDesc("If you use the Homepage community plugin, make it open this dashboard on startup.")
      .addButton((button) =>
        button.setButtonText("Connect").onClick(async () => {
          await this.plugin.connectHomepagePlugin();
        })
      );
  }
}
