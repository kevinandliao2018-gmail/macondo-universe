import type { Chapter, Character, EntityType, Location, Motif } from "@/lib/domain/schemas";
import {
  characters,
  chapters,
  evidenceCards,
  events,
  locations,
  motifs,
  readingPaths,
  researchArticles,
  timelineBeats,
  timelineStages,
  works
} from "@/lib/data/static";
import {
  getBeatEvidenceMatches,
  getBeatReadingPathMatches,
  getBeatResearchArticleMatches
} from "@/lib/data/timeline-beat-relations";

export type SearchExploreAction = {
  label: string;
  href: string;
  kind: "profile" | "chapter-atlas" | "timeline" | "motif-map" | "space-map" | "archive" | "work" | "path" | "evidence";
  primary?: boolean;
};

export type SearchDocument = {
  id: string;
  type: EntityType;
  title: string;
  summary: string;
  tags: string[];
  aliases?: string[];
  href: string;
  relatedEntityIds: string[];
  exploreActions: SearchExploreAction[];
  boost?: number;
};

export function buildSearchDocuments(): SearchDocument[] {
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const motifById = new Map(motifs.map((motif) => [motif.id, motif]));
  const pathById = new Map(readingPaths.map((path) => [path.id, path]));
  const evidenceCardById = new Map(evidenceCards.map((card) => [card.id, card]));
  const stageById = new Map(timelineStages.map((stage) => [stage.id, stage]));

  const evidenceDocuments: SearchDocument[] = evidenceCards.map((card) => {
    const chapter = chapterById.get(card.chapterId);
    const firstPath = card.pathIds
      .map((pathId) => pathById.get(pathId))
      .find(Boolean);
    const firstEventId = card.eventIds[0];
    const relatedEntityIds = new Set([
      card.workId,
      card.chapterId,
      ...card.eventIds,
      ...card.characterIds,
      ...card.locationIds,
      ...card.motifIds,
      ...card.pathIds,
      ...card.pathStepIds
    ]);

    return {
      id: card.id,
      type: "evidence",
      title: card.title,
      summary: `${card.paraphrase} ${card.interpretation} ${card.quote.sourceNote}`,
      tags: card.tags,
      href: `/evidence/${card.id}`,
      relatedEntityIds: [...relatedEntityIds],
      exploreActions: [
        { label: "证据详情", href: `/evidence/${card.id}`, kind: "evidence", primary: true },
        ...(chapter
          ? [{
              label: "章节出处",
              href: `/one-hundred-years/chapters/${chapter.slug}`,
              kind: "archive" as const
            }]
          : []),
        ...(firstPath
          ? [{
              label: "相关路径",
              href: `/paths/${firstPath.slug}`,
              kind: "path" as const
            }]
          : []),
        ...(firstEventId
          ? [{
              label: "时间坐标",
              href: `/timeline?event=${firstEventId}`,
              kind: "timeline" as const
            }]
          : [])
      ],
      boost: 1.75
    } satisfies SearchDocument;
  });

  const pathDocuments: SearchDocument[] = readingPaths.map((path) => {
    const pathEntityIds = new Set([
      path.coverMotifId,
      ...path.steps.flatMap((step) => [
        ...step.eventIds,
        ...step.characterIds,
        ...step.locationIds,
        ...step.motifIds,
        ...step.chapterIds
      ])
    ]);
    const firstChapter = path.steps
      .flatMap((step) => step.chapterIds)
      .map((id) => chapterById.get(id))
      .find(Boolean);
    const firstEventId = path.steps.flatMap((step) => step.eventIds)[0];

    return {
      id: path.id,
      type: "path",
      title: path.title,
      summary: `${path.summary} ${path.thesis}`,
      tags: [...path.tags, ...path.steps.map((step) => step.title)],
      href: `/paths/${path.slug}`,
      relatedEntityIds: [...pathEntityIds],
      exploreActions: [
        { label: "进入路径", href: `/paths/${path.slug}`, kind: "path", primary: true },
        ...(firstChapter
          ? [{
              label: "章节地图",
              href: `/one-hundred-years?chapter=${firstChapter.slug}`,
              kind: "chapter-atlas" as const
            }]
          : []),
        ...(firstEventId
          ? [{
              label: "时间迷宫",
              href: `/timeline?event=${firstEventId}`,
              kind: "timeline" as const
            }]
          : [])
      ],
      boost: 1.9
    } satisfies SearchDocument;
  });

  const articleDocuments: SearchDocument[] = researchArticles.map((article) => {
    const firstPath = article.pathIds
      .map((pathId) => pathById.get(pathId))
      .find(Boolean);
    const firstEvidenceCard = article.evidenceCardIds
      .map((cardId) => evidenceCardById.get(cardId))
      .find(Boolean);
    const firstChapter = article.chapterIds
      .map((chapterId) => chapterById.get(chapterId))
      .find(Boolean);

    return {
      id: article.id,
      type: "article",
      title: article.title,
      summary: [
        article.subtitle,
        article.summary,
        article.thesis,
        ...article.sections.flatMap((section) => [
          section.title,
          ...section.paragraphs
        ])
      ].join(" "),
      tags: [
        ...article.tags,
        ...article.sections.map((section) => section.title)
      ],
      href: `/archive/${article.slug}`,
      relatedEntityIds: [
        ...article.evidenceCardIds,
        ...article.pathIds,
        ...article.characterIds,
        ...article.motifIds,
        ...article.chapterIds
      ],
      exploreActions: [
        { label: "阅读全文", href: `/archive/${article.slug}`, kind: "archive", primary: true },
        ...(firstPath
          ? [{
              label: "相关路径",
              href: `/paths/${firstPath.slug}`,
              kind: "path" as const
            }]
          : []),
        ...(firstEvidenceCard
          ? [{
              label: "文本证据",
              href: `/evidence/${firstEvidenceCard.id}`,
              kind: "evidence" as const
            }]
          : []),
        ...(firstChapter
          ? [{
              label: "章节地图",
              href: `/one-hundred-years?chapter=${firstChapter.slug}`,
              kind: "chapter-atlas" as const
            }]
          : [])
      ],
      boost: 1.86
    } satisfies SearchDocument;
  });

  const workDocuments: SearchDocument[] = works.map((work) => ({
    id: work.id,
    type: "work",
    title: work.title,
    summary: [
      work.summary,
      work.relationLabel,
      work.relationSummary
    ].filter(Boolean).join(" "),
    tags: [
      ...work.tags,
      work.macondoLayer ?? "",
      work.relationLabel ?? ""
    ].filter(Boolean),
    aliases: work.originalTitle ? [work.originalTitle] : [],
    href: `/works#${work.id}`,
    relatedEntityIds: [],
    exploreActions: [
      { label: "作品谱系", href: `/works#${work.id}`, kind: "work", primary: true },
      ...(work.id === "work_ohy"
        ? [{ label: "章节地图", href: "/one-hundred-years", kind: "chapter-atlas" as const }]
        : [{ label: "文学宇宙", href: "/works", kind: "work" as const }])
    ],
    boost: 2
  }));

  const chapterDocuments: SearchDocument[] = chapters.map((chapter) => ({
    id: chapter.id,
    type: "chapter",
    title: chapter.title,
    summary: [
      chapter.summary,
      chapter.readingGuide.thesis,
      chapter.readingGuide.entryPoint,
      chapter.readingGuide.spotlight.title,
      chapter.readingGuide.spotlight.summary,
      ...chapter.readingGuide.focusPoints.flatMap((focusPoint) => [
        focusPoint.title,
        focusPoint.summary
      ]),
      ...chapter.readingGuide.questions
    ].join(" "),
    tags: [
      ...chapter.themeTags,
      chapter.readingGuide.spotlight.title,
      ...chapter.readingGuide.focusPoints.map((focusPoint) => focusPoint.title)
    ],
    href: `/one-hundred-years/chapters/${chapter.slug}`,
    relatedEntityIds: [
      ...chapter.characterIds,
      ...chapter.eventIds,
      ...chapter.motifIds,
      ...chapter.readingGuide.focusPoints.flatMap((focusPoint) => [
        ...focusPoint.eventIds,
        ...focusPoint.characterIds,
        ...focusPoint.motifIds,
        ...focusPoint.locationIds
      ])
    ],
    exploreActions: [
      { label: "完整章节", href: `/one-hundred-years/chapters/${chapter.slug}`, kind: "archive", primary: true },
      { label: "章节地图", href: `/one-hundred-years?chapter=${chapter.slug}`, kind: "chapter-atlas" },
      { label: "时间迷宫", href: `/timeline?from=${chapter.order}&to=${chapter.order}`, kind: "timeline" }
    ],
    boost: 1.4
  }));

  const characterDocuments: SearchDocument[] = characters.map((character) => ({
    id: character.id,
    type: "character",
    title: character.canonicalName,
    summary: [
      character.shortDescription,
      character.fate,
      character.lonelinessType,
      character.graphProfile?.nameDestiny,
      character.graphProfile?.symbol,
      character.graphProfile?.fateLine
    ].filter(Boolean).join(" "),
    tags: [
      character.familyLine,
      character.lonelinessType,
      character.graphProfile?.deathType ?? "",
      ...(character.graphProfile?.graphTags ?? [])
    ].filter(Boolean),
    aliases: character.aliases,
    href: `/characters/${character.id}`,
    relatedEntityIds: [
      ...character.parentIds,
      ...character.partnerIds,
      ...character.childIds,
      ...character.relatedMotifIds,
      ...character.keyEventIds
    ],
    exploreActions: [
      { label: "人物档案", href: `/characters/${character.id}`, kind: "profile", primary: true },
      { label: "章节地图", href: `/one-hundred-years?character=${character.id}`, kind: "chapter-atlas" },
      { label: "时间迷宫", href: `/timeline?character=${character.id}`, kind: "timeline" },
      { label: "意象星图", href: `/motifs?character=${character.id}`, kind: "motif-map" }
    ],
    boost: 1.8
  }));

  const motifDocuments: SearchDocument[] = motifs.map((motif) => ({
    id: motif.id,
    type: "motif",
    title: motif.name,
    summary: [
      motif.summary,
      motif.motifGroup,
      ...motif.appearances,
      ...motif.symbolicLayers
    ].join(" "),
    tags: [...motif.tags, motif.motifGroup, ...motif.appearances],
    href: `/motifs/${motif.id}`,
    relatedEntityIds: [
      ...motif.chapterIds,
      ...motif.characterIds,
      ...motif.eventIds,
      ...motif.eventIds.flatMap((eventId) => eventById.get(eventId)?.locationIds ?? [])
    ],
    exploreActions: [
      { label: "意象档案", href: `/motifs/${motif.id}`, kind: "profile", primary: true },
      { label: "意象星图", href: `/motifs?motif=${motif.id}`, kind: "motif-map" },
      { label: "章节地图", href: `/one-hundred-years?motif=${motif.id}`, kind: "chapter-atlas" },
      { label: "时间迷宫", href: `/timeline?motif=${motif.id}`, kind: "timeline" }
    ],
    boost: 1.7
  }));

  const locationDocuments: SearchDocument[] = locations.map((location) => {
    const firstChapter = location.chapterIds
      .map((id) => chapterById.get(id))
      .find(Boolean);
    return {
      id: location.id,
      type: "location",
      title: location.name,
      summary: [
        location.summary,
        ...location.periodStates.map((state) => state.status)
      ].join(" "),
      tags: [location.zone, ...location.tags],
      aliases: location.aliases,
      href: `/map?location=${location.id}`,
      relatedEntityIds: [
        ...location.chapterIds,
        ...location.eventIds,
        ...location.characterIds,
        ...location.motifIds
      ],
      exploreActions: [
        { label: "空间地图", href: `/map?location=${location.id}`, kind: "space-map", primary: true },
        ...(firstChapter
          ? [{
              label: "章节地图",
              href: `/one-hundred-years?chapter=${firstChapter.slug}`,
              kind: "chapter-atlas" as const
            }]
          : []),
        { label: "时间迷宫", href: `/timeline?location=${location.id}`, kind: "timeline" }
      ],
      boost: 1.65
    } satisfies SearchDocument;
  });

  const eventDocuments: SearchDocument[] = events.map((event) => {
    const firstChapter = event.chapterIds
      .map((id) => chapterById.get(id))
      .find(Boolean);

    return {
      id: event.id,
      type: "event",
      title: event.title,
      summary: event.summary,
      tags: event.tags,
      href: `/timeline?event=${event.id}`,
      relatedEntityIds: [
        ...event.chapterIds,
        ...event.participantCharacterIds,
        ...event.motifIds,
        ...event.locationIds
      ],
      exploreActions: [
        { label: "时间迷宫", href: `/timeline?event=${event.id}`, kind: "timeline", primary: true },
        { label: "章节地图", href: `/one-hundred-years?event=${event.id}`, kind: "chapter-atlas" },
        ...(firstChapter
          ? [{
              label: "章节页",
              href: `/one-hundred-years/chapters/${firstChapter.slug}#${event.id}`,
              kind: "archive" as const
            }]
          : [])
      ]
    };
  });

  const beatDocuments: SearchDocument[] = timelineBeats.map((beat) => {
    const stage = stageById.get(beat.stageId);
    const beatChapters = beat.chapterIds
      .map((id) => chapterById.get(id))
      .filter((chapter): chapter is Chapter => Boolean(chapter))
      .sort((a, b) => a.order - b.order);
    const beatCharacters = beat.participantCharacterIds
      .map((id) => characterById.get(id))
      .filter((character): character is Character => Boolean(character));
    const beatMotifs = beat.motifIds
      .map((id) => motifById.get(id))
      .filter((motif): motif is Motif => Boolean(motif));
    const beatLocations = beat.locationIds
      .map((id) => locationById.get(id))
      .filter((location): location is Location => Boolean(location));
    const linkedEvent = beat.linkedEventId ? eventById.get(beat.linkedEventId) : undefined;
    const evidenceMatches = getBeatEvidenceMatches(beat, evidenceCards);
    const researchArticleMatches = getBeatResearchArticleMatches(beat, researchArticles, evidenceMatches);
    const readingPathMatches = getBeatReadingPathMatches(beat, readingPaths);
    const firstEvidenceCard = evidenceMatches[0]?.card;
    const firstResearchArticle = researchArticleMatches[0]?.article;
    const firstChapter = beatChapters[0];
    const firstLocation = beatLocations[0];
    const relatedEntityIds = new Set([
      beat.stageId,
      ...beat.chapterIds,
      ...beat.participantCharacterIds,
      ...beat.motifIds,
      ...beat.locationIds,
      ...(beat.linkedEventId ? [beat.linkedEventId] : []),
      ...evidenceMatches.map((match) => match.card.id),
      ...researchArticleMatches.map((match) => match.article.id),
      ...readingPathMatches.map((match) => match.path.id)
    ]);

    return {
      id: beat.id,
      type: "beat",
      title: beat.title,
      summary: [
        beat.summary,
        stage?.title ?? "",
        stage?.summary ?? "",
        beat.source.section,
        linkedEvent?.title ?? "",
        linkedEvent?.summary ?? "",
        ...beatChapters.map((chapter) => chapter.title),
        ...beatCharacters.flatMap((character) => [
          character.canonicalName,
          ...character.aliases
        ]),
        ...beatMotifs.map((motif) => motif.name),
        ...beatLocations.map((location) => location.name)
      ].filter(Boolean).join(" "),
      tags: [
        ...beat.tags,
        stage?.title ?? "",
        ...beatChapters.map((chapter) => `第 ${chapter.order} 章`),
        ...beatMotifs.map((motif) => motif.name),
        ...beatLocations.map((location) => location.name)
      ].filter(Boolean),
      href: `/timeline?beat=${beat.id}`,
      relatedEntityIds: [...relatedEntityIds],
      exploreActions: [
        { label: "时间迷宫", href: `/timeline?beat=${beat.id}`, kind: "timeline", primary: true },
        ...(firstChapter
          ? [{
              label: "章节细读",
              href: `/one-hundred-years/chapters/${firstChapter.slug}#${beat.id}`,
              kind: "archive" as const
            }]
          : []),
        ...(firstEvidenceCard
          ? [{
              label: "文本证据",
              href: `/evidence/${firstEvidenceCard.id}`,
              kind: "evidence" as const
            }]
          : []),
        ...(firstResearchArticle
          ? [{
              label: "相关研究",
              href: `/archive/${firstResearchArticle.slug}`,
              kind: "archive" as const
            }]
          : []),
        ...(linkedEvent
          ? [{
              label: "关键事件",
              href: `/timeline?layer=key&event=${linkedEvent.id}`,
              kind: "timeline" as const
            }]
          : []),
        ...(firstLocation
          ? [{
              label: "地点档案",
              href: `/map?location=${firstLocation.id}`,
              kind: "space-map" as const
            }]
          : [])
      ],
      boost: 1.45
    } satisfies SearchDocument;
  });

  return [
    ...evidenceDocuments,
    ...articleDocuments,
    ...pathDocuments,
    ...workDocuments,
    ...chapterDocuments,
    ...characterDocuments,
    ...motifDocuments,
    ...locationDocuments,
    ...eventDocuments,
    ...beatDocuments
  ];
}
