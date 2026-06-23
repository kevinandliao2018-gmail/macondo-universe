"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  Compass,
  HelpCircle,
  Layers3,
  Lightbulb,
  ListFilter,
  MapPinned,
  RotateCcw,
  SearchX,
  ScrollText,
  Sparkles,
  UserRound,
  Waypoints,
  X
} from "lucide-react";
import { useEffect, useMemo, type CSSProperties } from "react";
import type { Chapter, Character, Event, Location, Motif } from "@/lib/domain/schemas";

type AtlasQuery = {
  chapterSlug: string | null;
  eventId: string | null;
  characterId: string | null;
  motifId: string | null;
  locationId: string | null;
  theme: string | null;
};

type ChapterRecord = {
  chapter: Chapter;
  characters: Character[];
  events: Event[];
  locations: Location[];
  motifs: Motif[];
};

type ChapterFocusPoint = Chapter["readingGuide"]["focusPoints"][number];

type EntityLookups = {
  characterById: Map<string, Character>;
  eventById: Map<string, Event>;
  locationById: Map<string, Location>;
  motifById: Map<string, Motif>;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

type DensityStyle = CSSProperties & {
  "--density": string;
};

function normalizeAtlasQuery(
  query: AtlasQuery,
  validChapterSlugs: Set<string>,
  validEventIds: Set<string>,
  validCharacterIds: Set<string>,
  validMotifIds: Set<string>,
  validLocationIds: Set<string>,
  validThemes: Set<string>
) {
  return {
    chapterSlug: query.chapterSlug && validChapterSlugs.has(query.chapterSlug) ? query.chapterSlug : null,
    eventId: query.eventId && validEventIds.has(query.eventId) ? query.eventId : null,
    characterId: query.characterId && validCharacterIds.has(query.characterId) ? query.characterId : null,
    motifId: query.motifId && validMotifIds.has(query.motifId) ? query.motifId : null,
    locationId: query.locationId && validLocationIds.has(query.locationId) ? query.locationId : null,
    theme: query.theme && validThemes.has(query.theme) ? query.theme : null
  } satisfies AtlasQuery;
}

function readAtlasQuery(
  searchParams: SearchParamReader,
  validChapterSlugs: Set<string>,
  validEventIds: Set<string>,
  validCharacterIds: Set<string>,
  validMotifIds: Set<string>,
  validLocationIds: Set<string>,
  validThemes: Set<string>
) {
  return normalizeAtlasQuery(
    {
      chapterSlug: searchParams.get("chapter"),
      eventId: searchParams.get("event"),
      characterId: searchParams.get("character"),
      motifId: searchParams.get("motif"),
      locationId: searchParams.get("location"),
      theme: searchParams.get("theme")
    },
    validChapterSlugs,
    validEventIds,
    validCharacterIds,
    validMotifIds,
    validLocationIds,
    validThemes
  );
}

function buildQueryString(query: AtlasQuery) {
  const params = new URLSearchParams();

  if (query.chapterSlug) {
    params.set("chapter", query.chapterSlug);
  }
  if (query.eventId) {
    params.set("event", query.eventId);
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
  if (query.theme) {
    params.set("theme", query.theme);
  }

  return params.toString();
}

function buildIdCountMap(chapters: Chapter[], key: "characterIds" | "motifIds") {
  const counts = new Map<string, number>();
  chapters.forEach((chapter) => {
    chapter[key].forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  });
  return counts;
}

function buildThemeCountMap(chapters: Chapter[]) {
  const counts = new Map<string, number>();
  chapters.forEach((chapter) => {
    chapter.themeTags.forEach((theme) => counts.set(theme, (counts.get(theme) ?? 0) + 1));
  });
  return counts;
}

function buildLocationCountMap(records: ChapterRecord[]) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    record.locations.forEach((location) => counts.set(location.id, (counts.get(location.id) ?? 0) + 1));
  });
  return counts;
}

function getDensityStyle(value: number, maxValue: number): DensityStyle {
  const density = maxValue > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 8;
  return { "--density": `${density}%` } as DensityStyle;
}

