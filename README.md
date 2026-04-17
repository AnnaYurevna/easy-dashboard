# Easy Dashboard

`Easy Dashboard` is a shareable Obsidian plugin that generates a polished home dashboard note with quick actions, recent notes, folders, and tags.

It packages the workflow into something other people can install without manually copying long `dataviewjs` snippets.

## Features

- Generates a home dashboard note
- Shows a time-based greeting
- Adds a search shortcut
- Adds quick action buttons
- Shows recent notes
- Shows folder pills
- Shows tag pills
- Generates separate folder and tag browser pages
- Adds commands for opening and regenerating the dashboard
- Can connect to the `Homepage` community plugin

## Requirements

- `Dataview` is required
- `Templater` is optional
- `Homepage` is optional

## Installation

### Manual install

1. Download `manifest.json`, `main.js`, and `versions.json`
2. Create a folder named `easy-dashboard` inside your vault's `.obsidian/plugins/`
3. Put the files into that folder
4. Enable the plugin in Obsidian community plugins

### BRAT or GitHub install

You can also publish this repo and install it through BRAT or by downloading a release zip.

## Setup

1. Enable `Dataview`
2. Open `Settings -> Easy Dashboard`
3. Set your preferred note paths and inbox folder
4. Click `Generate`
5. Optionally click `Connect` if you use the `Homepage` plugin

## Commands

- `Generate or update dashboard files`
- `Open dashboard`
- `Connect dashboard to Homepage plugin`

## Notes

The plugin generates markdown notes that contain `dataviewjs`, so users can still tweak the layout after installation.

## Release checklist

1. Bump the version in `manifest.json`, `package.json`, and `versions.json`
2. Create a release zip containing:
   - `manifest.json`
   - `main.js`
   - `versions.json`
3. Publish a GitHub release

## License

MIT
