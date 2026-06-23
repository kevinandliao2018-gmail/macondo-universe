import { z } from "zod";

export const entityIdSchema = z.string().min(3).regex(/^[a-z0-9_]+$/);

export const workSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  author: z.string().min(1),
  year: z.number().int().optional(),
  type: z.enum(["novel", "novella", "short_story", "nonfiction", "interview", "draft"]),
  summary: z.string().min(1),
  macondoLayer: z.enum(["core", "nearby", "genesis", "echo"]).optional(),
  relationLabel: z.string().min(1).optional(),
  relationSummary: z.string().min(1).optional(),
  tags: z.array(z.string())
});

export const chapterReadingGuideFocusPointSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  eventIds: z.array(entityIdSchema),
  characterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  locationIds: z.array(entityIdSchema)
});

export const chapterReadingGuideSchema = z.object({
  sourceFiles: z.array(z.string().min(1)).min(1),
  thesis: z.string().min(1),
  entryPoint: z.string().min(1),
  focusPoints: z.array(chapterReadingGuideFocusPointSchema).length(3),
  spotlight: z.object({
    title: z.string().min(1),
    summary: z.string().min(1)
  }),
  questions: z.array(z.string().min(1)).length(2)
});

export const chapterSchema = z.object({
  id: entityIdSchema,
  workId: entityIdSchema,
  order: z.number().int().positive(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  characterIds: z.array(entityIdSchema),
  eventIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  themeTags: z.array(z.string()),
  readingGuide: chapterReadingGuideSchema
});

export const characterSchema = z.object({
  id: entityIdSchema,
  canonicalName: z.string().min(1),
  aliases: z.array(z.string()),
  generation: z.number().int().positive().optional(),
  familyLine: z.enum(["jose_arcadio", "aureliano", "ursula", "other"]),
  shortDescription: z.string().min(1),
  fate: z.string().min(1),
  lonelinessType: z.string().min(1),
  parentIds: z.array(entityIdSchema),
  partnerIds: z.array(entityIdSchema),
  childIds: z.array(entityIdSchema),
  relatedMotifIds: z.array(entityIdSchema),
  keyEventIds: z.array(entityIdSchema),
  firstAppearanceChapterId: entityIdSchema.optional(),
  graphProfile: z.object({
    nameDestiny: z.string().min(1).optional(),
    deathType: z
      .enum(["violent", "suicide", "mystic", "natural", "gunshot", "poison", "ants", "vanishing", "unknown"])
      .optional(),
    symbol: z.string().min(1).optional(),
    fateLine: z.string().min(1).optional(),
    graphTags: z.array(z.string())
  }).optional()
});

export const motifSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1),
  summary: z.string().min(1),
  motifGroup: z.enum([
    "climate_sky",
    "water_earth",
    "animal",
    "plant",
    "spatial_ruin",
    "object_text",
    "fate_history"
  ]),
  appearances: z.array(z.string().min(1)).min(1),
  symbolicLayers: z.array(z.string()).min(1),
  chapterIds: z.array(entityIdSchema),
  characterIds: z.array(entityIdSchema),
  eventIds: z.array(entityIdSchema),
  tags: z.array(z.string())
});

export const locationSchema = z.object({
  id: entityIdSchema,
  name: z.string().min(1),
  aliases: z.array(z.string()),
  summary: z.string().min(1),
  zone: z.enum(["household", "town", "industry", "nature", "threshold"]),
  periodStates: z.array(z.object({
    period: z.enum(["founding", "war", "banana", "rain", "ruin"]),
    status: z.string().min(1)
  })).min(1),
  chapterIds: z.array(entityIdSchema),
  eventIds: z.array(entityIdSchema),
  characterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  map: z.object({
    x: z.number(),
    y: z.number(),
    ring: z.enum(["center", "inner", "outer"])
  }),
  tags: z.array(z.string())
});

export const eventSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  storyOrder: z.number().int().positive(),
  narrativeOrder: z.number().int().positive(),
  chapterIds: z.array(entityIdSchema),
  participantCharacterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  locationIds: z.array(entityIdSchema).min(1),
  summary: z.string().min(1),
  tags: z.array(z.string())
});

export const timelineStageSchema = z.object({
  id: entityIdSchema,
  order: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  source: z.object({
    file: z.string().min(1),
    heading: z.string().min(1),
    line: z.number().int().positive()
  })
});

export const timelineBeatSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  storyOrder: z.number().int().positive(),
  narrativeOrder: z.number().int().positive(),
  stageId: entityIdSchema,
  chapterIds: z.array(entityIdSchema),
  participantCharacterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  locationIds: z.array(entityIdSchema),
  tags: z.array(z.string()),
  linkedEventId: entityIdSchema.nullable(),
  source: z.object({
    file: z.string().min(1),
    section: z.string().min(1),
    item: z.number().int().nonnegative(),
    line: z.number().int().positive()
  })
});

