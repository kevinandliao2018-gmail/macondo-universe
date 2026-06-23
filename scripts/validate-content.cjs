const fs = require("node:fs");
const path = require("node:path");
const { loadContent } = require("./content-utils.cjs");

const ambiguousNamePatterns = [
  /(^|[^\u4e00-\u9fa5·])何塞(?![·])/,
  /(^|[^\u4e00-\u9fa5·])奥雷里亚诺(?![·第二])/
];

function assertUniqueIds(collectionName, ids) {
  const seen = new Set();
  const duplicates = new Set();
  ids.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  });
  if (duplicates.size > 0) {
    throw new Error(`${collectionName} has duplicate IDs: ${[...duplicates].join(", ")}`);
  }
}

function assertKnownIds(label, ids, knownIds) {
  const missing = ids.filter((id) => !knownIds.has(id));
  if (missing.length > 0) {
    throw new Error(`${label} references missing IDs: ${missing.join(", ")}`);
  }
}

function assertNoAmbiguousNames(label, text) {
  for (const pattern of ambiguousNamePatterns) {
    if (pattern.test(text)) {
      throw new Error(`${label} contains ambiguous short name: ${text}`);
    }
  }
}

function assertQuoteCharCount(label, text, expectedCharCount) {
  const actualCharCount = Array.from(text).length;
  if (actualCharCount !== expectedCharCount) {
    throw new Error(`${label} charCount is ${expectedCharCount}, but actual text length is ${actualCharCount}`);
  }
}

function assertReadingGuideSourceFile(label, fileName) {
  const sourceRoot = path.resolve(process.cwd(), "材料", "章节解读");
  const sourcePath = path.resolve(sourceRoot, fileName);
  if (!sourcePath.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(`${label} source file escapes chapter reading material directory: ${fileName}`);
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`${label} source file does not exist: ${fileName}`);
  }
}

