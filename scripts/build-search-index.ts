import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSearchDocuments } from "../lib/search/build";

async function main() {
  const documents = buildSearchDocuments();
  const publicDir = join(process.cwd(), "public");
  await mkdir(publicDir, { recursive: true });
  await writeFile(
    join(publicDir, "search-index.json"),
    `${JSON.stringify(documents, null, 2)}\n`,
    "utf8"
  );
  console.log(`Built ${documents.length} search documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
