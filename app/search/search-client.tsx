"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Compass,
  FileText,
  MapPinned,
  Network,
  Quote,
  Route,
  Search,
  SearchX,
  Sparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchDocument, SearchExploreAction } from "@/lib/search/build";

type EntityTypeFilter = SearchDocument["type"] | "all";
type MatchKind = "direct" | "related";

type SearchResult = {
  item: SearchDocument;
  matchKind: MatchKind;
  score: number;
  sourceTitle?: string;
};

const typeOrder: SearchDocument["type"][] = [
  "article",
  "evidence",
  "path",
  "beat",
  "location",
  "motif",
  "event",
  "chapter",
  "character",
  "work"
];

const typeLabels: Record<SearchDocument["type"], string> = {
  character: "人物",
  chapter: "章节",
  evidence: "证据",
  article: "专题",
  motif: "意象",
  location: "地点",
  event: "事件",
  beat: "情节",
  work: "作品",
  path: "路径"
};

const typeDescriptions: Record<SearchDocument["type"], string> = {
  article: "阅读由证据组织成的长线论证",
  evidence: "回到判断背后的文本锚点",
  path: "沿主题命运线行走",
  location: "从空间坐标进入马孔多",
  motif: "从象征反向进入文本",
  beat: "定位细读情节与人物轨迹",
  chapter: "回到章节阅读地图",
  event: "定位故事时间坐标",
  character: "打开人物命运档案",
  work: "进入马尔克斯作品谱系"
};

const explorationSeeds = [
  { label: "雨", note: "暴雨、香蕉公司与记忆冲刷" },
  { label: "车站", note: "铁路、现代性与大屠杀" },
  { label: "栗树", note: "宅邸中心与父权束缚" },
  { label: "孤独", note: "人物命运的共同语法" },
  { label: "羊皮卷", note: "预言、破译与终局文本" },
  { label: "黄蝴蝶", note: "爱情踪迹与死亡预兆" },
  { label: "战争", note: "公共暴力和权力虚无" }
];

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function isEntityType(value: string | null): value is SearchDocument["type"] {
  return Boolean(value && typeOrder.includes(value as SearchDocument["type"]));
}

function getActionIcon(kind: SearchExploreAction["kind"]): typeof Search {
  switch (kind) {
    case "chapter-atlas":
      return BookOpen;
    case "timeline":
      return Clock3;
    case "motif-map":
      return Sparkles;
    case "space-map":
      return MapPinned;
    case "profile":
      return Network;
    case "work":
      return Compass;
    case "path":
      return Route;
    case "evidence":
      return Quote;
    case "archive":
    default:
      return FileText;
  }
}

function getDirectMatchWeight(item: SearchDocument, query: string) {
  const needle = normalizeText(query);
  if (!needle) {
    return 0;
  }

  const title = normalizeText(item.title);
  const aliases = item.aliases?.map(normalizeText) ?? [];
  const tags = item.tags.map(normalizeText);
  const summary = normalizeText(item.summary);

  if (title === needle) {
    return 120;
  }
  if (aliases.some((alias) => alias === needle)) {
    return 118;
  }
  if (tags.some((tag) => tag === needle)) {
    return 114;
  }
  if (title.includes(needle) || aliases.some((alias) => alias.includes(needle))) {
    return 88;
  }
  if (tags.some((tag) => tag.includes(needle))) {
    return 84;
  }
  if (summary.includes(needle)) {
    return 68;
  }

  return 0;
}

function getDirectSearchScore(item: SearchDocument, query: string, fuseScore: number | undefined) {
  const matchWeight = getDirectMatchWeight(item, query);
  const fuzzyWeight = Math.max(0, 1 - (fuseScore ?? 0.58)) * 62;
  return matchWeight + fuzzyWeight + (item.boost ?? 1) * 4;
}

function buildReverseRelationMap(documents: SearchDocument[]) {
  const reverseRelationMap = new Map<string, string[]>();

  documents.forEach((document) => {
    document.relatedEntityIds.forEach((relatedId) => {
      const relatedDocuments = reverseRelationMap.get(relatedId) ?? [];
      relatedDocuments.push(document.id);
      reverseRelationMap.set(relatedId, relatedDocuments);
    });
  });

  return reverseRelationMap;
}

function sortResults(first: SearchResult, second: SearchResult) {
  const scoreDelta = second.score - first.score;
  if (Math.abs(scoreDelta) > 0.01) {
    return scoreDelta;
  }

  const typeDelta = typeOrder.indexOf(first.item.type) - typeOrder.indexOf(second.item.type);
  if (typeDelta !== 0) {
    return typeDelta;
  }

  return first.item.title.localeCompare(second.item.title, "zh-CN");
}