function getChapterThemeHref(theme: string, chapterSlug: string) {
  const params = new URLSearchParams({ theme, chapter: chapterSlug });
  return `/one-hundred-years?${params.toString()}`;
}

function getChapterLocationHref(locationId: string, chapterSlug: string) {
  const params = new URLSearchParams({ location: locationId, chapter: chapterSlug });
  return `/one-hundred-years?${params.toString()}`;
}

function FocusPointLinks({ focusPoint, lookups }: { focusPoint: ChapterFocusPoint; lookups: EntityLookups }) {
  const events = focusPoint.eventIds
    .map((id) => lookups.eventById.get(id))
    .filter((event): event is Event => Boolean(event));
  const characters = focusPoint.characterIds
    .map((id) => lookups.characterById.get(id))
    .filter((character): character is Character => Boolean(character));
  const motifs = focusPoint.motifIds
    .map((id) => lookups.motifById.get(id))
    .filter((motif): motif is Motif => Boolean(motif));
  const locations = focusPoint.locationIds
    .map((id) => lookups.locationById.get(id))
    .filter((location): location is Location => Boolean(location));

  const links = [
    ...events.map((event) => ({ href: `/timeline?event=${event.id}`, label: event.title })),
    ...characters.map((character) => ({ href: `/characters/${character.id}`, label: character.canonicalName })),
    ...motifs.map((motif) => ({ href: `/motifs/${motif.id}`, label: motif.name })),
    ...locations.map((location) => ({ href: `/map?location=${location.id}`, label: location.name }))
  ];

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="chapter-guide-focus-links" aria-label={`${focusPoint.title}关联线索`}>
      {links.slice(0, 6).map((link) => (
        <Link href={link.href} key={`${link.href}-${link.label}`}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function ChapterGuideContent({
  record,
  highlightedEventId,
  idPrefix,
  lookups,
  onClose
}: {
  record: ChapterRecord | null;
  highlightedEventId: string | null;
  idPrefix: string;
  lookups: EntityLookups;
  onClose?: () => void;
}) {
  if (!record) {
    return (
      <div className="chapter-guide-empty">
        <SearchX size={24} />
        <strong>没有匹配的章节</strong>
        <span>调整人物、意象或主题筛选后，阅读导航会重新出现。</span>
      </div>
    );
  }

  const { chapter, characters, events, locations, motifs } = record;
  const { readingGuide } = chapter;
  const highlightedEventBelongsToChapter = highlightedEventId
    ? events.some((event) => event.id === highlightedEventId)
    : false;
  const chapterHref = highlightedEventBelongsToChapter
    ? `/one-hundred-years/chapters/${chapter.slug}#${highlightedEventId}`
    : `/one-hundred-years/chapters/${chapter.slug}`;

  return (
    <>
      <div className="chapter-guide-heading">
        <div>
          <p className="eyebrow">Reading Guide</p>
          <h3>第 {chapter.order} 章</h3>
          <span>{chapter.title}</span>
        </div>
        {onClose ? (
          <button aria-label="关闭章节导航" className="timeline-drawer-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="chapter-guide-stats" aria-label="本章数据概览">
        <span>
          <strong>{characters.length}</strong>
          人物
        </span>
        <span>
          <strong>{events.length}</strong>
          事件
        </span>
        <span>
          <strong>{motifs.length}</strong>
          意象
        </span>
        <span>
          <strong>{locations.length}</strong>
          地点
        </span>
      </div>

      <p className="chapter-guide-summary">{chapter.summary}</p>

      <section className="chapter-guide-insight" aria-label="本章核心导读">
        <div>
          <Compass size={16} />
          <span>核心导读</span>
        </div>
        <p>{readingGuide.thesis}</p>
        <small>{readingGuide.entryPoint}</small>
      </section>

      <div className="chapter-guide-actions">
        <Link className="button compact-button" href={`/timeline?from=${chapter.order}&to=${chapter.order}`}>
          <Waypoints size={16} />
          时间坐标
        </Link>
        <Link className="ghost-button compact-button" href={chapterHref}>
          <BookOpen size={16} />
          完整章节页
        </Link>
      </div>

      <section className="chapter-guide-section">
        <h4>
          <Lightbulb size={15} />
          解读焦点
        </h4>
        <div className="chapter-guide-focus-list">
          {readingGuide.focusPoints.map((focusPoint) => (
            <article className="chapter-guide-focus-card" key={focusPoint.title}>
              <strong>{focusPoint.title}</strong>
              <p>{focusPoint.summary}</p>
              <FocusPointLinks focusPoint={focusPoint} lookups={lookups} />
            </article>
          ))}
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <ScrollText size={15} />
          专题切片
        </h4>
        <div className="chapter-guide-spotlight">
          <strong>{readingGuide.spotlight.title}</strong>
          <p>{readingGuide.spotlight.summary}</p>
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <HelpCircle size={15} />
          带着问题读
        </h4>
        <ol className="chapter-guide-question-list">
          {readingGuide.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <MapPinned size={15} />
          地点线索
        </h4>
        <div className="chapter-guide-chip-list">
          {locations.map((location) => (
            <Link href={getChapterLocationHref(location.id, chapter.slug)} key={location.id}>
              {location.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <CalendarRange size={15} />
          本章关键事件
        </h4>
        <div className="chapter-guide-events">
          {events.map((event) => {
            const isHighlighted = event.id === highlightedEventId;
            return (
              <article
                className={`chapter-guide-event ${isHighlighted ? "is-highlighted" : ""}`}
                id={`${idPrefix}-${event.id}`}
                key={event.id}
              >
                <div className="chapter-guide-event-title">
                  <strong>{event.title}</strong>
                  <span>故事 {event.storyOrder} / 叙事 {event.narrativeOrder}</span>
                </div>
                <p>{event.summary}</p>
                {event.tags.length > 0 ? (
                  <div className="tag-row">
                    {event.tags.slice(0, 4).map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link href={`/timeline?from=${chapter.order}&to=${chapter.order}&event=${event.id}`}>
                  查看时间线位置
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <UserRound size={15} />
          抓住这些人物
        </h4>
        <div className="chapter-guide-link-grid">
          {characters.map((character) => (
            <Link href={`/characters/${character.id}`} key={character.id}>
              <strong>{character.canonicalName}</strong>
              <span>{character.lonelinessType}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <Sparkles size={15} />
          追踪这些意象
        </h4>
        <div className="chapter-guide-chip-list">
          {motifs.map((motif) => (
            <Link href={`/motifs/${motif.id}`} key={motif.id}>
              {motif.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="chapter-guide-section">
        <h4>
          <Layers3 size={15} />
          主题标签
        </h4>
        <div className="chapter-guide-chip-list">
          {chapter.themeTags.map((theme) => (
            <Link href={getChapterThemeHref(theme, chapter.slug)} key={theme}>
              {theme}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function ChapterAtlasExplorer({
  chapters,
  characters,
  events,
  locations,
  motifs
}: {
  chapters: Chapter[];
  characters: Character[];
  events: Event[];
  locations: Location[];
  motifs: Motif[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchText = searchParams.toString();

  const themes = useMemo(
    () => [...new Set(chapters.flatMap((chapter) => chapter.themeTags))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [chapters]
  );
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const motifById = useMemo(() => new Map(motifs.map((motif) => [motif.id, motif])), [motifs]);
  const lookups = useMemo(
    () => ({ characterById, eventById, locationById, motifById }),
    [characterById, eventById, locationById, motifById]
  );

  const validChapterSlugs = useMemo(() => new Set(chapters.map((chapter) => chapter.slug)), [chapters]);
  const validEventIds = useMemo(() => new Set(events.map((event) => event.id)), [events]);
  const validCharacterIds = useMemo(() => new Set(characters.map((character) => character.id)), [characters]);
  const validMotifIds = useMemo(() => new Set(motifs.map((motif) => motif.id)), [motifs]);
  const validLocationIds = useMemo(() => new Set(locations.map((location) => location.id)), [locations]);
  const validThemes = useMemo(() => new Set(themes), [themes]);

  const query = useMemo(
    () =>
      readAtlasQuery(
        searchParams,
        validChapterSlugs,
        validEventIds,
        validCharacterIds,
        validMotifIds,
        validLocationIds,
        validThemes
      ),
    [
      searchParams,
      validChapterSlugs,
      validCharacterIds,
      validEventIds,
      validLocationIds,
      validMotifIds,
      validThemes
    ]
  );

  const canonicalQueryString = useMemo(() => buildQueryString(query), [query]);

  useEffect(() => {
    if (searchText !== canonicalQueryString) {
      router.replace(canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname, { scroll: false });
    }
  }, [canonicalQueryString, pathname, router, searchText]);

  const records = useMemo<ChapterRecord[]>(
    () =>
      chapters.map((chapter) => {
        const chapterEvents = chapter.eventIds
          .map((id) => eventById.get(id))
          .filter((event): event is Event => Boolean(event));
        const chapterLocationIds = new Set([
          ...chapterEvents.flatMap((event) => event.locationIds),
          ...locations
            .filter((location) => location.chapterIds.includes(chapter.id))
            .map((location) => location.id)
        ]);

        return {
          chapter,
          characters: chapter.characterIds
            .map((id) => characterById.get(id))
            .filter((character): character is Character => Boolean(character)),
          events: chapterEvents,
          locations: locations.filter((location) => chapterLocationIds.has(location.id)),
          motifs: chapter.motifIds
            .map((id) => motifById.get(id))
            .filter((motif): motif is Motif => Boolean(motif))
        };
      }),
    [chapters, characterById, eventById, locations, motifById]
  );

  const visibleRecords = useMemo(
    () =>
      records.filter(({ chapter, locations: chapterLocations }) => {
        const matchesCharacter = !query.characterId || chapter.characterIds.includes(query.characterId);
        const matchesMotif = !query.motifId || chapter.motifIds.includes(query.motifId);
        const matchesLocation = !query.locationId ||
          chapterLocations.some((location) => location.id === query.locationId);
        const matchesTheme = !query.theme || chapter.themeTags.includes(query.theme);
        return matchesCharacter && matchesMotif && matchesTheme && matchesLocation;
      }),
    [query, records]
  );

  const eventRecord = query.eventId
    ? records.find((record) => record.events.some((event) => event.id === query.eventId)) ?? null
    : null;
  const requestedChapterSlug = query.chapterSlug ?? eventRecord?.chapter.slug ?? null;
  const selectedRecord = requestedChapterSlug
    ? visibleRecords.find((record) => record.chapter.slug === requestedChapterSlug) ?? null
    : visibleRecords[0] ?? null;
  const hasExplicitSelection = Boolean(query.chapterSlug || query.eventId);
  const selectedCharacter = query.characterId ? characterById.get(query.characterId) : null;
  const selectedMotif = query.motifId ? motifById.get(query.motifId) : null;
  const selectedLocation = query.locationId ? locationById.get(query.locationId) : null;
  const selectedEvent = query.eventId ? eventById.get(query.eventId) : null;
  const activeFilterCount = Number(Boolean(query.characterId)) +
    Number(Boolean(query.motifId)) +
    Number(Boolean(query.locationId)) +
    Number(Boolean(query.theme));

  const characterChapterCounts = useMemo(() => buildIdCountMap(chapters, "characterIds"), [chapters]);
  const motifChapterCounts = useMemo(() => buildIdCountMap(chapters, "motifIds"), [chapters]);
  const locationChapterCounts = useMemo(() => buildLocationCountMap(records), [records]);
  const themeChapterCounts = useMemo(() => buildThemeCountMap(chapters), [chapters]);
  const maxCharacterCount = useMemo(
    () => Math.max(1, ...records.map((record) => record.characters.length)),
    [records]
  );

  useEffect(() => {
    if (!requestedChapterSlug) {
      return;
    }
    document.getElementById(`chapter-node-${requestedChapterSlug}`)?.scrollIntoView({
      block: "nearest",
      inline: "center"
    });
  }, [requestedChapterSlug, visibleRecords.length]);

  function replaceQuery(nextQuery: AtlasQuery) {
    const normalizedQuery = normalizeAtlasQuery(
      nextQuery,
      validChapterSlugs,
      validEventIds,
      validCharacterIds,
      validMotifIds,
      validLocationIds,
      validThemes
    );
    const nextQueryString = buildQueryString(normalizedQuery);
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  function resetFilters() {
    replaceQuery({
      chapterSlug: null,
      eventId: null,
      characterId: null,
      motifId: null,
      locationId: null,
      theme: null
    });
  }

  function selectChapter(chapterSlug: string) {
    replaceQuery({ ...query, chapterSlug, eventId: null });
  }

  function closeDrawer() {
    replaceQuery({ ...query, chapterSlug: null, eventId: null });
  }

  return (
    <section className="section chapter-atlas" aria-labelledby="chapter-atlas-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chapter Atlas</p>
          <h2 id="chapter-atlas-title">章节阅读地图</h2>
        </div>
        <p>沿二十章的轨道筛选人物、意象与主题，再展开每章的阅读导航。</p>
      </div>

      <div className="chapter-atlas-stat-strip" aria-label="章节地图数据概览">
        <span>
          <strong>{visibleRecords.length}</strong>
          当前章节
        </span>
        <span>
          <strong>{chapters.length}</strong>
          章节总数
        </span>
        <span>
          <strong>{selectedRecord ? selectedRecord.chapter.order : "-"}</strong>
          当前坐标
        </span>
        <span>
          <strong>{activeFilterCount}</strong>
          筛选条件
        </span>
      </div>

      <div className="chapter-atlas-toolbar">
        <div className="chapter-atlas-filter-grid" aria-label="章节筛选">
          <label className="chapter-atlas-field">
            <span>
              <UserRound size={14} />
              人物
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({
                  ...query,
                  characterId: event.target.value || null,
                  chapterSlug: null,
                  eventId: null
                })
              }
              value={query.characterId ?? ""}
            >
              <option value="">全部人物</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.canonicalName} · {characterChapterCounts.get(character.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="chapter-atlas-field">
            <span>
              <Sparkles size={14} />
              意象
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({ ...query, motifId: event.target.value || null, chapterSlug: null, eventId: null })
              }
              value={query.motifId ?? ""}
            >
              <option value="">全部意象</option>
              {motifs.map((motif) => (
                <option key={motif.id} value={motif.id}>
                  {motif.name} · {motifChapterCounts.get(motif.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="chapter-atlas-field">
            <span>
              <MapPinned size={14} />
              地点
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({ ...query, locationId: event.target.value || null, chapterSlug: null, eventId: null })
              }
              value={query.locationId ?? ""}
            >
              <option value="">全部地点</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {locationChapterCounts.get(location.id) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <label className="chapter-atlas-field">
            <span>
              <Layers3 size={14} />
              主题
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({ ...query, theme: event.target.value || null, chapterSlug: null, eventId: null })
              }
              value={query.theme ?? ""}
            >
              <option value="">全部主题</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme} · {themeChapterCounts.get(theme) ?? 0}
                </option>
              ))}
            </select>
          </label>

          <button className="ghost-button chapter-atlas-reset-button" onClick={resetFilters} type="button">
            <RotateCcw size={16} />
            重置
          </button>
        </div>

        <div className="chapter-atlas-active-filters" aria-label="当前章节筛选">
          <span>
            <ListFilter size={14} />
            {visibleRecords.length} 章
          </span>
          {selectedCharacter ? <span>{selectedCharacter.canonicalName}</span> : null}
          {selectedMotif ? <span>{selectedMotif.name}</span> : null}
          {selectedLocation ? <span>{selectedLocation.name}</span> : null}
          {query.theme ? <span>{query.theme}</span> : null}
          {selectedEvent ? <span>高亮：{selectedEvent.title}</span> : null}
        </div>
      </div>

      <div className="chapter-atlas-workbench">
        <div className="chapter-atlas-surface">
          <div className="surface-title">
            <MapPinned size={19} />
            <span>二十章阅读轨道</span>
            <small>{visibleRecords.length} 个坐标</small>
          </div>

          {visibleRecords.length > 0 ? (
            <div className="chapter-atlas-track" aria-label="章节阅读轨道">
              {visibleRecords.map(({
                chapter,
                characters: chapterCharacters,
                events: chapterEvents,
                locations: chapterLocations,
                motifs: chapterMotifs
              }) => {
                const isSelected = selectedRecord?.chapter.id === chapter.id;

                return (
                  <button
                    aria-pressed={isSelected}
                    className="chapter-atlas-node"
                    id={`chapter-node-${chapter.slug}`}
                    key={chapter.id}
                    onClick={() => selectChapter(chapter.slug)}
                    type="button"
                  >
                    <span className="chapter-node-index">第 {chapter.order} 章</span>
                    <strong>{chapter.title}</strong>
                    <span className="chapter-node-summary">{chapter.summary}</span>
                    <span className="chapter-node-thesis">{chapter.readingGuide.thesis}</span>
                    <span
                      aria-label={`人物密度 ${chapterCharacters.length}/${maxCharacterCount}`}
                      className="chapter-density-bar"
                      style={getDensityStyle(chapterCharacters.length, maxCharacterCount)}
                    />
                    <span className="chapter-node-metrics">
                      <span>
                        <UserRound size={13} />
                        {chapterCharacters.length}
                      </span>
                      <span>
                        <CalendarRange size={13} />
                        {chapterEvents.length}
                      </span>
                      <span>
                        <Sparkles size={13} />
                        {chapterMotifs.length}
                      </span>
                      <span>
                        <MapPinned size={13} />
                        {chapterLocations.length}
                      </span>
                    </span>
                    <span className="chapter-node-locations">
                      {chapterLocations.slice(0, 3).map((location) => (
                        <span key={location.id}>{location.name}</span>
                      ))}
                      {chapterLocations.length > 3 ? <span>+{chapterLocations.length - 3}</span> : null}
                    </span>
                    <span className="chapter-node-tags">
                      {chapter.themeTags.slice(0, 3).map((theme) => (
                        <span key={theme}>{theme}</span>
                      ))}
                      {chapter.themeTags.length > 3 ? <span>+{chapter.themeTags.length - 3}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="chapter-atlas-empty panel">
              <SearchX size={24} />
              <strong>没有章节落在这些条件里</strong>
              <p>换一个人物、意象或主题，章节轨道会重新显影。</p>
              <button className="button compact-button" onClick={resetFilters} type="button">
                <RotateCcw size={16} />
                重置筛选
              </button>
            </div>
          )}
        </div>

        <aside className="chapter-guide-panel" aria-label="本章阅读导航">
          <ChapterGuideContent
            highlightedEventId={query.eventId}
            idPrefix="atlas-panel"
            lookups={lookups}
            record={selectedRecord}
          />
        </aside>
      </div>

      <div
        className={`chapter-drawer-backdrop ${hasExplicitSelection && selectedRecord ? "is-open" : ""}`}
        onClick={closeDrawer}
      />
      <aside
        aria-hidden={!(hasExplicitSelection && selectedRecord)}
        aria-label="本章阅读导航抽屉"
        className={`chapter-mobile-drawer ${hasExplicitSelection && selectedRecord ? "is-open" : ""}`}
      >
        <ChapterGuideContent
          highlightedEventId={query.eventId}
          idPrefix="atlas-drawer"
          lookups={lookups}
          onClose={closeDrawer}
          record={selectedRecord}
        />
      </aside>
    </section>
  );
}
