// The current map as plain text, for an agent that wants the whole of it at once.
//   node apps/goldfishes/foundations/system/model/print.ts        (English)
//   node apps/goldfishes/foundations/system/model/print.ts ko
import { CURRENT, HYPOTHESES, REFERENCES, nodeById, relationById, say, type Lang } from "./index.ts";

const lang: Lang = process.argv[2] === "ko" ? "ko" : "en";
const name = (id: string) => say(CURRENT.labels?.[id] ?? nodeById.get(id)?.label ?? relationById.get(id)?.label, lang);
const lines: string[] = [`Goldfishes system ${CURRENT.id} (${CURRENT.date}): ${say(CURRENT.title, lang)}`, say(CURRENT.summary, lang), "", "NODES"];

for (const id of CURRENT.nodes) {
  const node = nodeById.get(id)!;
  lines.push(`- ${id} [${node.status ?? "-"}] ${name(id)}: ${say(node.role, lang)}`);
  for (const item of node.built ?? []) lines.push(`    ${say(item.text, lang)} ${item.route ? `/${item.route}` : (item.file ?? "")}`);
}

lines.push("", "RELATIONS");
for (const id of CURRENT.relations) {
  const relation = relationById.get(id)!;
  const arrow = relation.plain ? "--" : relation.both ? "<->" : "->";
  lines.push(`- ${id} [${relation.status ?? "-"}] ${relation.from} ${arrow} ${relation.to} (${relation.by}) ${name(id)}: ${say(relation.carries, lang)}`);
  for (const item of relation.built ?? []) lines.push(`    ${say(item.text, lang)} ${item.route ? `/${item.route}` : (item.file ?? "")}`);
}

lines.push("", "QUESTIONS");
for (const hypothesis of HYPOTHESES) {
  lines.push(`- ${hypothesis.id} [${hypothesis.state}] ${say(hypothesis.question, lang)} (${hypothesis.about.join(", ")})`);
  if (hypothesis.next) lines.push(`    next: ${say(hypothesis.next, lang)}`);
}

lines.push("", "REFERENCES (to look at, never to follow)");
for (const reference of REFERENCES) lines.push(`- ${reference.id} ${reference.file}: ${say(reference.note, lang)}`);

console.log(lines.join("\n"));
