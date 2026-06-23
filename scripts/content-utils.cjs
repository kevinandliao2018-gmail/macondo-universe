const fs = require("node:fs");
const path = require("node:path");

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", fileName), "utf8")
  );
}

function loadContent() {
  return {
    works: readJson("works.json"),
    chapters: readJson("chapters.json"),
    characters: readJson("characters.json"),
    evidenceCards: readJson("evidence-cards.json"),
    motifs: readJson("motifs.json"),
    locations: readJson("locations.json"),
    events: readJson("events.json"),
    timelineBeatData: readJson("timeline-beats.json"),
    readingPaths: readJson("reading-paths.json"),
    researchArticles: readJson("research-articles.json"),
    relations: readJson("relations.json")
  };
}

function writePublicJson(fileName, value) {
  const publicDir = path.join(process.cwd(), "public");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(
    path.join(publicDir, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

module.exports = {
  loadContent,
  writePublicJson
};
