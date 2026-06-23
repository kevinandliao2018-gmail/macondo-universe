"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  Leaf,
  Layers3,
  ListFilter,
  MapPin,
  Network,
  RotateCcw,
  Route,
  SearchX,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, type KeyboardEvent } from "react";
import type { Chapter, Character, Event, Location, Motif } from "@/lib/domain/schemas";

type MotifQuery = {
  motifId: string | null;
  characterId: string | null;
  chapterSlug: string | null;
  theme: string | null;
  motifGroup: Motif["motifGroup"] | null;
};

type RawMotifQuery = Omit<MotifQuery, "motifGroup"> & {
  motifGroup: string | null;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

type MotifConstellationRecord = {
  motif: Motif;
  chapters: Chapter[];
  characters: Character[];
  events: Event[];
  locations: Location[];
  score: number;
};

type MotifConstellationNode = MotifConstellationRecord & {
  x: number;
  y: number;
  radius: number;
};

type MotifConstellationEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  chapters: number;
  events: number;
  characters: number;
};

type MotifConstellationModel = {
  records: MotifConstellationRecord[];
  edges: MotifConstellationEdge[];
};

type MotifConnection = {
  edge: MotifConstellationEdge;
  record: MotifConstellationRecord;
};

const canvasWidth = 920;
const canvasHeight = 620;
const minEdgeWeight = 6;

const motifGroupOrder = [
  "climate_sky",
  "water_earth",
  "animal",
  "plant",
  "spatial_ruin",
  "object_text",
  "fate_history"
] as const satisfies readonly Motif["motifGroup"][];

const motifGroupLabels: Record<Motif["motifGroup"], string> = {
  climate_sky: "气候天象",
  water_earth: "水土边界",
  animal: "动物吞噬",
  plant: "植物反攻",
  spatial_ruin: "空间废墟",
  object_text: "器物文本",
  fate_history: "命运历史"
};

function normalizeMotifQuery(
  query: RawMotifQuery,
  validMotifIds: Set<string>,
  validCharacterIds: Set<string>,
  validChapterSlugs: Set<string>,
  validThemes: Set<string>,
  validMotifGroups: Set<Motif["motifGroup"]>
) {
  return {
    motifId: query.motifId && validMotifIds.has(query.motifId) ? query.motifId : null,
    characterId: query.characterId && validCharacterIds.has(query.characterId) ? query.characterId : null,
    chapterSlug: query.chapterSlug && validChapterSlugs.has(query.chapterSlug) ? query.chapterSlug : null,
    theme: query.theme && validThemes.has(query.theme) ? query.theme : null,
    motifGroup:
      query.motifGroup && validMotifGroups.has(query.motifGroup as Motif["motifGroup"])
        ? (query.motifGroup as Motif["motifGroup"])
        : null
  } satisfies MotifQuery;
}

function readMotifQuery(
  searchParams: SearchParamReader,
  validMotifIds: Set<string>,
  validCharacterIds: Set<string>,
  validChapterSlugs: Set<string>,
  validThemes: Set<string>,
  validMotifGroups: Set<Motif["motifGroup"]>
) {
  return normalizeMotifQuery(
    {
      motifId: searchParams.get("motif"),
      characterId: searchParams.get("character"),
      chapterSlug: searchParams.get("chapter"),
      theme: searchParams.get("theme"),
      motifGroup: searchParams.get("system")
    },
    validMotifIds,
    validCharacterIds,
    validChapterSlugs,
    validThemes,
    validMotifGroups
  );
}

function buildQueryString(query: MotifQuery) {
  const params = new URLSearchParams();

  if (query.motifId) {
    params.set("motif", query.motifId);
  }
  if (query.characterId) {
    params.set("character", query.characterId);
  }
  if (query.chapterSlug) {
    params.set("chapter", query.chapterSlug);
  }
  if (query.theme) {
    params.set("theme", query.theme);
  }
  if (query.motifGroup) {
    params.set("system", query.motifGroup);
  }

  return params.toString();
}

function getMotifScore(motif: Motif) {
  return motif.chapterIds.length + motif.eventIds.length + motif.characterIds.length;
}

