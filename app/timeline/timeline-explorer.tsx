"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Clock3,
  FileText,
  GitBranch,
  ListFilter,
  MapPinned,
  Quote,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo } from "react";
import type {
  Chapter,
  Character,
  EvidenceCard,
  Event,
  Location,
  Motif,
  ReadingPath,
  ResearchArticle,
  TimelineBeat,
  TimelineStage
} from "@/lib/domain/schemas";
import {
  buildBeatAdjacencyMap,
  getBeatEvidenceMatches,
  getBeatReadingPathMatches,
  getBeatResearchArticleMatches
} from "@/lib/data/timeline-beat-relations";
import type { BeatReadingPathMatch } from "@/lib/data/timeline-beat-relations";

type TimelineOrder = "story" | "narrative";
type TimelineLayer = "full" | "key";

type TimelineQuery = {
  layer: TimelineLayer;
  order: TimelineOrder;
  characterId: string | null;
  motifId: string | null;
  locationId: string | null;
  stageId: string | null;
  from: number;
  to: number;
  eventId: string | null;
  beatId: string | null;
  q: string;
};

type EventRecord = {
  event: Event;
  sourceIndex: number;
  chapters: Chapter[];
  characters: Character[];
  motifs: Motif[];
  locations: Location[];
  readingPaths: ReadingPath[];
  earliestChapterOrder: number;
  searchText: string;
};

