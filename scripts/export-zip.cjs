#!/usr/bin/env node
/* Export script (CommonJS) for creating a zip archive of the project directory. */
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

archive.glob('**/*', { dot: true, ignore })

archive.finalize().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
