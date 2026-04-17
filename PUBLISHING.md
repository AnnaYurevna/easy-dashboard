# Publishing Notes

## Minimal GitHub release contents

Your release asset should include:

- `manifest.json`
- `main.js`
- `versions.json`

For manual installs, users can also download the repository zip and copy those files into:

`.obsidian/plugins/easy-dashboard/`

## Recommended repo steps

1. Push the latest plugin code to your GitHub repository
2. Bump the version in `manifest.json`, `package.json`, and `versions.json`
3. Create a tagged GitHub release such as `1.0.0`
4. Attach a zip that contains the plugin files
5. Share the GitHub link or release link

## Community plugin note

If you want one-click install from Obsidian's community plugin browser, submit the plugin to `obsidianmd/obsidian-releases` by adding an entry to `community-plugins.json` and opening a pull request.

Obsidian reads the plugin list from that repository, uses your repo metadata for the plugin page, and downloads actual plugin files from GitHub releases.