function buildSearchResults({
  documents,
  fuse,
  query,
  reverseRelationMap
}: {
  documents: SearchDocument[];
  fuse: Fuse<SearchDocument>;
  query: string;
  reverseRelationMap: Map<string, string[]>;
}) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const documentById = new Map(documents.map((document) => [document.id, document]));
  const resultMap = new Map<string, SearchResult>();

  fuse.search(trimmedQuery).slice(0, 80).forEach((result) => {
    resultMap.set(result.item.id, {
      item: result.item,
      matchKind: "direct",
      score: getDirectSearchScore(result.item, trimmedQuery, result.score)
    });
  });

  documents.forEach((document) => {
    const directWeight = getDirectMatchWeight(document, trimmedQuery);
    if (directWeight <= 0 || resultMap.has(document.id)) {
      return;
    }

    resultMap.set(document.id, {
      item: document,
      matchKind: "direct",
      score: directWeight + (document.boost ?? 1) * 4
    });
  });

  [...resultMap.values()]
    .sort(sortResults)
    .slice(0, 28)
    .forEach((sourceResult) => {
      const relatedIds = new Set([
        ...sourceResult.item.relatedEntityIds,
        ...(reverseRelationMap.get(sourceResult.item.id) ?? [])
      ]);
      const sourceWeight = getDirectMatchWeight(sourceResult.item, trimmedQuery);
      const relationPenalty = sourceWeight >= 110 ? 16 : 28;

      relatedIds.forEach((relatedId) => {
        const relatedDocument = documentById.get(relatedId);
        if (!relatedDocument || relatedDocument.id === sourceResult.item.id) {
          return;
        }

        const relatedScore = sourceResult.score - relationPenalty + (relatedDocument.boost ?? 1) * 3;
        const existingResult = resultMap.get(relatedDocument.id);

        if (!existingResult) {
          resultMap.set(relatedDocument.id, {
            item: relatedDocument,
            matchKind: "related",
            score: relatedScore,
            sourceTitle: sourceResult.item.title
          });
          return;
        }

        if (relatedScore > existingResult.score) {
          existingResult.score = relatedScore;
          if (existingResult.matchKind === "related") {
            existingResult.sourceTitle = sourceResult.item.title;
          }
        }
      });
    });

  return [...resultMap.values()].sort(sortResults).slice(0, 80);
}

function getTypeCounts(results: SearchResult[], documents: SearchDocument[], hasQuery: boolean) {
  const counts = new Map<SearchDocument["type"], number>();
  const source = hasQuery ? results.map((result) => result.item) : documents;

  source.forEach((item) => {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  });

  return counts;
}