type BeatRecord = {
  beat: TimelineBeat;
  sourceIndex: number;
  stage: TimelineStage | null;
  chapters: Chapter[];
  characters: Character[];
  motifs: Motif[];
  locations: Location[];
  linkedEvent: Event | null;
  relatedEvidenceCards: EvidenceCard[];
  relatedResearchArticles: ResearchArticle[];
  relatedReadingPaths: BeatReadingPathMatch[];
  previousBeat: TimelineBeat | null;
  nextBeat: TimelineBeat | null;
  earliestChapterOrder: number;
  searchText: string;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

const orderLabels: Record<TimelineOrder, { label: string; shortLabel: string; otherLabel: string }> = {
  story: { label: "故事顺序", shortLabel: "故事", otherLabel: "叙事" },
  narrative: { label: "叙事顺序", shortLabel: "叙事", otherLabel: "故事" }
};

const layerLabels: Record<TimelineLayer, { label: string; totalLabel: string; currentLabel: string }> = {
  full: { label: "完整情节", totalLabel: "情节总数", currentLabel: "当前情节" },
  key: { label: "关键坐标", totalLabel: "事件总数", currentLabel: "当前事件" }
};

function clampChapterOrder(value: number, minChapterOrder: number, maxChapterOrder: number) {
  return Math.min(maxChapterOrder, Math.max(minChapterOrder, value));
}

function parseChapterOrder(
  rawValue: string | null,
  fallback: number,
  minChapterOrder: number,
  maxChapterOrder: number
) {
  if (rawValue === null || rawValue.trim() === "") {
    return fallback;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return clampChapterOrder(value, minChapterOrder, maxChapterOrder);
}

function normalizeSearchQuery(rawValue: string | null) {
  return (rawValue ?? "").trim().slice(0, 80);
}

function normalizeForSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizeTimelineQuery(
  query: TimelineQuery,
  validCharacterIds: Set<string>,
  validMotifIds: Set<string>,
  validLocationIds: Set<string>,
  validStageIds: Set<string>,
  validEventIds: Set<string>,
  validBeatIds: Set<string>,
  minChapterOrder: number,
  maxChapterOrder: number
) {
  const from = clampChapterOrder(query.from, minChapterOrder, maxChapterOrder);
  const to = clampChapterOrder(query.to, minChapterOrder, maxChapterOrder);
  const [normalizedFrom, normalizedTo] = from <= to ? [from, to] : [to, from];
  const layer = query.layer === "key" ? "key" : "full";

  return {
    layer,
    order: query.order === "narrative" ? "narrative" : "story",
    characterId: query.characterId && validCharacterIds.has(query.characterId) ? query.characterId : null,
    motifId: query.motifId && validMotifIds.has(query.motifId) ? query.motifId : null,
    locationId: query.locationId && validLocationIds.has(query.locationId) ? query.locationId : null,
    stageId: layer === "full" && query.stageId && validStageIds.has(query.stageId) ? query.stageId : null,
    from: normalizedFrom,
    to: normalizedTo,
    eventId: layer === "key" && query.eventId && validEventIds.has(query.eventId) ? query.eventId : null,
    beatId: layer === "full" && query.beatId && validBeatIds.has(query.beatId) ? query.beatId : null,
    q: query.q.trim()
  } satisfies TimelineQuery;
}

function readTimelineQuery(
  searchParams: SearchParamReader,
  validCharacterIds: Set<string>,
  validMotifIds: Set<string>,
  validLocationIds: Set<string>,
  validStageIds: Set<string>,
  validEventIds: Set<string>,
  validBeatIds: Set<string>,
  minChapterOrder: number,
  maxChapterOrder: number
) {
  const rawLayer = searchParams.get("layer");
  const rawEventId = searchParams.get("event");
  const rawBeatId = searchParams.get("beat");
  const inferredLayer = rawLayer === "key" || (!rawLayer && rawEventId) ? "key" : "full";
  const rawOrder = searchParams.get("order");
  const query = {
    layer: rawLayer === "full" || rawLayer === "key" ? rawLayer : inferredLayer,
    order: rawOrder === "narrative" ? "narrative" : "story",
    characterId: searchParams.get("character"),
    motifId: searchParams.get("motif"),
    locationId: searchParams.get("location"),
    stageId: searchParams.get("stage"),
    from: parseChapterOrder(searchParams.get("from"), minChapterOrder, minChapterOrder, maxChapterOrder),
    to: parseChapterOrder(searchParams.get("to"), maxChapterOrder, minChapterOrder, maxChapterOrder),
    eventId: rawEventId,
    beatId: rawBeatId,
    q: normalizeSearchQuery(searchParams.get("q"))
  } satisfies TimelineQuery;

  return normalizeTimelineQuery(
    query,
    validCharacterIds,
    validMotifIds,
    validLocationIds,
    validStageIds,
    validEventIds,
    validBeatIds,
    minChapterOrder,
    maxChapterOrder
  );
}

function buildQueryString(query: TimelineQuery, minChapterOrder: number, maxChapterOrder: number) {
  const params = new URLSearchParams();

  if (query.layer === "key") {
    params.set("layer", query.layer);
  }
  if (query.order === "narrative") {
    params.set("order", query.order);
  }
  if (query.characterId) {
    params.set("character", query.characterId);
  }
  if (query.motifId) {
    params.set("motif", query.motifId);
  }
  if (query.locationId) {
    params.set("location", query.locationId);
  }
  if (query.layer === "full" && query.stageId) {
    params.set("stage", query.stageId);
  }
  if (query.from !== minChapterOrder) {
    params.set("from", String(query.from));
  }
  if (query.to !== maxChapterOrder) {
    params.set("to", String(query.to));
  }
  if (query.layer === "key" && query.eventId) {
    params.set("event", query.eventId);
  }
  if (query.layer === "full" && query.beatId) {
    params.set("beat", query.beatId);
  }
  if (query.q) {
    params.set("q", query.q);
  }

  return params.toString();
}

function getChapterSummary(chapters: Chapter[]) {
  if (chapters.length === 0) {
    return "章节未标注";
  }
  return chapters.map((chapter) => `第 ${chapter.order} 章`).join(" / ");
}

function getActiveOrderValue(item: Event | TimelineBeat, order: TimelineOrder) {
  return order === "story" ? item.storyOrder : item.narrativeOrder;
}

function getOtherOrderValue(item: Event | TimelineBeat, order: TimelineOrder) {
  return order === "story" ? item.narrativeOrder : item.storyOrder;
}

function buildIdCountMap<T>(items: T[], getIds: (item: T) => string[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    getIds(item).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  });
  return counts;
}

function getRecordMatchesSearch(searchText: string, query: string) {
  return !query || searchText.includes(normalizeForSearch(query));
}

function EventDetailContent({
  record,
  order,
  onClose
}: {
  record: EventRecord | null;
  order: TimelineOrder;
  onClose?: () => void;
}) {
  if (!record) {
    return (
      <div className="timeline-detail-empty">
        <Clock3 size={22} />
        <strong>没有匹配的事件</strong>
        <span>调整筛选条件后，事件详情会在这里展开。</span>
      </div>
    );
  }

  const { event, chapters, characters, motifs, locations, readingPaths } = record;
  const activeOrderValue = getActiveOrderValue(event, order);
  const otherOrderValue = getOtherOrderValue(event, order);
  const otherOrderLabel = orderLabels[order].otherLabel;

  return (
    <>
      <div className="timeline-detail-heading">
        <div>
          <p className="eyebrow">Key Coordinate</p>
          <h3>{event.title}</h3>
        </div>
        {onClose ? (
          <button aria-label="关闭事件详情" className="timeline-drawer-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="timeline-detail-index">
        <span>
          <strong>{activeOrderValue}</strong>
          {orderLabels[order].label}
        </span>
        <span>
          <strong>{otherOrderValue}</strong>
          {otherOrderLabel}坐标
        </span>
      </div>

      <p className="timeline-detail-summary">{event.summary}</p>

      {event.tags.length > 0 ? (
        <div className="tag-row timeline-detail-tags" aria-label="事件标签">
          {event.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="timeline-detail-groups">
        <section>
          <h4>
            <MapPinned size={15} />
            发生地点
          </h4>
          <div className="timeline-chip-list">
            {locations.map((location) => (
              <Link href={`/map?location=${location.id}`} key={location.id}>
                {location.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h4>
            <UserRound size={15} />
            参与人物
          </h4>
          <div className="timeline-link-grid">
            {characters.map((character) => (
              <Link href={`/characters/${character.id}`} key={character.id}>
                <strong>{character.canonicalName}</strong>
                <span>{character.lonelinessType}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h4>
            <Sparkles size={15} />
            关联意象
          </h4>
          <div className="timeline-chip-list">
            {motifs.map((motif) => (
              <Link href={`/motifs/${motif.id}`} key={motif.id}>
                {motif.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h4>
            <BookOpen size={15} />
            章节入口
          </h4>
          <div className="timeline-link-grid">
            {chapters.map((chapter) => (
              <Link href={`/one-hundred-years?chapter=${chapter.slug}&event=${event.id}`} key={chapter.id}>
                <strong>第 {chapter.order} 章</strong>
                <span>{chapter.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {readingPaths.length > 0 ? (
          <section>
            <h4>
              <Route size={15} />
              相关路径
            </h4>
            <div className="timeline-link-grid">
              {readingPaths.map((path) => (
                <Link href={`/paths/${path.slug}`} key={path.id}>
                  <strong>{path.title}</strong>
                  <span>{path.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function BeatDetailContent({
  record,
  order,
  onClose
}: {
  record: BeatRecord | null;
  order: TimelineOrder;
  onClose?: () => void;
}) {
  if (!record) {
    return (
      <div className="timeline-detail-empty">
        <Clock3 size={22} />
        <strong>没有匹配的情节</strong>
        <span>调整阶段、章节或关键词后，情节详情会在这里展开。</span>
      </div>
    );
  }

  const {
    beat,
    stage,
    chapters,
    characters,
    motifs,
    locations,
    linkedEvent,
    relatedEvidenceCards,
    relatedResearchArticles,
    relatedReadingPaths,
    previousBeat,
    nextBeat
  } = record;
  const activeOrderValue = getActiveOrderValue(beat, order);
  const otherOrderValue = getOtherOrderValue(beat, order);
  const otherOrderLabel = orderLabels[order].otherLabel;

  return (
    <>
      <div className="timeline-detail-heading">
        <div>
          <p className="eyebrow">Plot Beat</p>
          <h3>{beat.title}</h3>
        </div>
        {onClose ? (
          <button aria-label="关闭情节详情" className="timeline-drawer-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="timeline-detail-index">
        <span>
          <strong>{activeOrderValue}</strong>
          {orderLabels[order].label}
        </span>
        <span>
          <strong>{otherOrderValue}</strong>
          {otherOrderLabel}坐标
        </span>
      </div>

      <p className="timeline-detail-summary">{beat.summary}</p>

      {beat.tags.length > 0 ? (
        <div className="tag-row timeline-detail-tags" aria-label="情节标签">
          {beat.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="timeline-detail-groups">
        {stage ? (
          <section>
            <h4>
              <GitBranch size={15} />
              所属阶段
            </h4>
            <div className="timeline-link-grid">
              <Link href={`/timeline?stage=${stage.id}`}>
                <strong>
                  {String(stage.order).padStart(2, "0")} · {stage.title}
                </strong>
                <span>{stage.summary}</span>
              </Link>
            </div>
          </section>
        ) : null}

        {linkedEvent ? (
          <section>
            <h4>
              <Clock3 size={15} />
              关键坐标
            </h4>
            <div className="timeline-link-grid">
              <Link href={`/timeline?layer=key&event=${linkedEvent.id}`}>
                <strong>{linkedEvent.title}</strong>
                <span>{linkedEvent.summary}</span>
              </Link>
            </div>
          </section>
        ) : null}

        {relatedEvidenceCards.length > 0 ? (
          <section>
            <h4>
              <Quote size={15} />
              文本证据
            </h4>
            <div className="timeline-link-grid">
              {relatedEvidenceCards.map((card) => (
                <Link href={`/evidence/${card.id}`} key={card.id}>
                  <strong>{card.title}</strong>
                  <span>{card.quote.sourceNote}</span>
                  <span>{card.paraphrase}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedResearchArticles.length > 0 ? (
          <section>
            <h4>
              <FileText size={15} />
              相关研究
            </h4>
            <div className="timeline-link-grid">
              {relatedResearchArticles.map((article) => (
                <Link href={`/archive/${article.slug}`} key={article.id}>
                  <strong>{article.title}</strong>
                  <span>{article.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedReadingPaths.length > 0 ? (
          <section>
            <h4>
              <Route size={15} />
              相关路径
            </h4>
            <div className="timeline-link-grid">
              {relatedReadingPaths.map((match) => (
                <Link href={`/paths/${match.path.slug}#${match.step.id}`} key={`${match.path.id}-${match.step.id}`}>
                  <strong>{match.path.title}</strong>
                  <span>{match.step.title} · {match.path.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h4>
            <BookOpen size={15} />
            章节入口
          </h4>
          <div className="timeline-link-grid">
            {chapters.map((chapter) => (
              <Link href={`/one-hundred-years?chapter=${chapter.slug}`} key={chapter.id}>
                <strong>第 {chapter.order} 章</strong>
                <span>{chapter.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {characters.length > 0 ? (
          <section>
            <h4>
              <UserRound size={15} />
              关联人物
            </h4>
            <div className="timeline-link-grid">
              {characters.map((character) => (
                <Link href={`/characters/${character.id}`} key={character.id}>
                  <strong>{character.canonicalName}</strong>
                  <span>{character.lonelinessType}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {locations.length > 0 ? (
          <section>
            <h4>
              <MapPinned size={15} />
              关联地点
            </h4>
            <div className="timeline-chip-list">
              {locations.map((location) => (
                <Link href={`/map?location=${location.id}`} key={location.id}>
                  {location.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {motifs.length > 0 ? (
          <section>
            <h4>
              <Sparkles size={15} />
              关联意象
            </h4>
            <div className="timeline-chip-list">
              {motifs.map((motif) => (
                <Link href={`/motifs/${motif.id}`} key={motif.id}>
                  {motif.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {previousBeat || nextBeat ? (
          <section>
            <h4>
              <BookOpen size={15} />
              同章相邻情节
            </h4>
            <div className="timeline-link-grid">
              {previousBeat ? (
                <Link href={`/timeline?beat=${previousBeat.id}`}>
                  <strong>上一条 · {previousBeat.title}</strong>
                  <span>{previousBeat.summary}</span>
                </Link>
              ) : null}
              {nextBeat ? (
                <Link href={`/timeline?beat=${nextBeat.id}`}>
                  <strong>下一条 · {nextBeat.title}</strong>
                  <span>{nextBeat.summary}</span>
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        <section>
          <h4>
            <ListFilter size={15} />
            材料来源
          </h4>
          <p className="timeline-source-note">
            {beat.source.section} · 第 {beat.source.item} 条 · line {beat.source.line}
          </p>
        </section>
      </div>
    </>
  );
}

export function TimelineExplorer({
  events,
  timelineStages,
  timelineBeats,
  characters,
  motifs,
  chapters,
  locations,
  readingPaths,
  evidenceCards,
  researchArticles
}: {
  events: Event[];
  timelineStages: TimelineStage[];
  timelineBeats: TimelineBeat[];
  characters: Character[];
  motifs: Motif[];
  chapters: Chapter[];
  locations: Location[];
  readingPaths: ReadingPath[];
  evidenceCards: EvidenceCard[];
  researchArticles: ResearchArticle[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chapterOrders = useMemo(() => chapters.map((chapter) => chapter.order), [chapters]);
  const minChapterOrder = chapterOrders.length > 0 ? Math.min(...chapterOrders) : 1;
  const maxChapterOrder = chapterOrders.length > 0 ? Math.max(...chapterOrders) : 20;

  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );
  const motifById = useMemo(() => new Map(motifs.map((motif) => [motif.id, motif])), [motifs]);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const chapterById = useMemo(() => new Map(chapters.map((chapter) => [chapter.id, chapter])), [chapters]);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const stageById = useMemo(() => new Map(timelineStages.map((stage) => [stage.id, stage])), [timelineStages]);
  const beatAdjacencyById = useMemo(
    () => buildBeatAdjacencyMap(timelineBeats, chapterById),
    [chapterById, timelineBeats]
  );

  const validCharacterIds = useMemo(() => new Set(characters.map((character) => character.id)), [characters]);
  const validMotifIds = useMemo(() => new Set(motifs.map((motif) => motif.id)), [motifs]);
  const validLocationIds = useMemo(() => new Set(locations.map((location) => location.id)), [locations]);
  const validStageIds = useMemo(() => new Set(timelineStages.map((stage) => stage.id)), [timelineStages]);
  const validEventIds = useMemo(() => new Set(events.map((event) => event.id)), [events]);
  const validBeatIds = useMemo(() => new Set(timelineBeats.map((beat) => beat.id)), [timelineBeats]);

  const query = useMemo(
    () =>
      readTimelineQuery(
        searchParams,
        validCharacterIds,
        validMotifIds,
        validLocationIds,
        validStageIds,
        validEventIds,
        validBeatIds,
        minChapterOrder,
        maxChapterOrder
      ),
    [
      maxChapterOrder,
      minChapterOrder,
      searchParams,
      validBeatIds,
      validCharacterIds,
      validEventIds,
      validLocationIds,
      validMotifIds,
      validStageIds
    ]
  );

  const canonicalQueryString = useMemo(
    () => buildQueryString(query, minChapterOrder, maxChapterOrder),
    [maxChapterOrder, minChapterOrder, query]
  );

  useEffect(() => {
    if (searchParams.toString() !== canonicalQueryString) {
      router.replace(canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname, { scroll: false });
    }
  }, [canonicalQueryString, pathname, router, searchParams]);

  const eventRecords = useMemo<EventRecord[]>(
    () =>
      events.map((event, sourceIndex) => {
        const eventChapters = event.chapterIds
          .map((id) => chapterById.get(id))
          .filter((chapter): chapter is Chapter => Boolean(chapter))
          .sort((a, b) => a.order - b.order);
        const eventCharacters = event.participantCharacterIds
          .map((id) => characterById.get(id))
          .filter((character): character is Character => Boolean(character));
        const eventMotifs = event.motifIds
          .map((id) => motifById.get(id))
          .filter((motif): motif is Motif => Boolean(motif));
        const eventLocations = event.locationIds
          .map((id) => locationById.get(id))
          .filter((location): location is Location => Boolean(location));
        const eventReadingPaths = readingPaths.filter((path) =>
          path.steps.some((step) => step.eventIds.includes(event.id))
        );
        const searchText = normalizeForSearch([
          event.title,
          event.summary,
          ...event.tags,
          ...eventCharacters.map((character) => character.canonicalName),
          ...eventMotifs.map((motif) => motif.name),
          ...eventLocations.map((location) => location.name),
          ...eventChapters.map((chapter) => chapter.title)
        ].join(" "));

        return {
          event,
          sourceIndex,
          chapters: eventChapters,
          characters: eventCharacters,
          motifs: eventMotifs,
          locations: eventLocations,
          readingPaths: eventReadingPaths,
          earliestChapterOrder: eventChapters[0]?.order ?? Number.MAX_SAFE_INTEGER,
          searchText
        };
      }),
    [chapterById, characterById, events, locationById, motifById, readingPaths]
  );

  const beatRecords = useMemo<BeatRecord[]>(
    () =>
      timelineBeats.map((beat, sourceIndex) => {
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
        const stage = stageById.get(beat.stageId) ?? null;
        const linkedEvent = beat.linkedEventId ? eventById.get(beat.linkedEventId) ?? null : null;
        const evidenceMatches = getBeatEvidenceMatches(beat, evidenceCards);
        const researchArticleMatches = getBeatResearchArticleMatches(beat, researchArticles, evidenceMatches);
        const readingPathMatches = getBeatReadingPathMatches(beat, readingPaths);
        const beatAdjacency = beatAdjacencyById.get(beat.id);
        const searchText = normalizeForSearch([
          beat.title,
          beat.summary,
          stage?.title ?? "",
          stage?.summary ?? "",
          beat.source.section,
          ...beat.tags,
          ...beatCharacters.map((character) => character.canonicalName),
          ...beatMotifs.map((motif) => motif.name),
          ...beatLocations.map((location) => location.name),
          ...beatChapters.map((chapter) => chapter.title),
          linkedEvent?.title ?? ""
        ].join(" "));

        return {
          beat,
          sourceIndex,
          stage,
          chapters: beatChapters,
          characters: beatCharacters,
          motifs: beatMotifs,
          locations: beatLocations,
          linkedEvent,
          relatedEvidenceCards: evidenceMatches.map((match) => match.card),
          relatedResearchArticles: researchArticleMatches.map((match) => match.article),
          relatedReadingPaths: readingPathMatches,
          previousBeat: beatAdjacency?.previousBeat ?? null,
          nextBeat: beatAdjacency?.nextBeat ?? null,
          earliestChapterOrder: beatChapters[0]?.order ?? Number.MAX_SAFE_INTEGER,
          searchText
        };
      }),
    [
      beatAdjacencyById,
      chapterById,
      characterById,
      eventById,
      evidenceCards,
      locationById,
      motifById,
      readingPaths,
      researchArticles,
      stageById,
      timelineBeats
    ]
  );

  const orderedEventRecords = useMemo(
    () =>
      [...eventRecords].sort((a, b) => {
        const orderDelta = getActiveOrderValue(a.event, query.order) - getActiveOrderValue(b.event, query.order);
        if (orderDelta !== 0) {
          return orderDelta;
        }
        const chapterDelta = a.earliestChapterOrder - b.earliestChapterOrder;
        if (chapterDelta !== 0) {
          return chapterDelta;
        }
        return a.sourceIndex - b.sourceIndex;
      }),
    [eventRecords, query.order]
  );

  const orderedBeatRecords = useMemo(
    () =>
      [...beatRecords].sort((a, b) => {
        const orderDelta = getActiveOrderValue(a.beat, query.order) - getActiveOrderValue(b.beat, query.order);
        if (orderDelta !== 0) {
          return orderDelta;
        }
        const chapterDelta = a.earliestChapterOrder - b.earliestChapterOrder;
        if (chapterDelta !== 0) {
          return chapterDelta;
        }
        return a.sourceIndex - b.sourceIndex;
      }),
    [beatRecords, query.order]
  );

  const visibleEventRecords = useMemo(
    () =>
      orderedEventRecords.filter((record) => {
        const { event, chapters: eventChapters } = record;
        const matchesCharacter = !query.characterId || event.participantCharacterIds.includes(query.characterId);
        const matchesMotif = !query.motifId || event.motifIds.includes(query.motifId);
        const matchesLocation = !query.locationId || event.locationIds.includes(query.locationId);
        const matchesChapterRange = eventChapters.some(
          (chapter) => chapter.order >= query.from && chapter.order <= query.to
        );
        return matchesCharacter &&
          matchesMotif &&
          matchesLocation &&
          matchesChapterRange &&
          getRecordMatchesSearch(record.searchText, query.q);
      }),
    [orderedEventRecords, query]
  );

  const visibleBeatRecords = useMemo(
    () =>
      orderedBeatRecords.filter((record) => {
        const { beat, chapters: beatChapters } = record;
        const matchesCharacter = !query.characterId || beat.participantCharacterIds.includes(query.characterId);
        const matchesMotif = !query.motifId || beat.motifIds.includes(query.motifId);
        const matchesLocation = !query.locationId || beat.locationIds.includes(query.locationId);
        const matchesStage = !query.stageId || beat.stageId === query.stageId;
        const matchesChapterRange = beatChapters.some(
          (chapter) => chapter.order >= query.from && chapter.order <= query.to
        );
        return matchesCharacter &&
          matchesMotif &&
          matchesLocation &&
          matchesStage &&
          matchesChapterRange &&
          getRecordMatchesSearch(record.searchText, query.q);
      }),
    [orderedBeatRecords, query]
  );

  const visibleBeatGroups = useMemo(
    () =>
      timelineStages
        .map((stage) => ({
          stage,
          records: visibleBeatRecords.filter((record) => record.beat.stageId === stage.id)
        }))
        .filter((group) => group.records.length > 0),
    [timelineStages, visibleBeatRecords]
  );

  const exactSelectedEventRecord = query.layer === "key" && query.eventId
    ? visibleEventRecords.find((record) => record.event.id === query.eventId) ?? null
    : null;
  const selectedEventRecord = query.layer === "key"
    ? exactSelectedEventRecord ?? visibleEventRecords[0] ?? null
    : null;
  const exactSelectedBeatRecord = query.layer === "full" && query.beatId
    ? visibleBeatRecords.find((record) => record.beat.id === query.beatId) ?? null
    : null;
  const selectedBeatRecord = query.layer === "full"
    ? exactSelectedBeatRecord ?? visibleBeatRecords[0] ?? null
    : null;

  const selectedCharacter = query.characterId ? characterById.get(query.characterId) : null;
  const selectedMotif = query.motifId ? motifById.get(query.motifId) : null;
  const selectedLocation = query.locationId ? locationById.get(query.locationId) : null;
  const selectedStage = query.stageId ? stageById.get(query.stageId) : null;
  const activeFilterCount = Number(Boolean(query.characterId)) +
    Number(Boolean(query.motifId)) +
    Number(Boolean(query.locationId)) +
    Number(Boolean(query.layer === "full" && query.stageId)) +
    Number(Boolean(query.q)) +
    Number(query.from !== minChapterOrder || query.to !== maxChapterOrder);
  const chapterOptions = chapters.map((chapter) => chapter.order);
  const currentRecordsLength = query.layer === "full" ? visibleBeatRecords.length : visibleEventRecords.length;
  const totalRecordsLength = query.layer === "full" ? timelineBeats.length : events.length;
  const characterCounts = query.layer === "full"
    ? buildIdCountMap(timelineBeats, (beat) => beat.participantCharacterIds)
    : buildIdCountMap(events, (event) => event.participantCharacterIds);
  const motifCounts = query.layer === "full"
    ? buildIdCountMap(timelineBeats, (beat) => beat.motifIds)
    : buildIdCountMap(events, (event) => event.motifIds);
  const locationCounts = query.layer === "full"
    ? buildIdCountMap(timelineBeats, (beat) => beat.locationIds)
    : buildIdCountMap(events, (event) => event.locationIds);
  const stageBeatCounts = buildIdCountMap(timelineBeats, (beat) => [beat.stageId]);

  function replaceQuery(nextQuery: TimelineQuery) {
    const normalizedQuery = normalizeTimelineQuery(
      nextQuery,
      validCharacterIds,
      validMotifIds,
      validLocationIds,
      validStageIds,
      validEventIds,
      validBeatIds,
      minChapterOrder,
      maxChapterOrder
    );
    const nextQueryString = buildQueryString(normalizedQuery, minChapterOrder, maxChapterOrder);
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  function resetFilters() {
    replaceQuery({
      layer: "full",
      order: "story",
      characterId: null,
      motifId: null,
      locationId: null,
      stageId: null,
      from: minChapterOrder,
      to: maxChapterOrder,
      eventId: null,
      beatId: null,
      q: ""
    });
  }

  function switchLayer(layer: TimelineLayer) {
    replaceQuery({
      ...query,
      layer,
      stageId: layer === "full" ? query.stageId : null,
      eventId: null,
      beatId: null
    });
  }

  function selectEvent(eventId: string) {
    replaceQuery({ ...query, layer: "key", eventId, beatId: null });
  }

  function selectBeat(beatId: string) {
    replaceQuery({ ...query, layer: "full", beatId, eventId: null });
  }

  function closeDrawer() {
    replaceQuery({ ...query, eventId: null, beatId: null });
  }

  return (
    <section className="section time-labyrinth" aria-labelledby="time-labyrinth-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chronology Console</p>
          <h2 id="time-labyrinth-title">故事时间与叙事时间</h2>
        </div>
        <p>在全量情节链与关键坐标之间切换，沿人物、意象、地点和章节范围追踪命运如何反复折回。</p>
      </div>

      <div className="timeline-stat-strip" aria-label="时间迷宫数据概览">
        <span>
          <strong>{currentRecordsLength}</strong>
          {layerLabels[query.layer].currentLabel}
        </span>
        <span>
          <strong>{totalRecordsLength}</strong>
          {layerLabels[query.layer].totalLabel}
        </span>
        <span>
          <strong>{query.from}-{query.to}</strong>
          章节范围
        </span>
        <span>
          <strong>{activeFilterCount}</strong>
          筛选条件
        </span>
      </div>

      <div className="timeline-toolbar">
        <div className="timeline-control-row">
          <div className="segmented-control" aria-label="时间线层级">
            <button
              aria-pressed={query.layer === "full"}
              onClick={() => switchLayer("full")}
              type="button"
            >
              <BookOpen size={17} />
              完整情节
            </button>
            <button
              aria-pressed={query.layer === "key"}
              onClick={() => switchLayer("key")}
              type="button"
            >
              <Clock3 size={17} />
              关键坐标
            </button>
          </div>

          <div className="segmented-control" aria-label="时间线顺序">
            <button
              aria-pressed={query.order === "story"}
              onClick={() => replaceQuery({ ...query, order: "story", eventId: null, beatId: null })}
              type="button"
            >
              <GitBranch size={17} />
              故事顺序
            </button>
            <button
              aria-pressed={query.order === "narrative"}
              onClick={() => replaceQuery({ ...query, order: "narrative", eventId: null, beatId: null })}
              type="button"
            >
              <Route size={17} />
              叙事顺序
            </button>
          </div>
        </div>

        <div className="timeline-filter-grid" aria-label="时间线筛选">
          <label className="timeline-field">
            <span>
              <Search size={14} />
              搜索
            </span>
            <input
              className="timeline-input"
              onChange={(event) => replaceQuery({ ...query, q: event.target.value, eventId: null, beatId: null })}
              placeholder="情节、标签、人物"
              type="search"
              value={query.q}
            />
          </label>

          {query.layer === "full" ? (
            <label className="timeline-field">
              <span>
                <GitBranch size={14} />
                阶段
              </span>
              <select
                className="timeline-select"
                onChange={(event) =>
                  replaceQuery({ ...query, stageId: event.target.value || null, beatId: null })
                }
                value={query.stageId ?? ""}
              >
                <option value="">全部阶段</option>
                {timelineStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {String(stage.order).padStart(2, "0")} · {stage.title} · {stageBeatCounts.get(stage.id) ?? 0}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="timeline-field">
            <span>
              <UserRound size={14} />
              人物
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({ ...query, characterId: event.target.value || null, eventId: null, beatId: null })
              }
              value={query.characterId ?? ""}
            >
              <option value="">全部人物</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.canonicalName} · {characterCounts.get(character.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-field">
            <span>
              <Sparkles size={14} />
              意象
            </span>
            <select
              className="timeline-select"
              onChange={(event) => replaceQuery({ ...query, motifId: event.target.value || null, eventId: null, beatId: null })}
              value={query.motifId ?? ""}
            >
              <option value="">全部意象</option>
              {motifs.map((motif) => (
                <option key={motif.id} value={motif.id}>
                  {motif.name} · {motifCounts.get(motif.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-field">
            <span>
              <MapPinned size={14} />
              地点
            </span>
            <select
              className="timeline-select"
              onChange={(event) => replaceQuery({ ...query, locationId: event.target.value || null, eventId: null, beatId: null })}
              value={query.locationId ?? ""}
            >
              <option value="">全部地点</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {locationCounts.get(location.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-field timeline-range-field">
            <span>
              <BookOpen size={14} />
              起始章节
            </span>
            <select
              className="timeline-select"
              onChange={(event) => {
                const from = Number(event.target.value);
                replaceQuery({ ...query, from, to: Math.max(query.to, from), eventId: null, beatId: null });
              }}
              value={query.from}
            >
              {chapterOptions.map((order) => (
                <option key={order} value={order}>
                  第 {order} 章
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-field timeline-range-field">
            <span>
              <BookOpen size={14} />
              结束章节
            </span>
            <select
              className="timeline-select"
              onChange={(event) => {
                const to = Number(event.target.value);
                replaceQuery({ ...query, from: Math.min(query.from, to), to, eventId: null, beatId: null });
              }}
              value={query.to}
            >
              {chapterOptions.map((order) => (
                <option key={order} value={order}>
                  第 {order} 章
                </option>
              ))}
            </select>
          </label>

          <button className="ghost-button timeline-reset-button" onClick={resetFilters} type="button">
            <RotateCcw size={16} />
            重置
          </button>
        </div>

        <div className="timeline-active-filters" aria-label="当前筛选">
          <span>
            <ListFilter size={14} />
            {layerLabels[query.layer].label}
          </span>
          <span>{orderLabels[query.order].label}</span>
          {selectedStage ? <span>{selectedStage.title}</span> : null}
          {selectedCharacter ? <span>{selectedCharacter.canonicalName}</span> : null}
          {selectedMotif ? <span>{selectedMotif.name}</span> : null}
          {selectedLocation ? <span>{selectedLocation.name}</span> : null}
          {query.q ? <span>搜索：{query.q}</span> : null}
          <span>
            第 {query.from} 至 {query.to} 章
          </span>
        </div>
      </div>

      <div className="timeline-workbench">
        <div className="timeline-atlas-surface">
          <div className="surface-title">
            <Clock3 size={19} />
            <span>{layerLabels[query.layer].label} · {orderLabels[query.order].label}</span>
            <small>{currentRecordsLength} 条</small>
          </div>

          {query.layer === "full" ? (
            visibleBeatRecords.length > 0 ? (
              <div className="timeline-stage-stack" aria-label="完整情节时间线">
                {visibleBeatGroups.map((group) => (
                  <section className="timeline-stage-group" key={group.stage.id}>
                    <div className="timeline-stage-heading">
                      <span>{String(group.stage.order).padStart(2, "0")}</span>
                      <div>
                        <h3>{group.stage.title}</h3>
                        <p>{group.stage.summary}</p>
                      </div>
                      <small>{group.records.length} 条</small>
                    </div>
                    <div className="timeline-track timeline-stage-track">
                      {group.records.map((record) => {
                        const {
                          beat,
                          chapters: beatChapters,
                          characters: beatCharacters,
                          motifs: beatMotifs,
                          locations: beatLocations,
                          linkedEvent
                        } = record;
                        const activeOrderValue = getActiveOrderValue(beat, query.order);
                        const otherOrderValue = getOtherOrderValue(beat, query.order);
                        const isSelected = selectedBeatRecord?.beat.id === beat.id;

                        return (
                          <button
                            aria-pressed={isSelected}
                            className="timeline-event-card timeline-beat-card"
                            id={beat.id}
                            key={beat.id}
                            onClick={() => selectBeat(beat.id)}
                            type="button"
                          >
                            <span className="timeline-order-mark">{activeOrderValue}</span>
                            <span className="timeline-event-body">
                              <span className="meta-row">
                                <span className="meta-pill">{orderLabels[query.order].shortLabel} {activeOrderValue}</span>
                                <span className="meta-pill">{orderLabels[query.order].otherLabel} {otherOrderValue}</span>
                                <span className="meta-pill">{getChapterSummary(beatChapters)}</span>
                                {linkedEvent ? <span className="meta-pill">关键：{linkedEvent.title}</span> : null}
                              </span>
                              <strong>{beat.title}</strong>
                              <span className="timeline-event-summary">{beat.summary}</span>
                              <span className="timeline-event-footnote">
                                {beatLocations.slice(0, 2).map((location) => location.name).join(" / ") || "地点未标注"}
                                {beatCharacters.length > 0 ? ` · ${beatCharacters.slice(0, 2).map((character) => character.canonicalName).join(" / ")}` : ""}
                                {beatMotifs.length > 0 ? ` · ${beatMotifs.slice(0, 2).map((motif) => motif.name).join(" / ")}` : ""}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="timeline-empty panel">
                <Clock3 size={24} />
                <strong>没有情节落在这些坐标里</strong>
                <p>换一个阶段、人物、意象、地点或章节范围，完整情节链会重新显影。</p>
                <button className="button compact-button" onClick={resetFilters} type="button">
                  <RotateCcw size={16} />
                  重置筛选
                </button>
              </div>
            )
          ) : visibleEventRecords.length > 0 ? (
            <div className="timeline-track" aria-label="关键事件时间线">
              {visibleEventRecords.map((record) => {
                const {
                  event,
                  chapters: eventChapters,
                  characters: eventCharacters,
                  motifs: eventMotifs,
                  locations: eventLocations
                } = record;
                const activeOrderValue = getActiveOrderValue(event, query.order);
                const otherOrderValue = getOtherOrderValue(event, query.order);
                const isSelected = selectedEventRecord?.event.id === event.id;

                return (
                  <button
                    aria-pressed={isSelected}
                    className="timeline-event-card"
                    id={event.id}
                    key={event.id}
                    onClick={() => selectEvent(event.id)}
                    type="button"
                  >
                    <span className="timeline-order-mark">{activeOrderValue}</span>
                    <span className="timeline-event-body">
                      <span className="meta-row">
                        <span className="meta-pill">{orderLabels[query.order].shortLabel} {activeOrderValue}</span>
                        <span className="meta-pill">{orderLabels[query.order].otherLabel} {otherOrderValue}</span>
                        <span className="meta-pill">{getChapterSummary(eventChapters)}</span>
                        <span className="meta-pill">
                          {eventLocations.slice(0, 2).map((location) => location.name).join(" / ")}
                        </span>
                      </span>
                      <strong>{event.title}</strong>
                      <span className="timeline-event-summary">{event.summary}</span>
                      <span className="timeline-event-footnote">
                        {eventCharacters.slice(0, 2).map((character) => character.canonicalName).join(" / ") || "人物未标注"}
                        {eventMotifs.length > 0 ? ` · ${eventMotifs.slice(0, 2).map((motif) => motif.name).join(" / ")}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="timeline-empty panel">
              <Clock3 size={24} />
              <strong>没有事件落在这些坐标里</strong>
              <p>换一个人物、意象、地点、章节范围或关键词，时间线会重新显影。</p>
              <button className="button compact-button" onClick={resetFilters} type="button">
                <RotateCcw size={16} />
                重置筛选
              </button>
            </div>
          )}
        </div>

        <aside className="timeline-detail-panel" aria-label="时间线详情">
          {query.layer === "full" ? (
            <BeatDetailContent order={query.order} record={selectedBeatRecord} />
          ) : (
            <EventDetailContent order={query.order} record={selectedEventRecord} />
          )}
        </aside>
      </div>

      <div
        className={`timeline-drawer-backdrop ${exactSelectedEventRecord || exactSelectedBeatRecord ? "is-open" : ""}`}
        onClick={closeDrawer}
      />
      <aside
        aria-hidden={!exactSelectedEventRecord && !exactSelectedBeatRecord}
        aria-label="时间线详情抽屉"
        className={`timeline-mobile-drawer ${exactSelectedEventRecord || exactSelectedBeatRecord ? "is-open" : ""}`}
      >
        {query.layer === "full" ? (
          <BeatDetailContent order={query.order} record={exactSelectedBeatRecord} onClose={closeDrawer} />
        ) : (
          <EventDetailContent order={query.order} record={exactSelectedEventRecord} onClose={closeDrawer} />
        )}
      </aside>
    </section>
  );
}
