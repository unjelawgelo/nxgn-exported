#!/usr/bin/env node
/*
  Export script for creating a zip archive of the project directory.
  Usage:
    node scripts/export-zip.js

  Notes:
    - Excludes node_modules, .git, and other common build/cache folders.
    - Creates a zip file in the project root named: nxgn-export-<timestamp>.zip
*/

const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const projectRoot = process.cwd()
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outName = `nxgn-export-${timestamp}.zip`
const outPath = path.join(projectRoot, outName)

const output = fs.createWriteStream(outPath)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () => {
  console.log(`\n✅ Export complete — created ${outName} (${archive.pointer()} bytes)`)
  console.log(`Location: ${outPath}\n`)
})

output.on('end', () => {
  console.log('Data has been drained')
})

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') console.warn('Archiver warning:', err)
  else throw err
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

// Patterns to ignore when creating the archive
const ignore = [
  'node_modules/**',
  '.git/**',
  '.cache/**',
  'dist/**',
  'build/**',
  '.next/**',
  'preview/**',
  'nxgn-export-*.zip',
  'npm-debug.log',
  '.DS_Store',
  'bun.lockb'
]

// Add all files except ignored patterns
archive.glob('**/*', { dot: true, ignore })

// Finalize archive
archive.finalize().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
