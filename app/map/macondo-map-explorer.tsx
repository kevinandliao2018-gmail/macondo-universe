"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Building2,
  Clock3,
  Factory,
  Home,
  Landmark,
  Layers3,
  MapPinned,
  Mountain,
  RotateCcw,
  Route,
  SearchX,
  Sparkles,
  TrainFront,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, type CSSProperties } from "react";
import { TimelineBeatList } from "@/components/TimelineBeatList";
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

type LocationPeriod = Location["periodStates"][number]["period"];
type LocationZone = Location["zone"];

type MapQuery = {
  locationId: string;
  period: LocationPeriod;
};

type LocationRecord = {
  location: Location;
  chapters: Chapter[];
  beats: TimelineBeat[];
  events: Event[];
  characters: Character[];
  motifs: Motif[];
  readingPaths: ReadingPath[];
};

type LocationNodeStyle = CSSProperties & {
  "--x": string;
  "--y": string;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

const defaultLocationId = "location_buendia_house";
const defaultPeriod: LocationPeriod = "founding";

const periodOptions: Array<{ value: LocationPeriod; label: string; shortLabel: string }> = [
  { value: "founding", label: "创世时期", shortLabel: "创世" },
  { value: "war", label: "战争时期", shortLabel: "战争" },
  { value: "banana", label: "香蕉公司时期", shortLabel: "香蕉" },
  { value: "rain", label: "暴雨时期", shortLabel: "暴雨" },
  { value: "ruin", label: "废墟时期", shortLabel: "废墟" }
];

const zoneLabels: Record<LocationZone, string> = {
  household: "宅邸内部",
  town: "镇区公共空间",
  industry: "公司与产业区",
  nature: "自然边界",
  threshold: "外部入口"
};

const zoneIcons: Record<LocationZone, typeof Home> = {
  household: Home,
  town: Landmark,
  industry: Factory,
  nature: Mountain,
  threshold: TrainFront
};

function normalizeMapQuery(
  query: MapQuery,
  validLocationIds: Set<string>,
  validPeriods: Set<LocationPeriod>,
  fallbackLocationId: string
) {
  return {
    locationId: validLocationIds.has(query.locationId) ? query.locationId : fallbackLocationId,
    period: validPeriods.has(query.period) ? query.period : defaultPeriod
  } satisfies MapQuery;
}

function readMapQuery(
  searchParams: SearchParamReader,
  validLocationIds: Set<string>,
  validPeriods: Set<LocationPeriod>,
  fallbackLocationId: string
) {
  return normalizeMapQuery(
    {
      locationId: searchParams.get("location") ?? fallbackLocationId,
      period: (searchParams.get("period") ?? defaultPeriod) as LocationPeriod
    },
    validLocationIds,
    validPeriods,
    fallbackLocationId
  );
}

function buildQueryString(query: MapQuery, fallbackLocationId: string) {
  const params = new URLSearchParams();

  if (query.locationId !== fallbackLocationId) {
    params.set("location", query.locationId);
  }
  if (query.period !== defaultPeriod) {
    params.set("period", query.period);
  }

  return params.toString();
}

function getNodeStyle(location: Location): LocationNodeStyle {
  return {
    "--x": `${location.map.x}%`,
    "--y": `${location.map.y}%`
  };
}

function getPeriodLabel(period: LocationPeriod) {
  return periodOptions.find((item) => item.value === period)?.label ?? "时期状态";
}

function getChapterMapHref(chapter: Chapter) {
  const params = new URLSearchParams({ chapter: chapter.slug });
  return `/one-hundred-years?${params.toString()}`;
}

function getTimelineHref(locationId: string, eventId?: string) {
  const params = new URLSearchParams({ location: locationId });
  if (eventId) {
    params.set("event", eventId);
  }
  return `/timeline?${params.toString()}`;
}

function LocationDetailContent({
  allChapters,
  allCharacters,
  allEvidenceCards,
  allEvents,
  allLocations,
  allMotifs,
  allReadingPaths,
  allResearchArticles,
  record,
  period,
  onClose
}: {
  allChapters: Chapter[];
  allCharacters: Character[];
  allEvidenceCards: EvidenceCard[];
  allEvents: Event[];
  allLocations: Location[];
  allMotifs: Motif[];
  allReadingPaths: ReadingPath[];
  allResearchArticles: ResearchArticle[];
  record: LocationRecord | null;
  period: LocationPeriod;
  onClose?: () => void;
}) {
  if (!record) {
    return (
      <div className="location-detail-empty">
        <SearchX size={24} />
        <strong>没有匹配的地点</strong>
        <span>调整地点或时期后，空间档案会重新显影。</span>
      </div>
    );
  }

  const { location, chapters, beats, events, characters, motifs, readingPaths } = record;
  const currentState = location.periodStates.find((state) => state.period === period) ?? location.periodStates[0];
  const firstChapter = chapters[0];
  const ZoneIcon = zoneIcons[location.zone];

  return (
    <>
      <div className="location-detail-heading">
        <div>
          <p className="eyebrow">Location File</p>
          <h3>{location.name}</h3>
          <span>
            <ZoneIcon size={14} />
            {zoneLabels[location.zone]}
          </span>
        </div>
        {onClose ? (
          <button aria-label="关闭地点详情" className="timeline-drawer-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="location-detail-stats" aria-label={`${location.name} 关联数据`}>
        <span>
          <strong>{events.length}</strong>
          事件
        </span>
        <span>
          <strong>{beats.length}</strong>
          情节
        </span>
        <span>
          <strong>{characters.length}</strong>
          人物
        </span>
        <span>
          <strong>{motifs.length}</strong>
          意象
        </span>
        <span>
          <strong>{chapters.length}</strong>
          章节
        </span>
      </div>

      <p className="location-detail-summary">{location.summary}</p>

      <div className="location-period-card">
        <span>
          <Clock3 size={15} />
          {getPeriodLabel(period)}
        </span>
        <strong>{currentState.status}</strong>
      </div>

      <div className="tag-row location-detail-tags" aria-label={`${location.name} 标签`}>
        {location.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="location-detail-actions">
        {firstChapter ? (
          <Link className="button compact-button" href={`/one-hundred-years?chapter=${firstChapter.slug}`}>
            <BookOpen size={16} />
            章节地图
          </Link>
        ) : null}
        <Link className="ghost-button compact-button" href={getTimelineHref(location.id)}>
          <Route size={16} />
          时间迷宫
        </Link>
      </div>

      <TimelineBeatList
        beats={beats}
        chapters={allChapters}
        characters={allCharacters}
        compact
        description="按故事顺序列出这个地点承载的具体场景。"
        evidenceCards={allEvidenceCards}
        events={allEvents}
        locations={allLocations}
        motifs={allMotifs}
        readingPaths={allReadingPaths}
        researchArticles={allResearchArticles}
      />

      <section className="location-detail-section">
        <h4>
          <Layers3 size={15} />
          在此发生
        </h4>
        <div className="location-event-list">
          {events.map((event) => (
            <Link href={getTimelineHref(location.id, event.id)} key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="location-detail-section">
        <h4>
          <UserRound size={15} />
          出场人物
        </h4>
        <div className="location-link-grid">
          {characters.map((character) => (
            <Link href={`/characters/${character.id}`} key={character.id}>
              <strong>{character.canonicalName}</strong>
              <span>{character.lonelinessType}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="location-detail-section">
        <h4>
          <Sparkles size={15} />
          关联意象
        </h4>
        <div className="location-chip-list">
          {motifs.map((motif) => (
            <Link href={`/motifs/${motif.id}`} key={motif.id}>
              {motif.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="location-detail-section">
        <h4>
          <BookOpen size={15} />
          章节入口
        </h4>
        <div className="location-link-grid">
          {chapters.map((chapter) => (
            <Link href={getChapterMapHref(chapter)} key={chapter.id}>
              <strong>第 {chapter.order} 章</strong>
              <span>{chapter.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {readingPaths.length > 0 ? (
        <section className="location-detail-section">
          <h4>
            <Route size={15} />
            相关路径
          </h4>
          <div className="location-link-grid">
            {readingPaths.map((path) => (
              <Link href={`/paths/${path.slug}`} key={path.id}>
                <strong>{path.title}</strong>
                <span>{path.summary}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function MacondoMapExplorer({
  chapters,
  characters,
  evidenceCards,
  events,
  locations,
  motifs,
  readingPaths,
  researchArticles,
  timelineBeats
}: {
  chapters: Chapter[];
  characters: Character[];
  evidenceCards: EvidenceCard[];
  events: Event[];
  locations: Location[];
  motifs: Motif[];
  readingPaths: ReadingPath[];
  researchArticles: ResearchArticle[];
  timelineBeats: TimelineBeat[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchText = searchParams.toString();
  const fallbackLocationId = locations.some((location) => location.id === defaultLocationId)
    ? defaultLocationId
    : locations[0]?.id ?? defaultLocationId;

  const chapterById = useMemo(() => new Map(chapters.map((chapter) => [chapter.id, chapter])), [chapters]);
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const motifById = useMemo(() => new Map(motifs.map((motif) => [motif.id, motif])), [motifs]);
  const validLocationIds = useMemo(() => new Set(locations.map((location) => location.id)), [locations]);
  const validPeriods = useMemo(() => new Set(periodOptions.map((period) => period.value)), []);

  const query = useMemo(
    () => readMapQuery(searchParams, validLocationIds, validPeriods, fallbackLocationId),
    [fallbackLocationId, searchParams, validLocationIds, validPeriods]
  );
  const canonicalQueryString = useMemo(
    () => buildQueryString(query, fallbackLocationId),
    [fallbackLocationId, query]
  );

  useEffect(() => {
    if (searchText !== canonicalQueryString) {
      router.replace(canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname, { scroll: false });
    }
  }, [canonicalQueryString, pathname, router, searchText]);

  const records = useMemo<LocationRecord[]>(
    () =>
      locations.map((location) => ({
        location,
        chapters: location.chapterIds
          .map((id) => chapterById.get(id))
          .filter((chapter): chapter is Chapter => Boolean(chapter))
          .sort((a, b) => a.order - b.order),
        beats: timelineBeats
          .filter((beat) => beat.locationIds.includes(location.id))
          .sort((a, b) => a.storyOrder - b.storyOrder),
        events: location.eventIds
          .map((id) => eventById.get(id))
          .filter((event): event is Event => Boolean(event))
          .sort((a, b) => a.storyOrder - b.storyOrder),
        characters: location.characterIds
          .map((id) => characterById.get(id))
          .filter((character): character is Character => Boolean(character)),
        motifs: location.motifIds
          .map((id) => motifById.get(id))
          .filter((motif): motif is Motif => Boolean(motif)),
        readingPaths: readingPaths.filter((path) =>
          path.steps.some((step) => step.locationIds.includes(location.id))
        )
      })),
    [chapterById, characterById, eventById, locations, motifById, readingPaths, timelineBeats]
  );

  const recordById = useMemo(
    () => new Map(records.map((record) => [record.location.id, record])),
    [records]
  );
  const selectedRecord = recordById.get(query.locationId) ?? records[0] ?? null;
  const selectedLocation = selectedRecord?.location ?? null;
  const selectedPeriodLabel = getPeriodLabel(query.period);
  const isDrawerOpen = searchParams.has("location");
  const zoneCounts = useMemo(() => {
    const counts = new Map<LocationZone, number>();
    locations.forEach((location) => {
      counts.set(location.zone, (counts.get(location.zone) ?? 0) + 1);
    });
    return counts;
  }, [locations]);

  function replaceQuery(nextQuery: MapQuery) {
    const normalizedQuery = normalizeMapQuery(nextQuery, validLocationIds, validPeriods, fallbackLocationId);
    const nextQueryString = buildQueryString(normalizedQuery, fallbackLocationId);
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  function selectLocation(locationId: string) {
    replaceQuery({ ...query, locationId });
  }

  function selectPeriod(period: LocationPeriod) {
    replaceQuery({ ...query, period });
  }

  function resetMap() {
    replaceQuery({ locationId: fallbackLocationId, period: defaultPeriod });
  }

  function closeDrawer() {
    replaceQuery({ ...query, locationId: fallbackLocationId });
  }

  return (
    <section className="section macondo-map" aria-labelledby="macondo-map-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Macondo Spatial System</p>
          <h2 id="macondo-map-title">空间叙事系统</h2>
        </div>
        <p>以布恩迪亚宅邸为中心，把公共空间、自然边界和外部入口组织成可点击的地点档案。</p>
      </div>

      <div className="macondo-map-stat-strip" aria-label="马孔多地图数据概览">
        <span>
          <strong>{locations.length}</strong>
          地点
        </span>
        <span>
          <strong>{selectedRecord?.events.length ?? 0}</strong>
          当前事件
        </span>
        <span>
          <strong>{selectedPeriodLabel}</strong>
          当前时期
        </span>
        <span>
          <strong>{selectedLocation ? zoneLabels[selectedLocation.zone] : "-"}</strong>
          空间层级
        </span>
      </div>

      <div className="macondo-map-toolbar">
        <div className="segmented-control macondo-period-control" aria-label="地点时期状态">
          {periodOptions.map((period) => (
            <button
              aria-pressed={query.period === period.value}
              key={period.value}
              onClick={() => selectPeriod(period.value)}
              type="button"
            >
              <Clock3 size={16} />
              {period.shortLabel}
            </button>
          ))}
        </div>

        <div className="macondo-zone-strip" aria-label="空间层级统计">
          {Object.entries(zoneLabels).map(([zone, label]) => (
            <span key={zone}>
              {label} · {zoneCounts.get(zone as LocationZone) ?? 0}
            </span>
          ))}
        </div>

        <button className="ghost-button compact-button macondo-map-reset" onClick={resetMap} type="button">
          <RotateCcw size={16} />
          重置
        </button>
      </div>

      <div className="macondo-map-workbench">
        <div className="macondo-map-surface">
          <div className="surface-title">
            <MapPinned size={19} />
            <span>档案地图</span>
            <small>{selectedLocation?.name ?? "地点"} · {selectedPeriodLabel}</small>
          </div>

          <div className="macondo-map-stage" aria-label="马孔多空间地图">
            <div className="macondo-map-grid" aria-hidden="true" />
            <div className="macondo-map-river" aria-hidden="true" />
            <div className="macondo-map-rail" aria-hidden="true" />
            <svg className="macondo-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {locations
                .filter((location) => location.id !== fallbackLocationId)
                .map((location) => (
                  <line
                    className={location.id === selectedLocation?.id ? "is-selected" : ""}
                    key={location.id}
                    x1="50"
                    x2={location.map.x}
                    y1="50"
                    y2={location.map.y}
                  />
                ))}
            </svg>

            {locations.map((location) => {
              const isSelected = selectedLocation?.id === location.id;
              const ZoneIcon = zoneIcons[location.zone];

              return (
                <button
                  aria-pressed={isSelected}
                  className={`macondo-location-node is-${location.map.ring} zone-${location.zone}`}
                  key={location.id}
                  onClick={() => selectLocation(location.id)}
                  style={getNodeStyle(location)}
                  type="button"
                >
                  <span className="location-node-mark">
                    <ZoneIcon size={location.map.ring === "center" ? 22 : 17} />
                  </span>
                  <span className="location-node-label">{location.name}</span>
                  <span className="location-node-count">{location.eventIds.length} 事</span>
                </button>
              );
            })}

            <div className="macondo-map-compass" aria-hidden="true">
              <span>N</span>
              <Building2 size={17} />
            </div>
          </div>
        </div>

        <aside className="location-detail-panel" aria-label="地点详情">
          <LocationDetailContent
            allChapters={chapters}
            allCharacters={characters}
            allEvidenceCards={evidenceCards}
            allEvents={events}
            allLocations={locations}
            allMotifs={motifs}
            allReadingPaths={readingPaths}
            allResearchArticles={researchArticles}
            period={query.period}
            record={selectedRecord}
          />
        </aside>
      </div>

      <div className={`location-drawer-backdrop ${isDrawerOpen ? "is-open" : ""}`} onClick={closeDrawer} />
      <aside
        aria-hidden={!isDrawerOpen}
        aria-label="地点详情抽屉"
        className={`location-mobile-drawer ${isDrawerOpen ? "is-open" : ""}`}
      >
          <LocationDetailContent
            allChapters={chapters}
            allCharacters={characters}
            allEvidenceCards={evidenceCards}
            allEvents={events}
            allLocations={locations}
            allMotifs={motifs}
            allReadingPaths={readingPaths}
            allResearchArticles={researchArticles}
            onClose={closeDrawer}
            period={query.period}
            record={selectedRecord}
        />
      </aside>
    </section>
  );
}
