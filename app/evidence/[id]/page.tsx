import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock3, FileText, MapPinned, Quote, Route, Sparkles, UserRound } from "lucide-react";
import { EntityLinks } from "@/components/EntityLinks";
import { TextWithSerifQuotes } from "@/components/TextWithSerifQuotes";
import {
  chapters,
  evidenceCards,
  events,
  getCharactersByIds,
  getChaptersByIds,
  getEvidenceCard,
  getEventsByIds,
  getLocationsByIds,
  getMotifsByIds,
  getResearchArticlesByEvidenceCardId,
  readingPaths,
  timelineBeats
} from "@/lib/data/static";
import {
  getBeatPrimaryChapter,
  getBeatReadingPathMatches,
  getEvidenceTimelineBeatMatches
} from "@/lib/data/timeline-beat-relations";
import type { Chapter } from "@/lib/domain/schemas";

function isPresent<T>(item: T | null | undefined): item is T {
  return Boolean(item);
}

function getChapterBeatHref(chapter: Chapter, beatId: string) {
  return `/one-hundred-years/chapters/${chapter.slug}#${beatId}`;
}

function getBeatChapterLabel(beatChapters: Chapter[]) {
  if (beatChapters.length === 0) {
    return "章节未标注";
  }

  return beatChapters.map((beatChapter) => `第 ${beatChapter.order} 章`).join(" / ");
}

