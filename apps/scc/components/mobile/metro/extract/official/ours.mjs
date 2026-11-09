// Dumps our topology: stations with lines, and per-line ordered edges.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const linesAt = {};
for (const l of d.lines) for (const [a, b] of l.edges) { for (const s of [a, b]) (linesAt[s] ??= new Set()).add(l.id); }
const out = { stations: d.stations.map(s => ({ ...s, lines: [...(linesAt[s.id] ?? [])].sort() })),
  lines: d.lines.map(l => ({ id: l.id, name: l.name, badge: l.badge, edges: l.edges.map(e => [e[0], e[1]]) })) };
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log(out.stations.length, out.stations.filter(s => s.lines.length > 1).length);
