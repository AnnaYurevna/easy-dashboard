# Easy Dashboard

`Easy Dashboard` is an Obsidian plugin that generates a polished home dashboard with quick actions, recent notes, folders, tags, and supporting views.

It packages the workflow into something people can install without manually copying long `dataviewjs` snippets.

## Features

- Generates a home dashboard note
- Opens the dashboard automatically on startup
- Shows a time-based greeting
- Adds a search shortcut
- Adds quick action buttons for new notes, inbox, and map
- Shows recent notes as cards
- Shows folder shortcuts as cards
- Hides system folders from the folder list
- Shortens `Sort/...` folders to their final folder name in the UI
- Shows tag shortcuts
- Generates separate folder and tag browser pages
- Adds commands for opening and regenerating the dashboard
- Can still connect to the `Homepage` community plugin if someone wants that setup

## Requirements

- `Dataview` is required
- `Templater` is optional
- `Homepage` is optional and no longer required for startup behavior

## Installation

### Manual install

1. Download `manifest.json`, `main.js`, and `versions.json`
2. Create a folder named `easy-dashboard` inside your vault's `.obsidian/plugins/`
3. Put the files into that folder
4. Enable the plugin in Obsidian community plugins

### GitHub release install

1. Download the latest release assets
2. Extract the plugin files
3. Put `manifest.json`, `main.js`, and `versions.json` into `.obsidian/plugins/easy-dashboard/`
4. Enable the plugin in Obsidian

### GitHub Release install on MacOS with vault in iCloud

```
cd ~/Library/Mobile\ Documents/iCloud\~md\~obsidian/Documents/.obsidian/plugins
curl -fsSL -o easy-dashboard.tar.gz \
  "$(curl -fsSL https://api.github.com/repos/AnnaYurevna/easy-dashboard/releases/latest | jq -r .tarball_url)"
tar xzf easy-dashboard.tar.gz
rm easy-dashboard.tar.gz
```

Enable the plugin in Obsidian

## Setup

1. Enable `Dataview`
2. Open `Settings -> Easy Dashboard`
3. Set your preferred note paths, inbox folder, template, and optional map note
4. Make sure `Open on startup` is enabled if you want the dashboard to replace `Homepage`
5. Click `Generate`

## Commands

- `Generate or update dashboard files`
- `Open dashboard`
- `Connect dashboard to Homepage plugin`

## Notes

- The plugin generates markdown notes that contain `dataviewjs`, so users can still tweak the layout after installation.
- The default paths in this repo reflect Anna's personal vault structure. Other users should review the settings after installation and change paths to match their own vault.

## License

MIT
