import type {
  Chapter,
  EvidenceCard,
  ReadingPath,
  ReadingPathStep,
  ResearchArticle,
  TimelineBeat
} from "@/lib/domain/schemas";

export const beatRelationLimits = {
  evidence: 5,
  evidenceContext: 5,
  research: 3,
  paths: 4
} as const;

export type BeatEvidenceMatch = {
  card: EvidenceCard;
  score: number;
};

export type EvidenceTimelineBeatMatch = {
  beat: TimelineBeat;
  score: number;
};

export type BeatResearchArticleMatch = {
  article: ResearchArticle;
  score: number;
};

export type BeatReadingPathMatch = {
  path: ReadingPath;
  step: ReadingPathStep;
  score: number;
};

export type BeatAdjacency = {
  primaryChapter: Chapter | null;
  previousBeat: TimelineBeat | null;
  nextBeat: TimelineBeat | null;
};

function countOverlap(firstIds: string[], secondIds: string[]) {
  if (firstIds.length === 0 || secondIds.length === 0) {
    return 0;
  }
  const secondIdSet = new Set(secondIds);
  return firstIds.reduce((count, id) => count + Number(secondIdSet.has(id)), 0);
}

function getBeatEvidenceScore(beat: TimelineBeat, card: EvidenceCard) {
  const linkedEventScore = beat.linkedEventId && card.eventIds.includes(beat.linkedEventId) ? 100 : 0;
  const chapterScore = beat.chapterIds.includes(card.chapterId) ? 6 : 0;
  const characterScore = countOverlap(beat.participantCharacterIds, card.characterIds) * 2;
  const motifScore = countOverlap(beat.motifIds, card.motifIds) * 3;
  const locationScore = countOverlap(beat.locationIds, card.locationIds) * 3;

  return linkedEventScore + chapterScore + characterScore + motifScore + locationScore;
}

function getBeatStepScore(beat: TimelineBeat, step: ReadingPathStep) {
  const linkedEventScore = beat.linkedEventId && step.eventIds.includes(beat.linkedEventId) ? 100 : 0;
  const chapterScore = countOverlap(beat.chapterIds, step.chapterIds) * 6;
  const characterScore = countOverlap(beat.participantCharacterIds, step.characterIds) * 2;
  const motifScore = countOverlap(beat.motifIds, step.motifIds) * 3;
  const locationScore = countOverlap(beat.locationIds, step.locationIds) * 3;

  return linkedEventScore + chapterScore + characterScore + motifScore + locationScore;
}

export function getBeatEvidenceMatches(
  beat: TimelineBeat,
  cards: EvidenceCard[],
  limit: number = beatRelationLimits.evidence
) {
  return cards
    .map((card) => ({ card, score: getBeatEvidenceScore(beat, card) }))
    .filter((match) => match.score > 0)
    .sort((first, second) => {
      const scoreDelta = second.score - first.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      const orderDelta = first.card.sortOrder - second.card.sortOrder;
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return first.card.id.localeCompare(second.card.id);
    })
    .slice(0, limit);
}

export function getEvidenceTimelineBeatMatches(
  card: EvidenceCard,
  beats: TimelineBeat[],
  limit: number = beatRelationLimits.evidenceContext
) {
  return beats
    .map((beat) => {
      const match = getBeatEvidenceMatches(beat, [card], 1)[0];
      return match ? { beat, score: match.score } : null;
    })
    .filter((match): match is EvidenceTimelineBeatMatch => Boolean(match))
    .sort((first, second) => {
      const scoreDelta = second.score - first.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      const orderDelta = first.beat.storyOrder - second.beat.storyOrder;
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return first.beat.id.localeCompare(second.beat.id);
    })
    .slice(0, limit);
}

export function getBeatResearchArticleMatches(
  beat: TimelineBeat,
  articles: ResearchArticle[],
  evidenceMatches: BeatEvidenceMatch[],
  limit: number = beatRelationLimits.research
) {
  const evidenceScoreById = new Map(evidenceMatches.map((match) => [match.card.id, match.score]));

  return articles
    .map((article) => {
      const evidenceScore = article.evidenceCardIds.reduce(
        (score, cardId) => score + (evidenceScoreById.get(cardId) ?? 0),
        0
      );
      const chapterScore = countOverlap(beat.chapterIds, article.chapterIds) * 6;
      const characterScore = countOverlap(beat.participantCharacterIds, article.characterIds) * 2;
      const motifScore = countOverlap(beat.motifIds, article.motifIds) * 3;
      return {
        article,
        score: evidenceScore + chapterScore + characterScore + motifScore
      };
    })
    .filter((match) => match.score > 0)
    .sort((first, second) => {
      const scoreDelta = second.score - first.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      const orderDelta = first.article.sortOrder - second.article.sortOrder;
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return first.article.id.localeCompare(second.article.id);
    })
    .slice(0, limit);
}

export function getBeatReadingPathMatches(
  beat: TimelineBeat,
  paths: ReadingPath[],
  limit: number = beatRelationLimits.paths
) {
  return paths
    .map((path) => {
      const bestStepMatch = path.steps
        .map((step) => ({ path, step, score: getBeatStepScore(beat, step) }))
        .filter((match) => match.score > 0)
        .sort((first, second) => {
          const scoreDelta = second.score - first.score;
          if (scoreDelta !== 0) {
            return scoreDelta;
          }
          const firstIndex = path.steps.findIndex((step) => step.id === first.step.id);
          const secondIndex = path.steps.findIndex((step) => step.id === second.step.id);
          return firstIndex - secondIndex;
        })[0];

      return bestStepMatch ?? null;
    })
    .filter((match): match is BeatReadingPathMatch => Boolean(match))
    .sort((first, second) => {
      const scoreDelta = second.score - first.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return first.path.id.localeCompare(second.path.id);
    })
    .slice(0, limit);
}

export function getBeatPrimaryChapter(beat: TimelineBeat, chapterById: Map<string, Chapter>) {
  return beat.chapterIds
    .map((id) => chapterById.get(id))
    .filter((chapter): chapter is Chapter => Boolean(chapter))
    .sort((first, second) => first.order - second.order)[0] ?? null;
}

export function buildBeatAdjacencyMap(beats: TimelineBeat[], chapterById: Map<string, Chapter>) {
  const adjacencyByBeatId = new Map<string, BeatAdjacency>();
  const beatsByPrimaryChapterId = new Map<string, TimelineBeat[]>();

  beats.forEach((beat) => {
    const primaryChapter = getBeatPrimaryChapter(beat, chapterById);
    adjacencyByBeatId.set(beat.id, {
      primaryChapter,
      previousBeat: null,
      nextBeat: null
    });

    if (!primaryChapter) {
      return;
    }

    const chapterBeats = beatsByPrimaryChapterId.get(primaryChapter.id) ?? [];
    chapterBeats.push(beat);
    beatsByPrimaryChapterId.set(primaryChapter.id, chapterBeats);
  });

  beatsByPrimaryChapterId.forEach((chapterBeats) => {
    chapterBeats
      .sort((first, second) => first.storyOrder - second.storyOrder)
      .forEach((beat, index) => {
        const existingAdjacency = adjacencyByBeatId.get(beat.id);
        if (!existingAdjacency) {
          return;
        }

        adjacencyByBeatId.set(beat.id, {
          primaryChapter: existingAdjacency.primaryChapter,
          previousBeat: chapterBeats[index - 1] ?? null,
          nextBeat: chapterBeats[index + 1] ?? null
        });
      });
  });

  return adjacencyByBeatId;
}