function sortByDensity(a: MotifConstellationRecord, b: MotifConstellationRecord) {
  const scoreDelta = b.score - a.score;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  return a.motif.name.localeCompare(b.motif.name, "zh-CN");
}

function getPairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join("|");
}

function addCoOccurrence(
  ids: string[],
  source: "chapters" | "events" | "characters",
  validMotifIds: Set<string>,
  pairCounts: Map<string, { chapters: number; events: number; characters: number }>
) {
  const motifIds = [...new Set(ids)].filter((id) => validMotifIds.has(id));

  for (let firstIndex = 0; firstIndex < motifIds.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < motifIds.length; secondIndex += 1) {
      const key = getPairKey(motifIds[firstIndex], motifIds[secondIndex]);
      const counts = pairCounts.get(key) ?? { chapters: 0, events: 0, characters: 0 };
      counts[source] += 1;
      pairCounts.set(key, counts);
    }
  }
}

function buildMotifConstellationModel({
  motifs,
  chapters,
  characters,
  events,
  locations
}: {
  motifs: Motif[];
  chapters: Chapter[];
  characters: Character[];
  events: Event[];
  locations: Location[];
}): MotifConstellationModel {
  const motifById = new Map(motifs.map((motif) => [motif.id, motif]));
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const validMotifIds = new Set(motifs.map((motif) => motif.id));
  const pairCounts = new Map<string, { chapters: number; events: number; characters: number }>();

  chapters.forEach((chapter) => addCoOccurrence(chapter.motifIds, "chapters", validMotifIds, pairCounts));
  events.forEach((event) => addCoOccurrence(event.motifIds, "events", validMotifIds, pairCounts));
  characters.forEach((character) =>
    addCoOccurrence(character.relatedMotifIds, "characters", validMotifIds, pairCounts)
  );

  const records = motifs
    .map((motif) => ({
      motif,
      chapters: motif.chapterIds
        .map((id) => chapterById.get(id))
        .filter((chapter): chapter is Chapter => Boolean(chapter))
        .sort((a, b) => a.order - b.order),
      characters: motif.characterIds
        .map((id) => characterById.get(id))
        .filter((character): character is Character => Boolean(character)),
      events: motif.eventIds
        .map((id) => eventById.get(id))
        .filter((event): event is Event => Boolean(event))
        .sort((a, b) => a.storyOrder - b.storyOrder),
      locations: [
        ...new Set(
          motif.eventIds.flatMap((eventId) => eventById.get(eventId)?.locationIds ?? [])
        )
      ]
        .map((id) => locationById.get(id))
        .filter((location): location is Location => Boolean(location)),
      score: getMotifScore(motif)
    }))
    .sort(sortByDensity);

  const edges = [...pairCounts.entries()]
    .map(([key, counts]) => {
      const [sourceId, targetId] = key.split("|");
      const weight = counts.chapters * 3 + counts.events * 2 + counts.characters;
      return {
        id: `motif-edge-${sourceId}-${targetId}`,
        sourceId,
        targetId,
        weight,
        chapters: counts.chapters,
        events: counts.events,
        characters: counts.characters
      } satisfies MotifConstellationEdge;
    })
    .filter((edge) => edge.weight >= minEdgeWeight && motifById.has(edge.sourceId) && motifById.has(edge.targetId))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  return { records, edges };
}

function buildConstellationNodes(records: MotifConstellationRecord[]) {
  const sortedRecords = [...records].sort(sortByDensity);
  const scores = sortedRecords.map((record) => record.score);
  const minScore = Math.min(...scores, 1);
  const maxScore = Math.max(...scores, 1);
  const innerCount = Math.min(6, Math.max(0, sortedRecords.length - 1));
  const outerCount = Math.max(0, sortedRecords.length - 1 - innerCount);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return sortedRecords.map((record, index) => {
    const radiusScale = maxScore === minScore ? 0.65 : (record.score - minScore) / (maxScore - minScore);
    const nodeRadius = 26 + radiusScale * 22;

    if (index === 0) {
      return {
        ...record,
        x: centerX,
        y: centerY,
        radius: nodeRadius + 8
      } satisfies MotifConstellationNode;
    }

    const isInner = index <= innerCount;
    const ringIndex = isInner ? index - 1 : index - 1 - innerCount;
    const ringCount = isInner ? innerCount : outerCount;
    const ringRadius = isInner ? 180 : 270;
    const ringOffset = isInner ? -92 : -70 + (180 / Math.max(outerCount, 1));
    const angle = ((360 / Math.max(ringCount, 1)) * ringIndex + ringOffset) * (Math.PI / 180);

    return {
      ...record,
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius,
      radius: nodeRadius
    } satisfies MotifConstellationNode;
  });
}