function main() {
  const { works, chapters, characters, evidenceCards, motifs, locations, events, timelineBeatData, readingPaths, researchArticles, relations } = loadContent();
  const timelineStages = timelineBeatData.stages;
  const timelineBeats = timelineBeatData.beats;

  const allIds = new Set();
  const collections = [
    ["works", works.map((item) => item.id)],
    ["chapters", chapters.map((item) => item.id)],
    ["characters", characters.map((item) => item.id)],
    ["motifs", motifs.map((item) => item.id)],
    ["locations", locations.map((item) => item.id)],
    ["events", events.map((item) => item.id)],
    ["timelineStages", timelineStages.map((item) => item.id)],
    ["timelineBeats", timelineBeats.map((item) => item.id)],
    ["readingPaths", readingPaths.map((item) => item.id)],
    ["evidenceCards", evidenceCards.map((item) => item.id)],
    ["researchArticles", researchArticles.map((item) => item.id)],
    ["relations", relations.map((item) => item.id)]
  ];

  collections.forEach(([name, ids]) => {
    assertUniqueIds(name, ids);
    ids.forEach((id) => allIds.add(id));
  });

  const workIds = new Set(works.map((item) => item.id));
  const chapterIds = new Set(chapters.map((item) => item.id));
  const characterIds = new Set(characters.map((item) => item.id));
  const motifIds = new Set(motifs.map((item) => item.id));
  const locationIds = new Set(locations.map((item) => item.id));
  const eventIds = new Set(events.map((item) => item.id));
  const timelineStageIds = new Set(timelineStages.map((item) => item.id));
  const readingPathIds = new Set(readingPaths.map((item) => item.id));
  const evidenceCardIds = new Set(evidenceCards.map((item) => item.id));
  const pathStepToPathId = new Map();
  readingPaths.forEach((path) => {
    path.steps.forEach((step) => {
      pathStepToPathId.set(step.id, path.id);
    });
  });
  const pathStepIds = new Set(pathStepToPathId.keys());
  const eventLocationIds = new Map(events.map((event) => [event.id, new Set(event.locationIds)]));
  const locationEventIds = new Map(locations.map((location) => [location.id, new Set(location.eventIds)]));

  chapters.forEach((chapter) => {
    assertKnownIds(`${chapter.id}.workId`, [chapter.workId], workIds);
    assertKnownIds(`${chapter.id}.characterIds`, chapter.characterIds, characterIds);
    assertKnownIds(`${chapter.id}.eventIds`, chapter.eventIds, eventIds);
    assertKnownIds(`${chapter.id}.motifIds`, chapter.motifIds, motifIds);
    assertNoAmbiguousNames(`${chapter.id}.summary`, chapter.summary);
    if (!chapter.readingGuide) {
      throw new Error(`${chapter.id} is missing readingGuide`);
    }
    if (chapter.readingGuide.sourceFiles.length === 0) {
      throw new Error(`${chapter.id}.readingGuide.sourceFiles must include at least one source file`);
    }
    chapter.readingGuide.sourceFiles.forEach((fileName) => {
      assertReadingGuideSourceFile(`${chapter.id}.readingGuide`, fileName);
    });
    assertNoAmbiguousNames(`${chapter.id}.readingGuide.thesis`, chapter.readingGuide.thesis);
    assertNoAmbiguousNames(`${chapter.id}.readingGuide.entryPoint`, chapter.readingGuide.entryPoint);
    assertNoAmbiguousNames(`${chapter.id}.readingGuide.spotlight.title`, chapter.readingGuide.spotlight.title);
    assertNoAmbiguousNames(`${chapter.id}.readingGuide.spotlight.summary`, chapter.readingGuide.spotlight.summary);
    if (chapter.readingGuide.focusPoints.length !== 3) {
      throw new Error(`${chapter.id}.readingGuide.focusPoints must include exactly 3 items`);
    }
    chapter.readingGuide.focusPoints.forEach((focusPoint, index) => {
      const label = `${chapter.id}.readingGuide.focusPoints.${index}`;
      assertKnownIds(`${label}.eventIds`, focusPoint.eventIds, eventIds);
      assertKnownIds(`${label}.characterIds`, focusPoint.characterIds, characterIds);
      assertKnownIds(`${label}.motifIds`, focusPoint.motifIds, motifIds);
      assertKnownIds(`${label}.locationIds`, focusPoint.locationIds, locationIds);
      assertNoAmbiguousNames(`${label}.title`, focusPoint.title);
      assertNoAmbiguousNames(`${label}.summary`, focusPoint.summary);
    });
    if (chapter.readingGuide.questions.length !== 2) {
      throw new Error(`${chapter.id}.readingGuide.questions must include exactly 2 questions`);
    }
    chapter.readingGuide.questions.forEach((question, index) => {
      assertNoAmbiguousNames(`${chapter.id}.readingGuide.questions.${index}`, question);
    });
  });

  characters.forEach((character) => {
    assertKnownIds(`${character.id}.parentIds`, character.parentIds, characterIds);
    assertKnownIds(`${character.id}.partnerIds`, character.partnerIds, characterIds);
    assertKnownIds(`${character.id}.childIds`, character.childIds, characterIds);
    assertKnownIds(`${character.id}.relatedMotifIds`, character.relatedMotifIds, motifIds);
    assertKnownIds(`${character.id}.keyEventIds`, character.keyEventIds, eventIds);
    if (character.firstAppearanceChapterId) {
      assertKnownIds(`${character.id}.firstAppearanceChapterId`, [character.firstAppearanceChapterId], chapterIds);
    }
    assertNoAmbiguousNames(`${character.id}.canonicalName`, character.canonicalName);
    assertNoAmbiguousNames(`${character.id}.shortDescription`, character.shortDescription);
    assertNoAmbiguousNames(`${character.id}.fate`, character.fate);
  });

  motifs.forEach((motif) => {
    assertKnownIds(`${motif.id}.chapterIds`, motif.chapterIds, chapterIds);
    assertKnownIds(`${motif.id}.characterIds`, motif.characterIds, characterIds);
    assertKnownIds(`${motif.id}.eventIds`, motif.eventIds, eventIds);
  });

  locations.forEach((location) => {
    assertKnownIds(`${location.id}.chapterIds`, location.chapterIds, chapterIds);
    assertKnownIds(`${location.id}.eventIds`, location.eventIds, eventIds);
    assertKnownIds(`${location.id}.characterIds`, location.characterIds, characterIds);
    assertKnownIds(`${location.id}.motifIds`, location.motifIds, motifIds);
    assertNoAmbiguousNames(`${location.id}.name`, location.name);
    assertNoAmbiguousNames(`${location.id}.summary`, location.summary);
    location.periodStates.forEach((state) => {
      assertNoAmbiguousNames(`${location.id}.periodStates.${state.period}`, state.status);
    });
  });

  events.forEach((event) => {
    assertKnownIds(`${event.id}.chapterIds`, event.chapterIds, chapterIds);
    assertKnownIds(`${event.id}.participantCharacterIds`, event.participantCharacterIds, characterIds);
    assertKnownIds(`${event.id}.motifIds`, event.motifIds, motifIds);
    assertKnownIds(`${event.id}.locationIds`, event.locationIds, locationIds);
    assertNoAmbiguousNames(`${event.id}.title`, event.title);
    assertNoAmbiguousNames(`${event.id}.summary`, event.summary);

    event.locationIds.forEach((locationId) => {
      if (!locationEventIds.get(locationId)?.has(event.id)) {
        throw new Error(`${event.id}.locationIds references ${locationId}, but ${locationId}.eventIds does not reference it`);
      }
    });
  });

  assertUniqueIds("timelineStage orders", timelineStages.map((stage) => String(stage.order)));
  assertUniqueIds("timelineBeat storyOrder", timelineBeats.map((beat) => String(beat.storyOrder)));
  assertUniqueIds("timelineBeat narrativeOrder", timelineBeats.map((beat) => String(beat.narrativeOrder)));

  timelineStages.forEach((stage) => {
    assertNoAmbiguousNames(`${stage.id}.title`, stage.title);
  });

  timelineBeats.forEach((beat) => {
    assertKnownIds(`${beat.id}.stageId`, [beat.stageId], timelineStageIds);
    assertKnownIds(`${beat.id}.chapterIds`, beat.chapterIds, chapterIds);
    assertKnownIds(`${beat.id}.participantCharacterIds`, beat.participantCharacterIds, characterIds);
    assertKnownIds(`${beat.id}.motifIds`, beat.motifIds, motifIds);
    assertKnownIds(`${beat.id}.locationIds`, beat.locationIds, locationIds);
    if (beat.linkedEventId) {
      assertKnownIds(`${beat.id}.linkedEventId`, [beat.linkedEventId], eventIds);
    }
  });

  assertUniqueIds("readingPath slugs", readingPaths.map((path) => path.slug));
  assertUniqueIds("readingPath steps", readingPaths.flatMap((path) => path.steps.map((step) => step.id)));

  readingPaths.forEach((path) => {
    assertKnownIds(`${path.id}.coverMotifId`, [path.coverMotifId], motifIds);
    assertNoAmbiguousNames(`${path.id}.title`, path.title);
    assertNoAmbiguousNames(`${path.id}.summary`, path.summary);
    assertNoAmbiguousNames(`${path.id}.thesis`, path.thesis);

    if (path.steps.length === 0) {
      throw new Error(`${path.id}.steps must include at least one step`);
    }

    path.steps.forEach((step) => {
      assertKnownIds(`${path.id}.${step.id}.eventIds`, step.eventIds, eventIds);
      assertKnownIds(`${path.id}.${step.id}.characterIds`, step.characterIds, characterIds);
      assertKnownIds(`${path.id}.${step.id}.locationIds`, step.locationIds, locationIds);
      assertKnownIds(`${path.id}.${step.id}.motifIds`, step.motifIds, motifIds);
      assertKnownIds(`${path.id}.${step.id}.chapterIds`, step.chapterIds, chapterIds);
      assertNoAmbiguousNames(`${path.id}.${step.id}.title`, step.title);
      assertNoAmbiguousNames(`${path.id}.${step.id}.interpretation`, step.interpretation);

      const referenceCount = step.eventIds.length +
        step.characterIds.length +
        step.locationIds.length +
        step.motifIds.length +
        step.chapterIds.length;
      if (referenceCount === 0) {
        throw new Error(`${path.id}.${step.id} must reference at least one entity`);
      }
    });
  });

  locations.forEach((location) => {
    location.eventIds.forEach((eventId) => {
      if (!eventLocationIds.get(eventId)?.has(location.id)) {
        throw new Error(`${location.id}.eventIds references ${eventId}, but ${eventId}.locationIds does not reference it`);
      }
    });
  });

  relations.forEach((relation) => {
    assertKnownIds(`${relation.id}.sourceId`, [relation.sourceId], allIds);
    assertKnownIds(`${relation.id}.targetId`, [relation.targetId], allIds);
  });

  evidenceCards.forEach((card) => {
    assertKnownIds(`${card.id}.workId`, [card.workId], workIds);
    assertKnownIds(`${card.id}.chapterId`, [card.chapterId], chapterIds);
    assertKnownIds(`${card.id}.eventIds`, card.eventIds, eventIds);
    assertKnownIds(`${card.id}.characterIds`, card.characterIds, characterIds);
    assertKnownIds(`${card.id}.motifIds`, card.motifIds, motifIds);
    assertKnownIds(`${card.id}.locationIds`, card.locationIds, locationIds);
    assertKnownIds(`${card.id}.pathIds`, card.pathIds, readingPathIds);
    assertKnownIds(`${card.id}.pathStepIds`, card.pathStepIds, pathStepIds);
    assertNoAmbiguousNames(`${card.id}.title`, card.title);
    assertNoAmbiguousNames(`${card.id}.paraphrase`, card.paraphrase);
    assertNoAmbiguousNames(`${card.id}.interpretation`, card.interpretation);
    card.tags.forEach((tag) => assertNoAmbiguousNames(`${card.id}.tags`, tag));
    assertQuoteCharCount(`${card.id}.quote`, card.quote.text, card.quote.charCount);

    if (card.quote.licenseStatus === "allowed_short_quote" && card.quote.charCount > 80) {
      throw new Error(`${card.id}.quote exceeds allowed public short quote length: ${card.quote.charCount}`);
    }

    card.pathStepIds.forEach((stepId) => {
      const owningPathId = pathStepToPathId.get(stepId);
      if (!owningPathId || !card.pathIds.includes(owningPathId)) {
        throw new Error(`${card.id}.pathStepIds references ${stepId}, but its owning path is not listed in pathIds`);
      }
    });
  });

  assertUniqueIds("researchArticle slugs", researchArticles.map((article) => article.slug));

  researchArticles.forEach((article) => {
    assertKnownIds(`${article.id}.evidenceCardIds`, article.evidenceCardIds, evidenceCardIds);
    assertKnownIds(`${article.id}.pathIds`, article.pathIds, readingPathIds);
    assertKnownIds(`${article.id}.characterIds`, article.characterIds, characterIds);
    assertKnownIds(`${article.id}.motifIds`, article.motifIds, motifIds);
    assertKnownIds(`${article.id}.chapterIds`, article.chapterIds, chapterIds);
    assertNoAmbiguousNames(`${article.id}.title`, article.title);
    assertNoAmbiguousNames(`${article.id}.subtitle`, article.subtitle);
    assertNoAmbiguousNames(`${article.id}.summary`, article.summary);
    assertNoAmbiguousNames(`${article.id}.thesis`, article.thesis);
    article.tags.forEach((tag) => assertNoAmbiguousNames(`${article.id}.tags`, tag));
    assertUniqueIds(`${article.id}.sections`, article.sections.map((section) => section.id));

    const articleEvidenceCardIds = new Set(article.evidenceCardIds);
    article.sections.forEach((section) => {
      assertNoAmbiguousNames(`${article.id}.${section.id}.title`, section.title);
      section.paragraphs.forEach((paragraph) => {
        assertNoAmbiguousNames(`${article.id}.${section.id}.paragraphs`, paragraph);
      });
      assertKnownIds(`${article.id}.${section.id}.evidenceCardIds`, section.evidenceCardIds, evidenceCardIds);
      const externalEvidenceCardIds = section.evidenceCardIds.filter((id) => !articleEvidenceCardIds.has(id));
      if (externalEvidenceCardIds.length > 0) {
        throw new Error(`${article.id}.${section.id}.evidenceCardIds references cards not listed on article: ${externalEvidenceCardIds.join(", ")}`);
      }
    });
  });

  console.log(
    `Validated ${works.length} works, ${chapters.length} chapters, ${characters.length} characters, ${motifs.length} motifs, ${locations.length} locations, ${events.length} events, ${timelineStages.length} timeline stages, ${timelineBeats.length} timeline beats, ${readingPaths.length} reading paths, ${evidenceCards.length} evidence cards, ${researchArticles.length} research articles and ${relations.length} relations.`
  );
}

main();
