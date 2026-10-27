// Regenerate a shared page's .ts module from its .html source.
// Usage: node scripts/build-shared-page.mjs mac-transport MAC_TRANSPORT_HTML
import { readFileSync, writeFileSync } from 'node:fs'
const [name, constName] = process.argv.slice(2)
if (!name || !constName) { console.error('usage: build-shared-page.mjs <name> <CONST_NAME>'); process.exit(1) }
const html = readFileSync(`src/lib/shared-pages/${name}.html`, 'utf8')
writeFileSync(`src/lib/shared-pages/${name}.ts`,
  `// Generated from ${name}.html. Edit the .html file, then regenerate with scripts/build-shared-page.mjs.\nexport const ${constName}: string = ${JSON.stringify(html)}\n`)
console.log(`wrote src/lib/shared-pages/${name}.ts (${html.length} chars)`)