function splitMotifName(name: string) {
  if (name.includes("与")) {
    return name.split("与").filter(Boolean);
  }
  if (Array.from(name).length > 4) {
    const chars = Array.from(name);
    return [chars.slice(0, 2).join(""), chars.slice(2).join("")];
  }
  return [name];
}

function getChapterMotifHref(chapterSlug: string, motifId: string) {
  const params = new URLSearchParams({ chapter: chapterSlug, motif: motifId });
  return `/one-hundred-years?${params.toString()}`;
}

function getTimelineEventHref(eventId: string, motifId: string) {
  const params = new URLSearchParams({ motif: motifId, event: eventId });
  return `/timeline?${params.toString()}`;
}

function getConnections(
  motifId: string,
  edges: MotifConstellationEdge[],
  recordById: Map<string, MotifConstellationRecord>
) {
  return edges
    .filter((edge) => edge.sourceId === motifId || edge.targetId === motifId)
    .map((edge) => {
      const connectedId = edge.sourceId === motifId ? edge.targetId : edge.sourceId;
      const record = recordById.get(connectedId);
      return record ? { edge, record } : null;
    })
    .filter((connection): connection is MotifConnection => Boolean(connection))
    .sort((a, b) => b.edge.weight - a.edge.weight || a.record.motif.name.localeCompare(b.record.motif.name, "zh-CN"));
}