export function SearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchText = searchParams.toString();
  const rawQuery = searchParams.get("q") ?? "";
  const rawType = searchParams.get("type");
  const selectedType: EntityTypeFilter = isEntityType(rawType) ? rawType : "all";
  const [inputValue, setInputValue] = useState(rawQuery);
  const [isComposing, setIsComposing] = useState(false);
  const committedQueryRef = useRef(rawQuery);
  const query = inputValue;
  const [documents, setDocuments] = useState<SearchDocument[]>([]);

  useEffect(() => {
    if (!rawType || isEntityType(rawType)) {
      return;
    }

    const params = new URLSearchParams(searchText);
    params.delete("type");
    const nextSearchText = params.toString();
    router.replace(nextSearchText ? `${pathname}?${nextSearchText}` : pathname, { scroll: false });
  }, [pathname, rawType, router, searchText]);

  useEffect(() => {
    fetch("/search-index.json")
      .then((response) => response.json())
      .then((items: SearchDocument[]) => setDocuments(items))
      .catch(() => setDocuments([]));
  }, []);

  const replaceSearchState = useCallback((nextQuery: string, nextType: EntityTypeFilter) => {
    const params = new URLSearchParams(searchText);
    const trimmedQuery = nextQuery.trim();
    committedQueryRef.current = trimmedQuery;

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
      if (nextType === "all") {
        params.delete("type");
      } else {
        params.set("type", nextType);
      }
    } else {
      params.delete("q");
      params.delete("type");
    }

    const nextSearchText = params.toString();
    router.replace(nextSearchText ? `${pathname}?${nextSearchText}` : pathname, { scroll: false });
  }, [pathname, router, searchText]);

  useEffect(() => {
    if (rawQuery === committedQueryRef.current) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      committedQueryRef.current = rawQuery;
      setInputValue(rawQuery);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [rawQuery]);

  useEffect(() => {
    if (isComposing || inputValue === rawQuery) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      replaceSearchState(inputValue, selectedType);
    }, 220);

    return () => window.clearTimeout(syncTimer);
  }, [inputValue, isComposing, rawQuery, replaceSearchState, selectedType]);

  const fuse = useMemo(
    () =>
      new Fuse(documents, {
        keys: [
          { name: "title", weight: 0.42 },
          { name: "aliases", weight: 0.2 },
          { name: "summary", weight: 0.25 },
          { name: "tags", weight: 0.13 }
        ],
        threshold: 0.36,
        includeScore: true
      }),
    [documents]
  );

  const reverseRelationMap = useMemo(() => buildReverseRelationMap(documents), [documents]);
  const hasQuery = query.trim().length > 0;
  const results = useMemo(
    () => buildSearchResults({ documents, fuse, query, reverseRelationMap }),
    [documents, fuse, query, reverseRelationMap]
  );
  const typeCounts = useMemo(() => getTypeCounts(results, documents, hasQuery), [documents, hasQuery, results]);
  const visibleResults = selectedType === "all"
    ? results
    : results.filter((result) => result.item.type === selectedType);
  const groupedResults = typeOrder
    .map((type) => ({
      type,
      items: visibleResults.filter((result) => result.item.type === type)
    }))
    .filter((group) => group.items.length > 0);
  const allCount = hasQuery ? results.length : documents.length;

  return (
    <section className="section search-explorer">
      <div className="search-command-surface">
        <label className="search-box" htmlFor="macondo-search-input">
          <Search size={21} />
          <input
            className="search-input"
            id="macondo-search-input"
            onChange={(event) => {
              setInputValue(event.target.value);
            }}
            onCompositionEnd={(event) => {
              setIsComposing(false);
              setInputValue(event.currentTarget.value);
            }}
            onCompositionStart={() => setIsComposing(true)}
            placeholder="输入专题、证据、人物、地点、意象、章节、情节、事件或作品"
            value={query}
          />
        </label>

        <div className="search-type-filter" aria-label="搜索结果类型">
          <button
            aria-pressed={selectedType === "all"}
            onClick={() => replaceSearchState(query, "all")}
            type="button"
          >
            全部 <span>{allCount}</span>
          </button>
          {typeOrder.map((type) => (
            <button
              aria-pressed={selectedType === type}
              key={type}
              onClick={() => replaceSearchState(query, type)}
              type="button"
            >
              {typeLabels[type]} <span>{typeCounts.get(type) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {!hasQuery ? (
        <div className="search-entry-grid" aria-label="探索入口">
          {explorationSeeds.map((seed) => (
            <Link className="search-entry-card" href={`/search?q=${encodeURIComponent(seed.label)}`} key={seed.label}>
              <span>{seed.label}</span>
              <strong>{seed.note}</strong>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      ) : null}

      {hasQuery && groupedResults.length > 0 ? (
        <div className="search-result-groups">
          {groupedResults.map((group) => (
            <section className="search-result-group" key={group.type}>
              <div className="search-group-heading">
                <div>
                  <p className="eyebrow">{typeLabels[group.type]}</p>
                  <h2>{typeLabels[group.type]}线索</h2>
                </div>
                <span>
                  {group.items.length} 条 · {typeDescriptions[group.type]}
                </span>
              </div>

              <div className="search-card-grid">
                {group.items.map((result) => (
                  <article className="card search-result-card" key={`${result.item.type}-${result.item.id}`}>
                    <div className="search-result-meta">
                      <span className="meta-pill">{typeLabels[result.item.type]}</span>
                      <span className={`search-match-badge is-${result.matchKind}`}>
                        {result.matchKind === "direct" ? "直接命中" : "关联线索"}
                      </span>
                    </div>

                    <h3>
                      <Link href={result.item.href}>{result.item.title}</Link>
                    </h3>
                    <p>{result.item.summary}</p>

                    {result.matchKind === "related" && result.sourceTitle ? (
                      <span className="search-relation-note">由“{result.sourceTitle}”延伸</span>
                    ) : null}

                    <div className="tag-row search-result-tags">
                      {result.item.tags.slice(0, 3).map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="card-actions search-action-row">
                      {result.item.exploreActions.slice(0, 4).map((action) => {
                        const Icon = getActionIcon(action.kind);
                        return (
                          <Link
                            className={`${action.primary ? "button" : "ghost-button"} compact-button`}
                            href={action.href}
                            key={`${result.item.id}-${action.href}-${action.label}`}
                          >
                            <Icon size={15} />
                            {action.label}
                          </Link>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {hasQuery && groupedResults.length === 0 ? (
        <div className="panel search-empty-state">
          <SearchX size={26} />
          <strong>没有找到这条线索</strong>
          <span>换一个人物、意象、章节或主题词，马孔多会重新显影。</span>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="lead">搜索索引尚未生成。请先运行 npm run build:search。</p>
      ) : null}
    </section>
  );
}
