import charactersRaw from "@/data/characters.json";
import chaptersRaw from "@/data/chapters.json";
import evidenceCardsRaw from "@/data/evidence-cards.json";
import eventsRaw from "@/data/events.json";
import locationsRaw from "@/data/locations.json";
import motifsRaw from "@/data/motifs.json";
import readingPathsRaw from "@/data/reading-paths.json";
import researchArticlesRaw from "@/data/research-articles.json";
import relationsRaw from "@/data/relations.json";
import timelineBeatsRaw from "@/data/timeline-beats.json";
import worksRaw from "@/data/works.json";
import {
  characterListSchema,
  chapterListSchema,
  evidenceCardListSchema,
  eventListSchema,
  locationListSchema,
  motifListSchema,
  readingPathListSchema,
  researchArticleListSchema,
  relationListSchema,
  timelineBeatDataSchema,
  workListSchema
} from "@/lib/domain/schemas";

export const works = workListSchema.parse(worksRaw);
export const chapters = chapterListSchema.parse(chaptersRaw).sort((a, b) => a.order - b.order);
export const characters = characterListSchema.parse(charactersRaw);
export const motifs = motifListSchema.parse(motifsRaw);
export const locations = locationListSchema.parse(locationsRaw);
export const events = eventListSchema.parse(eventsRaw).sort((a, b) => a.storyOrder - b.storyOrder);
const timelineBeatData = timelineBeatDataSchema.parse(timelineBeatsRaw);
export const timelineStages = timelineBeatData.stages.sort((a, b) => a.order - b.order);
export const timelineBeats = timelineBeatData.beats.sort((a, b) => a.storyOrder - b.storyOrder);
export const relations = relationListSchema.parse(relationsRaw);
export const readingPaths = readingPathListSchema.parse(readingPathsRaw);
export const evidenceCards = evidenceCardListSchema.parse(evidenceCardsRaw)
  .sort((a, b) => a.sortOrder - b.sortOrder);
export const researchArticles = researchArticleListSchema.parse(researchArticlesRaw)
  .sort((a, b) => a.sortOrder - b.sortOrder);

export function getCharacter(id: string) {
  return characters.find((character) => character.id === id);
}

export function getChapterBySlug(slug: string) {
  return chapters.find((chapter) => chapter.slug === slug);
}

export function getMotif(id: string) {
  return motifs.find((motif) => motif.id === id);
}

export function getLocation(id: string) {
  return locations.find((location) => location.id === id);
}

export function getTimelineStage(id: string) {
  return timelineStages.find((stage) => stage.id === id);
}

export function getTimelineBeat(id: string) {
  return timelineBeats.find((beat) => beat.id === id);
}

export function getReadingPathBySlug(slug: string) {
  return readingPaths.find((path) => path.slug === slug);
}

export function getEvidenceCard(id: string) {
  return evidenceCards.find((card) => card.id === id);
}

export function getResearchArticleBySlug(slug: string) {
  return researchArticles.find((article) => article.slug === slug);
}

export function getEventsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return events.filter((event) => idSet.has(event.id));
}

export function getCharactersByIds(ids: string[]) {
  const idSet = new Set(ids);
  return characters.filter((character) => idSet.has(character.id));
}

export function getChaptersByIds(ids: string[]) {
  const idSet = new Set(ids);
  return chapters.filter((chapter) => idSet.has(chapter.id));
}

export function getMotifsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return motifs.filter((motif) => idSet.has(motif.id));
}

export function getLocationsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return locations.filter((location) => idSet.has(location.id));
}

export function getEvidenceCardsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return evidenceCards.filter((card) => idSet.has(card.id));
}

export function getEvidenceCardsByChapterId(chapterId: string) {
  return evidenceCards.filter((card) => card.chapterId === chapterId);
}

export function getTimelineBeatsByChapterId(chapterId: string) {
  return timelineBeats.filter((beat) => beat.chapterIds.includes(chapterId));
}

export function getTimelineBeatsByEntityId(entityId: string) {
  return timelineBeats.filter((beat) => (
    beat.stageId === entityId ||
    beat.chapterIds.includes(entityId) ||
    beat.participantCharacterIds.includes(entityId) ||
    beat.motifIds.includes(entityId) ||
    beat.locationIds.includes(entityId) ||
    beat.linkedEventId === entityId
  ));
}

export function getEvidenceCardsByEntityId(entityId: string) {
  return evidenceCards.filter((card) => (
    card.workId === entityId ||
    card.chapterId === entityId ||
    card.eventIds.includes(entityId) ||
    card.characterIds.includes(entityId) ||
    card.locationIds.includes(entityId) ||
    card.motifIds.includes(entityId) ||
    card.pathIds.includes(entityId) ||
    card.pathStepIds.includes(entityId)
  ));
}

export function getEvidenceCardsByPathStepId(pathId: string, pathStepId: string) {
  return evidenceCards.filter((card) => (
    card.pathIds.includes(pathId) &&
    card.pathStepIds.includes(pathStepId)
  ));
}

export function getEvidenceCardsByPathId(pathId: string) {
  return evidenceCards.filter((card) => card.pathIds.includes(pathId));
}

export function getResearchArticlesByEvidenceCardId(evidenceCardId: string) {
  return researchArticles.filter((article) => article.evidenceCardIds.includes(evidenceCardId));
}

export function getRelatedCharacters(characterId: string) {
  const character = getCharacter(characterId);
  if (!character) {
    return [];
  }

  const ids = new Set([
    ...character.parentIds,
    ...character.partnerIds,
    ...character.childIds
  ]);

  return characters.filter((item) => ids.has(item.id));
}

export function getRelatedReadingPaths(entityId: string) {
  return readingPaths.filter((path) => (
    path.coverMotifId === entityId ||
    path.steps.some((step) => (
      step.eventIds.includes(entityId) ||
      step.characterIds.includes(entityId) ||
      step.locationIds.includes(entityId) ||
      step.motifIds.includes(entityId) ||
      step.chapterIds.includes(entityId)
    ))
  ));
}

export function getRelatedResearchArticles(entityId: string) {
  return researchArticles.filter((article) => (
    article.evidenceCardIds.includes(entityId) ||
    article.pathIds.includes(entityId) ||
    article.characterIds.includes(entityId) ||
    article.motifIds.includes(entityId) ||
    article.chapterIds.includes(entityId)
  ));
}