function MotifDetailContent({
  record,
  connections,
  onClose,
  onSelectMotif
}: {
  record: MotifConstellationRecord | null;
  connections: MotifConnection[];
  onClose?: () => void;
  onSelectMotif: (motifId: string) => void;
}) {
  if (!record) {
    return (
      <div className="motif-detail-empty">
        <SearchX size={24} />
        <strong>没有匹配的意象</strong>
        <span>调整人物、章节或主题筛选后，意象星图会重新显影。</span>
      </div>
    );
  }

  const { motif, chapters, characters, events, locations, score } = record;

  return (
    <>
      <div className="motif-detail-heading">
        <div>
          <p className="eyebrow">Motif Signal</p>
          <h3>{motif.name}</h3>
          <span className="motif-detail-system">{motifGroupLabels[motif.motifGroup]}</span>
        </div>
        {onClose ? (
          <button aria-label="关闭意象详情" className="timeline-drawer-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="motif-detail-stats" aria-label={`${motif.name} 关联数据`}>
        <span>
          <strong>{chapters.length}</strong>
          章节
        </span>
        <span>
          <strong>{events.length}</strong>
          事件
        </span>
        <span>
          <strong>{characters.length}</strong>
          人物
        </span>
        <span>
          <strong>{locations.length}</strong>
          地点
        </span>
      </div>

      <p className="motif-detail-summary">{motif.summary}</p>

      <div className="motif-detail-score">
        <span>密度指数</span>
        <strong>{score}</strong>
      </div>

      <div className="motif-layer-cloud" aria-label={`${motif.name} 象征层级`}>
        {motif.symbolicLayers.map((layer) => (
          <span key={layer}>{layer}</span>
        ))}
      </div>

      <section className="motif-detail-section motif-appearance-section">
        <h4>
          <Leaf size={15} />
          具体显现
        </h4>
        <div className="motif-appearance-cloud" aria-label={`${motif.name} 具体显现`}>
          {motif.appearances.map((appearance) => (
            <span key={appearance}>{appearance}</span>
          ))}
        </div>
      </section>

      <div className="motif-detail-actions">
        <Link className="button compact-button" href={`/one-hundred-years?motif=${motif.id}`}>
          <BookOpen size={16} />
          章节地图
        </Link>
        <Link className="ghost-button compact-button" href={`/timeline?motif=${motif.id}`}>
          <Route size={16} />
          时间迷宫
        </Link>
        <Link className="ghost-button compact-button" href={`/motifs/${motif.id}`}>
          <Sparkles size={16} />
          完整档案
        </Link>
      </div>

      {connections.length > 0 ? (
        <section className="motif-detail-section">
          <h4>
            <Network size={15} />
            相邻意象
          </h4>
          <div className="motif-connection-list">
            {connections.slice(0, 6).map(({ edge, record: connectedRecord }) => (
              <button
                key={edge.id}
                onClick={() => onSelectMotif(connectedRecord.motif.id)}
                type="button"
              >
                <strong>{connectedRecord.motif.name}</strong>
                <span>连接强度 {edge.weight}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="motif-detail-section">
        <h4>
          <CalendarRange size={15} />
          关联章节
        </h4>
        <div className="motif-detail-link-grid">
          {chapters.map((chapter) => (
            <Link href={getChapterMotifHref(chapter.slug, motif.id)} key={chapter.id}>
              <strong>第 {chapter.order} 章</strong>
              <span>{chapter.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="motif-detail-section">
        <h4>
          <UserRound size={15} />
          关联人物
        </h4>
        <div className="motif-detail-link-grid">
          {characters.map((character) => (
            <Link href={`/characters/${character.id}`} key={character.id}>
              <strong>{character.canonicalName}</strong>
              <span>{character.lonelinessType}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="motif-detail-section">
        <h4>
          <MapPin size={15} />
          关联地点
        </h4>
        <div className="motif-detail-link-grid">
          {locations.map((location) => (
            <Link href={`/map?location=${location.id}`} key={location.id}>
              <strong>{location.name}</strong>
              <span>{location.summary}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="motif-detail-section">
        <h4>
          <Sparkles size={15} />
          关键事件
        </h4>
        <div className="motif-detail-event-list">
          {events.map((event) => (
            <Link href={getTimelineEventHref(event.id, motif.id)} key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function MotifConstellationExplorer({
  motifs,
  chapters,
  characters,
  events,
  locations
}: {
  motifs: Motif[];
  chapters: Chapter[];
  characters: Character[];
  events: Event[];
  locations: Location[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchText = searchParams.toString();

  const themes = useMemo(
    () => [...new Set(chapters.flatMap((chapter) => chapter.themeTags))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [chapters]
  );
  const motifGroups = useMemo(
    () => motifGroupOrder.filter((group) => motifs.some((motif) => motif.motifGroup === group)),
    [motifs]
  );
  const model = useMemo(
    () => buildMotifConstellationModel({ motifs, chapters, characters, events, locations }),
    [chapters, characters, events, locations, motifs]
  );
  const motifById = useMemo(() => new Map(motifs.map((motif) => [motif.id, motif])), [motifs]);
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );
  const chapterBySlug = useMemo(() => new Map(chapters.map((chapter) => [chapter.slug, chapter])), [chapters]);
  const validMotifIds = useMemo(() => new Set(motifs.map((motif) => motif.id)), [motifs]);
  const validCharacterIds = useMemo(() => new Set(characters.map((character) => character.id)), [characters]);
  const validChapterSlugs = useMemo(() => new Set(chapters.map((chapter) => chapter.slug)), [chapters]);
  const validThemes = useMemo(() => new Set(themes), [themes]);
  const validMotifGroups = useMemo(() => new Set(motifGroups), [motifGroups]);

  const query = useMemo(
    () =>
      readMotifQuery(
        searchParams,
        validMotifIds,
        validCharacterIds,
        validChapterSlugs,
        validThemes,
        validMotifGroups
      ),
    [searchParams, validChapterSlugs, validCharacterIds, validMotifGroups, validMotifIds, validThemes]
  );
  const canonicalQueryString = useMemo(() => buildQueryString(query), [query]);

  useEffect(() => {
    if (searchText !== canonicalQueryString) {
      router.replace(canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname, { scroll: false });
    }
  }, [canonicalQueryString, pathname, router, searchText]);

  const selectedCharacter = query.characterId ? characterById.get(query.characterId) ?? null : null;
  const selectedChapter = query.chapterSlug ? chapterBySlug.get(query.chapterSlug) ?? null : null;
  const selectedMotif = query.motifId ? motifById.get(query.motifId) ?? null : null;
  const themeChapterIds = useMemo(
    () =>
      query.theme
        ? new Set(chapters.filter((chapter) => chapter.themeTags.includes(query.theme ?? "")).map((chapter) => chapter.id))
        : null,
    [chapters, query.theme]
  );

  const visibleRecords = useMemo(
    () =>
      model.records.filter((record) => {
        const matchesCharacter =
          !query.characterId ||
          record.motif.characterIds.includes(query.characterId) ||
          Boolean(selectedCharacter?.relatedMotifIds.includes(record.motif.id));
        const matchesChapter =
          !selectedChapter ||
          record.motif.chapterIds.includes(selectedChapter.id) ||
          selectedChapter.motifIds.includes(record.motif.id);
        const matchesTheme =
          !themeChapterIds || record.chapters.some((chapter) => themeChapterIds.has(chapter.id));
        const matchesGroup = !query.motifGroup || record.motif.motifGroup === query.motifGroup;
        return matchesCharacter && matchesChapter && matchesTheme && matchesGroup;
      }),
    [model.records, query.characterId, query.motifGroup, selectedCharacter, selectedChapter, themeChapterIds]
  );

  const nodes = useMemo(() => buildConstellationNodes(visibleRecords), [visibleRecords]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.motif.id, node])), [nodes]);
  const visibleMotifIds = useMemo(() => new Set(nodes.map((node) => node.motif.id)), [nodes]);
  const visibleEdges = useMemo(
    () => model.edges.filter((edge) => visibleMotifIds.has(edge.sourceId) && visibleMotifIds.has(edge.targetId)),
    [model.edges, visibleMotifIds]
  );
  const maxVisibleEdgeWeight = useMemo(
    () => Math.max(1, ...visibleEdges.map((edge) => edge.weight)),
    [visibleEdges]
  );

  const exactSelectedNode = query.motifId ? nodeById.get(query.motifId) ?? null : null;
  const selectedRecord = exactSelectedNode ?? nodes[0] ?? null;
  const focusedMotifId = exactSelectedNode?.motif.id ?? null;
  const neighborIds = useMemo(() => {
    if (!focusedMotifId) {
      return new Set<string>();
    }
    return new Set(
      visibleEdges.flatMap((edge) => {
        if (edge.sourceId === focusedMotifId) {
          return [edge.targetId];
        }
        if (edge.targetId === focusedMotifId) {
          return [edge.sourceId];
        }
        return [];
      })
    );
  }, [focusedMotifId, visibleEdges]);

  const activeFilterCount =
    Number(Boolean(query.characterId)) +
    Number(Boolean(query.chapterSlug)) +
    Number(Boolean(query.theme)) +
    Number(Boolean(query.motifGroup));
  const recordById = useMemo(
    () => new Map(visibleRecords.map((record) => [record.motif.id, record])),
    [visibleRecords]
  );
  const selectedConnections = selectedRecord
    ? getConnections(selectedRecord.motif.id, visibleEdges, recordById)
    : [];

  function replaceQuery(nextQuery: MotifQuery) {
    const normalizedQuery = normalizeMotifQuery(
      nextQuery,
      validMotifIds,
      validCharacterIds,
      validChapterSlugs,
      validThemes,
      validMotifGroups
    );
    const nextQueryString = buildQueryString(normalizedQuery);
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false });
  }

  function resetFilters() {
    replaceQuery({
      motifId: null,
      characterId: null,
      chapterSlug: null,
      theme: null,
      motifGroup: null
    });
  }

  function selectMotif(motifId: string) {
    replaceQuery({ ...query, motifId });
  }

  function closeDrawer() {
    replaceQuery({ ...query, motifId: null });
  }

  function handleNodeKeyDown(event: KeyboardEvent<SVGGElement>, motifId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectMotif(motifId);
    }
  }

  return (
    <section className="section motif-constellation" aria-labelledby="motif-constellation-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Motif Constellation</p>
          <h2 id="motif-constellation-title">意象关系网络</h2>
        </div>
        <p>把意象当作星群观察：节点越大，章节、人物与事件连接越密；线越亮，共现越强。</p>
      </div>

      <div className="motif-constellation-stat-strip" aria-label="意象星图数据概览">
        <span>
          <strong>{visibleRecords.length}</strong>
          当前意象
        </span>
        <span>
          <strong>{motifs.length}</strong>
          意象总数
        </span>
        <span>
          <strong>{visibleEdges.length}</strong>
          连接关系
        </span>
        <span>
          <strong>{activeFilterCount}</strong>
          筛选条件
        </span>
      </div>

      <div className="motif-constellation-toolbar">
        <div className="motif-constellation-filter-grid" aria-label="意象筛选">
          <label className="motif-constellation-field">
            <span>
              <Sparkles size={14} />
              聚焦意象
            </span>
            <select
              className="timeline-select"
              onChange={(event) => replaceQuery({ ...query, motifId: event.target.value || null })}
              value={query.motifId ?? ""}
            >
              <option value="">默认焦点</option>
              {model.records.map((record) => (
                <option key={record.motif.id} value={record.motif.id}>
                  {record.motif.name} · {record.score}
                </option>
              ))}
            </select>
          </label>

          <label className="motif-constellation-field">
            <span>
              <Leaf size={14} />
              自然系统
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({
                  ...query,
                  motifId: null,
                  motifGroup: (event.target.value as Motif["motifGroup"]) || null
                })
              }
              value={query.motifGroup ?? ""}
            >
              <option value="">全部系统</option>
              {motifGroups.map((group) => (
                <option key={group} value={group}>
                  {motifGroupLabels[group]}
                </option>
              ))}
            </select>
          </label>

          <label className="motif-constellation-field">
            <span>
              <UserRound size={14} />
              人物
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({
                  ...query,
                  motifId: null,
                  characterId: event.target.value || null
                })
              }
              value={query.characterId ?? ""}
            >
              <option value="">全部人物</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.canonicalName} · {character.relatedMotifIds.length}
                </option>
              ))}
            </select>
          </label>

          <label className="motif-constellation-field">
            <span>
              <BookOpen size={14} />
              章节
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({
                  ...query,
                  motifId: null,
                  chapterSlug: event.target.value || null
                })
              }
              value={query.chapterSlug ?? ""}
            >
              <option value="">全部章节</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.slug}>
                  第 {chapter.order} 章 · {chapter.motifIds.length}
                </option>
              ))}
            </select>
          </label>

          <label className="motif-constellation-field">
            <span>
              <Layers3 size={14} />
              主题
            </span>
            <select
              className="timeline-select"
              onChange={(event) =>
                replaceQuery({
                  ...query,
                  motifId: null,
                  theme: event.target.value || null
                })
              }
              value={query.theme ?? ""}
            >
              <option value="">全部主题</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>

          <button className="ghost-button motif-constellation-reset-button" onClick={resetFilters} type="button">
            <RotateCcw size={16} />
            重置
          </button>
        </div>

        <div className="motif-constellation-active-filters" aria-label="当前意象筛选">
          <span>
            <ListFilter size={14} />
            {visibleRecords.length} 个意象
          </span>
          {selectedMotif ? <span>聚焦：{selectedMotif.name}</span> : null}
          {selectedCharacter ? <span>{selectedCharacter.canonicalName}</span> : null}
          {selectedChapter ? <span>第 {selectedChapter.order} 章</span> : null}
          {query.theme ? <span>{query.theme}</span> : null}
          {query.motifGroup ? <span>{motifGroupLabels[query.motifGroup]}</span> : null}
        </div>
      </div>

      <div className="motif-constellation-workbench">
        <div className="motif-constellation-surface">
          <div className="surface-title">
            <Network size={19} />
            <span>意象星图</span>
            <small>{visibleEdges.length} 条共现线</small>
          </div>

          {nodes.length > 0 ? (
            <div className="motif-constellation-stage" aria-label="意象共现网络">
              <svg className="motif-constellation-svg" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} role="img">
                <defs>
                  <radialGradient id="motif-node-gradient" cx="42%" cy="32%" r="72%">
                    <stop offset="0%" stopColor="#fff4d4" />
                    <stop offset="52%" stopColor="#e1b84d" />
                    <stop offset="100%" stopColor="#ad4e36" />
                  </radialGradient>
                </defs>

                <g className="motif-constellation-rings" aria-hidden="true">
                  <circle cx={canvasWidth / 2} cy={canvasHeight / 2} r="180" />
                  <circle cx={canvasWidth / 2} cy={canvasHeight / 2} r="270" />
                </g>

                <g className="motif-constellation-edges">
                  {visibleEdges.map((edge) => {
                    const source = nodeById.get(edge.sourceId);
                    const target = nodeById.get(edge.targetId);
                    if (!source || !target) {
                      return null;
                    }
                    const isActive = !focusedMotifId || edge.sourceId === focusedMotifId || edge.targetId === focusedMotifId;
                    const strokeWidth = 1.4 + (edge.weight / maxVisibleEdgeWeight) * 4.2;
                    return (
                      <line
                        className={`motif-edge ${isActive ? "is-active" : "is-dimmed"}`}
                        key={edge.id}
                        strokeWidth={strokeWidth}
                        x1={source.x}
                        x2={target.x}
                        y1={source.y}
                        y2={target.y}
                      />
                    );
                  })}
                </g>

                <g className="motif-constellation-nodes">
                  {nodes.map((node) => {
                    const labelLines = splitMotifName(node.motif.name);
                    const isSelected = focusedMotifId === node.motif.id;
                    const isConnected = Boolean(focusedMotifId && neighborIds.has(node.motif.id));
                    const isDimmed = Boolean(focusedMotifId && !isSelected && !isConnected);

                    return (
                      <g
                        aria-label={`${node.motif.name}，密度指数 ${node.score}`}
                        className={`motif-node ${isSelected ? "is-selected" : ""} ${isConnected ? "is-connected" : ""} ${isDimmed ? "is-dimmed" : ""}`}
                        key={node.motif.id}
                        onClick={() => selectMotif(node.motif.id)}
                        onKeyDown={(event) => handleNodeKeyDown(event, node.motif.id)}
                        role="button"
                        tabIndex={0}
                        transform={`translate(${node.x} ${node.y})`}
                      >
                        <circle className="motif-node-orbit" r={node.radius + 12} />
                        <circle className="motif-node-core" r={node.radius} />
                        <text className="motif-node-name" textAnchor="middle">
                          {labelLines.map((line, index) => (
                            <tspan
                              dy={labelLines.length === 1 ? "0.34em" : index === 0 ? "-0.1em" : "1.1em"}
                              key={line}
                              x="0"
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            <div className="motif-constellation-empty panel">
              <SearchX size={24} />
              <strong>没有意象落在这些条件里</strong>
              <p>换一个人物、章节或主题，意象关系会重新显影。</p>
              <button className="button compact-button" onClick={resetFilters} type="button">
                <RotateCcw size={16} />
                重置筛选
              </button>
            </div>
          )}

          <div className="motif-mobile-card-flow" aria-label="移动端意象卡流">
            {nodes.map((node) => (
              <button
                aria-pressed={focusedMotifId === node.motif.id}
                className="motif-mobile-card"
                key={node.motif.id}
                onClick={() => selectMotif(node.motif.id)}
                type="button"
              >
                <span className="motif-mobile-card-index">{node.score}</span>
                <strong>{node.motif.name}</strong>
                <span>{node.motif.summary}</span>
                <span className="motif-mobile-card-meta">
                  {node.chapters.length} 章 · {node.events.length} 事件 · {node.characters.length} 人物
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="motif-detail-panel" aria-label="意象详情">
          <MotifDetailContent
            connections={selectedConnections}
            onSelectMotif={selectMotif}
            record={selectedRecord}
          />
        </aside>
      </div>

      <div className={`motif-drawer-backdrop ${exactSelectedNode ? "is-open" : ""}`} onClick={closeDrawer} />
      <aside
        aria-hidden={!exactSelectedNode}
        aria-label="意象详情抽屉"
        className={`motif-mobile-drawer ${exactSelectedNode ? "is-open" : ""}`}
      >
        <MotifDetailContent
          connections={selectedConnections}
          onClose={closeDrawer}
          onSelectMotif={selectMotif}
          record={exactSelectedNode}
        />
      </aside>
    </section>
  );
}