export function generateStaticParams() {
  return evidenceCards.map((card) => ({ id: card.id }));
}

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getEvidenceCard(id);
  if (!card) {
    notFound();
  }

  const chapter = getChaptersByIds([card.chapterId])[0];
  const relatedEvents = getEventsByIds(card.eventIds);
  const relatedCharacters = getCharactersByIds(card.characterIds);
  const relatedMotifs = getMotifsByIds(card.motifIds);
  const relatedLocations = getLocationsByIds(card.locationIds);
  const relatedPaths = readingPaths.filter((path) => card.pathIds.includes(path.id));
  const referencedArticles = getResearchArticlesByEvidenceCardId(card.id);
  const relatedPathSteps = relatedPaths.flatMap((path) => (
    path.steps
      .filter((step) => card.pathStepIds.includes(step.id))
      .map((step) => ({ path, step }))
  ));
  const chapterById = new Map(chapters.map((item) => [item.id, item]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const cardPathStepIds = new Set(card.pathStepIds);
  const beatContexts = getEvidenceTimelineBeatMatches(card, timelineBeats).map(({ beat, score }) => {
    const beatChapters = beat.chapterIds
      .map((chapterId) => chapterById.get(chapterId))
      .filter(isPresent);
    const primaryChapter = getBeatPrimaryChapter(beat, chapterById);
    const linkedEvent = beat.linkedEventId ? eventById.get(beat.linkedEventId) ?? null : null;
    const pathStepMatch = getBeatReadingPathMatches(beat, relatedPaths, relatedPaths.length)
      .find((match) => cardPathStepIds.has(match.step.id)) ?? null;

    return {
      beat,
      score,
      beatChapters,
      primaryChapter,
      linkedEvent,
      pathStepMatch
    };
  });
  const firstBeatContext = beatContexts[0] ?? null;
  const firstPath = relatedPaths[0];
  const chapterHref = chapter
    ? firstBeatContext?.primaryChapter
      ? getChapterBeatHref(firstBeatContext.primaryChapter, firstBeatContext.beat.id)
      : `/one-hundred-years/chapters/${chapter.slug}`
    : null;
  const timelineHref = firstBeatContext
    ? `/timeline?beat=${firstBeatContext.beat.id}`
    : relatedEvents[0]
      ? `/timeline?event=${relatedEvents[0].id}`
      : null;

  return (
    <div className="page">
      <Link className="ghost-button" href={firstPath ? `/paths/${firstPath.slug}` : "/search?type=evidence"}>
        返回相关路径
      </Link>
      <p className="eyebrow">Evidence Card</p>
      <h1 className="hero-title">{card.title}</h1>
      <p className="lead">{card.paraphrase}</p>

      <div className="toolbar">
        {chapterHref ? (
          <Link className="button" href={chapterHref}>
            <BookOpen size={18} />
            章节出处
          </Link>
        ) : null}
        {firstPath ? (
          <Link className="ghost-button" href={`/paths/${firstPath.slug}`}>
            <Route size={18} />
            相关路径
          </Link>
        ) : null}
        {timelineHref ? (
          <Link className="ghost-button" href={timelineHref}>
            <Clock3 size={18} />
            时间坐标
          </Link>
        ) : null}
      </div>

      <div className="detail-layout section">
        <article className="panel evidence-detail-panel">
          <h2>
            <Quote size={19} />
            短引文
          </h2>
          <blockquote>“{card.quote.text}”</blockquote>

          <dl className="fact-list evidence-source-list">
            <div>
              <dt>出处</dt>
              <dd>{card.quote.sourceNote}</dd>
            </div>
            <div>
              <dt>译者</dt>
              <dd>{card.quote.translator}</dd>
            </div>
            <div>
              <dt>公开字数</dt>
              <dd>{card.quote.charCount} 字符</dd>
            </div>
          </dl>

          <h2>摘述</h2>
          <p>{card.paraphrase}</p>

          <h2>解读</h2>
          <p>
            <TextWithSerifQuotes text={card.interpretation} />
          </p>

          {beatContexts.length > 0 ? (
            <section className="evidence-beat-thread" aria-labelledby="evidence-beat-thread-title">
              <div className="evidence-beat-thread-heading">
                <div>
                  <p className="eyebrow">Plot Context</p>
                  <h2 id="evidence-beat-thread-title">
                    <Clock3 size={18} />
                    证据所在情节
                  </h2>
                </div>
                <span>{beatContexts.length} 条</span>
              </div>
              <p className="evidence-beat-thread-intro">
                这张证据在章节叙事中最靠近以下情节节点。
              </p>
              <div className="evidence-beat-list">
                {beatContexts.map(({ beat, beatChapters, primaryChapter, linkedEvent, pathStepMatch }) => {
                  const chapterContextHref = primaryChapter ? getChapterBeatHref(primaryChapter, beat.id) : null;

                  return (
                    <article className="evidence-beat-item" key={beat.id}>
                      <div className="evidence-beat-item-main">
                        <div className="meta-row">
                          <span className="meta-pill">
                            <Clock3 size={12} />
                            故事 {beat.storyOrder}
                          </span>
                          <span className="meta-pill">
                            <BookOpen size={12} />
                            {getBeatChapterLabel(beatChapters)}
                          </span>
                          {linkedEvent ? (
                            <span className="meta-pill">关键：{linkedEvent.title}</span>
                          ) : null}
                        </div>
                        <strong>{beat.title}</strong>
                        <p>{beat.summary}</p>
                      </div>

                      <div className="evidence-beat-actions" aria-label={`${beat.title}回流入口`}>
                        {chapterContextHref ? (
                          <Link className="evidence-beat-action" href={chapterContextHref}>
                            <BookOpen size={13} />
                            章节细读
                          </Link>
                        ) : null}
                        <Link className="evidence-beat-action is-timeline" href={`/timeline?beat=${beat.id}`}>
                          <Clock3 size={13} />
                          时间迷宫
                        </Link>
                        {pathStepMatch ? (
                          <Link
                            className="evidence-beat-action is-path"
                            href={`/paths/${pathStepMatch.path.slug}#${pathStepMatch.step.id}`}
                          >
                            <Route size={13} />
                            <span>路径 step</span>
                            <strong>{pathStepMatch.step.title}</strong>
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="tag-row evidence-tags">
            {card.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </article>

        <aside className="side-stack">
          <EntityLinks
            title="被研究档案引用"
            items={referencedArticles.map((article) => ({
              href: `/archive/${article.slug}`,
              label: article.title,
              description: article.summary
            }))}
          />
          <EntityLinks
            title="路径节点"
            items={relatedPathSteps.map(({ path, step }) => ({
              href: `/paths/${path.slug}#${step.id}`,
              label: step.title,
              description: path.title
            }))}
          />
          <EntityLinks
            title="关联章节"
            items={chapter ? [{
              href: chapterHref ?? `/one-hundred-years/chapters/${chapter.slug}`,
              label: chapter.title,
              description: chapter.summary
            }] : []}
          />
          <EntityLinks
            title="关联事件"
            items={relatedEvents.map((event) => ({
              href: `/timeline?event=${event.id}`,
              label: event.title,
              description: event.summary
            }))}
          />
          <EntityLinks
            title="关联人物"
            items={relatedCharacters.map((character) => ({
              href: `/characters/${character.id}`,
              label: character.canonicalName,
              description: character.lonelinessType
            }))}
          />
          <EntityLinks
            title="关联意象"
            items={relatedMotifs.map((motif) => ({
              href: `/motifs/${motif.id}`,
              label: motif.name,
              description: motif.symbolicLayers.join(" / ")
            }))}
          />
          <EntityLinks
            title="关联地点"
            items={relatedLocations.map((location) => ({
              href: `/map?location=${location.id}`,
              label: location.name,
              description: location.summary
            }))}
          />
          <section className="panel evidence-jump-panel">
            <h3>快速探索</h3>
            <div className="card-actions">
              {relatedCharacters[0] ? (
                <Link className="ghost-button compact-button" href={`/characters/${relatedCharacters[0].id}`}>
                  <UserRound size={15} />
                  人物
                </Link>
              ) : null}
              {relatedMotifs[0] ? (
                <Link className="ghost-button compact-button" href={`/motifs/${relatedMotifs[0].id}`}>
                  <Sparkles size={15} />
                  意象
                </Link>
              ) : null}
              {relatedLocations[0] ? (
                <Link className="ghost-button compact-button" href={`/map?location=${relatedLocations[0].id}`}>
                  <MapPinned size={15} />
                  地点
                </Link>
              ) : null}
              {referencedArticles[0] ? (
                <Link className="ghost-button compact-button" href={`/archive/${referencedArticles[0].slug}`}>
                  <FileText size={15} />
                  档案
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
