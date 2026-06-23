import Link from "next/link";
import { BookOpen, Clock3, FileText, MapPinned, Quote, Route, Sparkles, UserRound } from "lucide-react";
import {
  getBeatEvidenceMatches,
  getBeatReadingPathMatches,
  getBeatResearchArticleMatches
} from "@/lib/data/timeline-beat-relations";
import type {
  Chapter,
  Character,
  Event,
  EvidenceCard,
  Location,
  Motif,
  ReadingPath,
  ResearchArticle,
  TimelineBeat
} from "@/lib/domain/schemas";

type TimelineBeatListProps = {
  beats: TimelineBeat[];
  chapters: Chapter[];
  characters: Character[];
  motifs: Motif[];
  locations: Location[];
  events?: Event[];
  evidenceCards?: EvidenceCard[];
  readingPaths?: ReadingPath[];
  researchArticles?: ResearchArticle[];
  compact?: boolean;
  description?: string;
  title?: string;
};

function makeMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function getChapterSummary(chapters: Chapter[]) {
  if (chapters.length === 0) {
    return "章节未标注";
  }

  return chapters.map((chapter) => `第 ${chapter.order} 章`).join(" / ");
}

function getEntityNames<T>(ids: string[], map: Map<string, T>, getName: (item: T) => string) {
  return ids
    .map((id) => map.get(id))
    .filter((item): item is T => Boolean(item))
    .map(getName);
}

function getBeatSignalData(
  beat: TimelineBeat,
  evidenceCards?: EvidenceCard[],
  researchArticles?: ResearchArticle[],
  readingPaths?: ReadingPath[]
) {
  const evidenceMatches = evidenceCards
    ? getBeatEvidenceMatches(beat, evidenceCards, evidenceCards.length)
    : [];
  const researchMatches = researchArticles
    ? getBeatResearchArticleMatches(beat, researchArticles, evidenceMatches, 1)
    : [];
  const readingPathMatches = readingPaths
    ? getBeatReadingPathMatches(beat, readingPaths, 1)
    : [];

  return {
    evidenceCount: evidenceMatches.length,
    firstEvidenceCard: evidenceMatches[0]?.card ?? null,
    firstResearchArticle: researchMatches[0]?.article ?? null,
    firstReadingPathMatch: readingPathMatches[0] ?? null
  };
}

export function TimelineBeatList({
  beats,
  chapters,
  characters,
  motifs,
  locations,
  events = [],
  evidenceCards,
  readingPaths,
  researchArticles,
  compact = false,
  description,
  title = "相关情节"
}: TimelineBeatListProps) {
  const chapterById = makeMap(chapters);
  const characterById = makeMap(characters);
  const motifById = makeMap(motifs);
  const locationById = makeMap(locations);
  const eventById = makeMap(events);
  const orderedBeats = [...beats].sort((first, second) => first.storyOrder - second.storyOrder);
  const shouldShowSignals = Boolean(evidenceCards || readingPaths || researchArticles);

  if (orderedBeats.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={title}
      className={`timeline-beat-list-block ${compact ? "is-compact" : ""}`}
    >
      <div className="timeline-beat-list-heading">
        <div>
          <p className="eyebrow">Plot Beats</p>
          {compact ? <h3>{title}</h3> : <h2>{title}</h2>}
        </div>
        <span>{orderedBeats.length} 条</span>
      </div>

      {description ? <p className="timeline-beat-list-description">{description}</p> : null}

      <div className="timeline-beat-snippet-list">
        {orderedBeats.map((beat) => {
          const beatChapters = beat.chapterIds
            .map((id) => chapterById.get(id))
            .filter((chapter): chapter is Chapter => Boolean(chapter));
          const characterNames = getEntityNames(
            beat.participantCharacterIds,
            characterById,
            (character) => character.canonicalName
          );
          const motifNames = getEntityNames(beat.motifIds, motifById, (motif) => motif.name);
          const locationNames = getEntityNames(beat.locationIds, locationById, (location) => location.name);
          const linkedEvent = beat.linkedEventId ? eventById.get(beat.linkedEventId) : null;
          const {
            evidenceCount,
            firstEvidenceCard,
            firstResearchArticle,
            firstReadingPathMatch
          } = getBeatSignalData(beat, evidenceCards, researchArticles, readingPaths);

          return (
            <article className="timeline-beat-snippet" id={beat.id} key={beat.id}>
              <Link className="timeline-beat-snippet-main" href={`/timeline?beat=${beat.id}`}>
                <span className="meta-row">
                  <span className="meta-pill">
                    <Clock3 size={12} />
                    故事 {beat.storyOrder}
                  </span>
                  <span className="meta-pill">
                    <BookOpen size={12} />
                    {getChapterSummary(beatChapters)}
                  </span>
                  {linkedEvent ? (
                    <span className="meta-pill">关键：{linkedEvent.title}</span>
                  ) : null}
                  {evidenceCards ? (
                    <span className="meta-pill timeline-beat-evidence-count">
                      <Quote size={12} />
                      {evidenceCount} 条证据
                    </span>
                  ) : null}
                </span>
                <strong>{beat.title}</strong>
                <span className="timeline-beat-snippet-summary">{beat.summary}</span>
              </Link>

              {shouldShowSignals ? (
                <div className="timeline-beat-buoys" aria-label={`${beat.title}证据浮标`}>
                  {firstEvidenceCard ? (
                    <Link className="timeline-beat-buoy is-evidence" href={`/evidence/${firstEvidenceCard.id}`}>
                      <Quote size={13} />
                      <span>文本证据</span>
                      <strong>{firstEvidenceCard.title}</strong>
                    </Link>
                  ) : null}
                  {firstResearchArticle ? (
                    <Link className="timeline-beat-buoy is-research" href={`/archive/${firstResearchArticle.slug}`}>
                      <FileText size={13} />
                      <span>相关研究</span>
                      <strong>{firstResearchArticle.title}</strong>
                    </Link>
                  ) : null}
                  {firstReadingPathMatch ? (
                    <Link
                      className="timeline-beat-buoy is-path"
                      href={`/paths/${firstReadingPathMatch.path.slug}#${firstReadingPathMatch.step.id}`}
                    >
                      <Route size={13} />
                      <span>相关路径</span>
                      <strong>{firstReadingPathMatch.path.title}</strong>
                    </Link>
                  ) : null}
                  <Link className="timeline-beat-buoy is-timeline" href={`/timeline?beat=${beat.id}`}>
                    <Clock3 size={13} />
                    <span>时间迷宫</span>
                  </Link>
                </div>
              ) : null}

              <div className="timeline-beat-snippet-links" aria-label={`${beat.title}关联线索`}>
                {characterNames.slice(0, 3).map((name, index) => (
                  <span key={`${beat.id}-character-${name}-${index}`}>
                    <UserRound size={12} />
                    {name}
                  </span>
                ))}
                {locationNames.slice(0, 2).map((name, index) => (
                  <span key={`${beat.id}-location-${name}-${index}`}>
                    <MapPinned size={12} />
                    {name}
                  </span>
                ))}
                {motifNames.slice(0, 3).map((name, index) => (
                  <span key={`${beat.id}-motif-${name}-${index}`}>
                    <Sparkles size={12} />
                    {name}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