export const timelineBeatDataSchema = z.object({
  stages: z.array(timelineStageSchema),
  beats: z.array(timelineBeatSchema)
});

export const relationSchema = z.object({
  id: entityIdSchema,
  sourceId: entityIdSchema,
  targetId: entityIdSchema,
  type: z.enum([
    "appears_in",
    "participates_in",
    "symbolized_by",
    "parent_of",
    "child_of",
    "partner_of",
    "witnesses",
    "mirrors",
    "contrasts_with",
    "intertextual_with",
    "explains",
    "references",
    "spouse_of",
    "lover_of",
    "incest_partner_of",
    "aggregate_parent_of"
  ]),
  description: z.string().optional(),
  weight: z.number().optional()
});

export const readingPathStepSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  eventIds: z.array(entityIdSchema),
  characterIds: z.array(entityIdSchema),
  locationIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  chapterIds: z.array(entityIdSchema),
  interpretation: z.string().min(1)
});

export const readingPathSchema = z.object({
  id: entityIdSchema,
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  thesis: z.string().min(1),
  tags: z.array(z.string()).min(1),
  coverMotifId: entityIdSchema,
  steps: z.array(readingPathStepSchema).min(1)
});

export const evidenceCardQuoteSchema = z.object({
  text: z.string().min(1),
  translator: z.literal("范晔"),
  sourceNote: z.string().min(1),
  usage: z.enum(["analysis_support"]),
  licenseStatus: z.enum(["allowed_short_quote", "needs_review", "not_public"]),
  charCount: z.number().int().positive()
});

export const evidenceCardSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  workId: entityIdSchema,
  chapterId: entityIdSchema,
  eventIds: z.array(entityIdSchema),
  characterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  locationIds: z.array(entityIdSchema),
  pathIds: z.array(entityIdSchema),
  pathStepIds: z.array(entityIdSchema),
  quote: evidenceCardQuoteSchema,
  paraphrase: z.string().min(1),
  interpretation: z.string().min(1),
  tags: z.array(z.string()).min(1),
  sortOrder: z.number().int().positive()
});

export const researchArticleSectionSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  evidenceCardIds: z.array(entityIdSchema).min(1)
});

export const researchArticleSchema = z.object({
  id: entityIdSchema,
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  summary: z.string().min(1),
  thesis: z.string().min(1),
  tags: z.array(z.string()).min(1),
  sortOrder: z.number().int().positive(),
  evidenceCardIds: z.array(entityIdSchema).min(1),
  pathIds: z.array(entityIdSchema).min(1),
  characterIds: z.array(entityIdSchema),
  motifIds: z.array(entityIdSchema),
  chapterIds: z.array(entityIdSchema),
  sections: z.array(researchArticleSectionSchema).min(1)
});

export const workListSchema = z.array(workSchema);
export const chapterListSchema = z.array(chapterSchema);
export const characterListSchema = z.array(characterSchema);
export const motifListSchema = z.array(motifSchema);
export const locationListSchema = z.array(locationSchema);
export const eventListSchema = z.array(eventSchema);
export const relationListSchema = z.array(relationSchema);
export const readingPathListSchema = z.array(readingPathSchema);
export const evidenceCardListSchema = z.array(evidenceCardSchema);
export const researchArticleListSchema = z.array(researchArticleSchema);

export type Work = z.infer<typeof workSchema>;
export type ChapterReadingGuideFocusPoint = z.infer<typeof chapterReadingGuideFocusPointSchema>;
export type ChapterReadingGuide = z.infer<typeof chapterReadingGuideSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Motif = z.infer<typeof motifSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Event = z.infer<typeof eventSchema>;
export type TimelineStage = z.infer<typeof timelineStageSchema>;
export type TimelineBeat = z.infer<typeof timelineBeatSchema>;
export type TimelineBeatData = z.infer<typeof timelineBeatDataSchema>;
export type Relation = z.infer<typeof relationSchema>;
export type ReadingPathStep = z.infer<typeof readingPathStepSchema>;
export type ReadingPath = z.infer<typeof readingPathSchema>;
export type EvidenceCardQuote = z.infer<typeof evidenceCardQuoteSchema>;
export type EvidenceCard = z.infer<typeof evidenceCardSchema>;
export type ResearchArticleSection = z.infer<typeof researchArticleSectionSchema>;
export type ResearchArticle = z.infer<typeof researchArticleSchema>;
export type EntityType =
  | "character"
  | "chapter"
  | "motif"
  | "location"
  | "event"
  | "beat"
  | "work"
  | "path"
  | "evidence"
  | "article";
