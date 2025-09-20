NXGN Project - Local Export (ZIP) Instructions

This project includes a small Node script to create a ZIP archive of the repository so you can download the full source even if the Blink web UI blocks the direct "Download" action.

Files added:
- scripts/export-zip.js — Node script that zips the repository root into nxgn-export-<timestamp>.zip

How to use (quick):
1. From your project root, make sure dependencies are installed. We installed the required package for you, but if you need to re-install locally run:
   npm install

2. Run the export script:
   node scripts/export-zip.js

3. After the script finishes, a file named nxgn-export-<timestamp>.zip will appear in the project root. Download or transfer that file as needed.

Notes & troubleshooting:
- The script excludes common folders that should not be part of the archive such as node_modules, .git, and build caches.
- If you see a permission error when running the script, ensure Node.js is installed and you have read access to the repository files.
- On Windows, run the same command from PowerShell or Command Prompt.

Security & privacy:
- The ZIP contains your repository files. Make sure you do not share any secrets stored outside Blink's secret vaults (do not include .env files — they are not committed by default).

If you want, I can also add an npm script to package.json (requires updating package.json) so you can run `npm run export-zip` instead. For now, running the node command is the simplest and platform-agnostic approach.
