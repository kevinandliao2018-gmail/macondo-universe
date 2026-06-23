import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock3, MapPinned, Quote, Route, Sparkles, UserRound, Waypoints } from "lucide-react";
import { EvidenceCardList } from "@/components/EvidenceCardList";
import {
  getCharactersByIds,
  getChaptersByIds,
  getEvidenceCardsByPathId,
  getEvidenceCardsByPathStepId,
  getEventsByIds,
  getLocationsByIds,
  getMotifsByIds,
  getReadingPathBySlug,
  readingPaths
} from "@/lib/data/static";
import type { Chapter, ReadingPath, ReadingPathStep } from "@/lib/domain/schemas";

export function generateStaticParams() {
  return readingPaths.map((path) => ({ slug: path.slug }));
}

function getUniquePathIds(path: ReadingPath, key: "chapterIds" | "eventIds" | "characterIds" | "locationIds" | "motifIds") {
  return [...new Set(path.steps.flatMap((step) => step[key]))];
}

function getStepChapterHref(step: ReadingPathStep, chapters: Chapter[]) {
  const firstChapter = chapters[0];
  if (!firstChapter) {
    return "/one-hundred-years";
  }

  const params = new URLSearchParams({ chapter: firstChapter.slug });
  if (step.eventIds[0]) {
    params.set("event", step.eventIds[0]);
  }
  return `/one-hundred-years?${params.toString()}`;
}

function getStepTimelineHref(step: ReadingPathStep, chapters: Chapter[]) {
  if (step.eventIds[0]) {
    return `/timeline?event=${step.eventIds[0]}`;
  }
  if (chapters.length > 0) {
    const orders = chapters.map((chapter) => chapter.order);
    return `/timeline?from=${Math.min(...orders)}&to=${Math.max(...orders)}`;
  }
  return "/timeline";
}

export default async function ReadingPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = getReadingPathBySlug(slug);
  if (!path) {
    notFound();
  }

  const pathChapters = getChaptersByIds(getUniquePathIds(path, "chapterIds"));
  const pathLocations = getLocationsByIds(getUniquePathIds(path, "locationIds"));
  const pathMotifs = getMotifsByIds(getUniquePathIds(path, "motifIds"));
  const pathCharacters = getCharactersByIds(getUniquePathIds(path, "characterIds"));
  const pathEvents = getEventsByIds(getUniquePathIds(path, "eventIds"));
  const coverMotif = getMotifsByIds([path.coverMotifId])[0];
  const pathEvidenceCards = getEvidenceCardsByPathId(path.id);

  return (
    <div className="page">
      <Link className="ghost-button" href="/paths">返回命运路径</Link>
      <p className="eyebrow">Fate Route</p>
      <h1 className="hero-title">{path.title}</h1>
      <p className="lead">{path.summary}</p>

      <section className="path-thesis-panel">
        <Route size={24} />
        <p>{path.thesis}</p>
      </section>

      <section className="path-stat-strip" aria-label={`${path.title} 数据概览`}>
        <span>
          <strong>{path.steps.length}</strong>
          路径节点
        </span>
        <span>
          <strong>{pathChapters.length}</strong>
          章节
        </span>
        <span>
          <strong>{pathEvents.length}</strong>
          事件
        </span>
        <span>
          <strong>{pathLocations.length}</strong>
          地点
        </span>
      </section>

      <div className="path-detail-layout section">
        <article className="path-track-surface">
          <div className="surface-title">
            <Waypoints size={18} />
            命运轨道
            <small>{path.steps.length} 个节点按策划顺序展开</small>
          </div>

          <div className="path-step-track">
            {path.steps.map((step, index) => {
              const stepChapters = getChaptersByIds(step.chapterIds);
              const stepEvents = getEventsByIds(step.eventIds);
              const stepCharacters = getCharactersByIds(step.characterIds);
              const stepLocations = getLocationsByIds(step.locationIds);
              const stepMotifs = getMotifsByIds(step.motifIds);
              const stepEvidenceCards = getEvidenceCardsByPathStepId(path.id, step.id);

              return (
                <section className="path-step-card" id={step.id} key={step.id}>
                  <div className="path-step-index">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="path-step-body">
                    <div className="path-step-heading">
                      <div>
                        <p className="eyebrow">Route Node</p>
                        <h2>{step.title}</h2>
                      </div>
                      <div className="path-step-chapters">
                        {stepChapters.map((chapter) => (
                          <Link href={`/one-hundred-years/chapters/${chapter.slug}`} key={chapter.id}>
                            第 {chapter.order} 章
                          </Link>
                        ))}
                      </div>
                    </div>

                    <p className="path-step-interpretation">{step.interpretation}</p>

                    <div className="path-step-events">
                      {stepEvents.map((event) => (
                        <Link href={`/timeline?event=${event.id}`} key={event.id}>
                          <strong>{event.title}</strong>
                          <span>{event.summary}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="path-step-meta-grid">
                      <section>
                        <h3>
                          <UserRound size={15} />
                          人物
                        </h3>
                        <div className="path-chip-list">
                          {stepCharacters.map((character) => (
                            <Link href={`/characters/${character.id}`} key={character.id}>
                              {character.canonicalName}
                            </Link>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h3>
                          <MapPinned size={15} />
                          地点
                        </h3>
                        <div className="path-chip-list">
                          {stepLocations.map((location) => (
                            <Link href={`/map?location=${location.id}`} key={location.id}>
                              {location.name}
                            </Link>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h3>
                          <Sparkles size={15} />
                          意象
                        </h3>
                        <div className="path-chip-list">
                          {stepMotifs.map((motif) => (
                            <Link href={`/motifs/${motif.id}`} key={motif.id}>
                              {motif.name}
                            </Link>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="card-actions">
                      <Link className="button compact-button" href={getStepChapterHref(step, stepChapters)}>
                        <BookOpen size={15} />
                        章节轨道
                      </Link>
                      <Link className="ghost-button compact-button" href={getStepTimelineHref(step, stepChapters)}>
                        <Clock3 size={15} />
                        时间坐标
                      </Link>
                      {stepLocations[0] ? (
                        <Link className="ghost-button compact-button" href={`/map?location=${stepLocations[0].id}`}>
                          <MapPinned size={15} />
                          地点线索
                        </Link>
                      ) : null}
                      {stepEvidenceCards[0] ? (
                        <Link className="ghost-button compact-button" href={`/evidence/${stepEvidenceCards[0].id}`}>
                          <Quote size={15} />
                          证据卡
                        </Link>
                      ) : null}
                    </div>

                    <EvidenceCardList cards={stepEvidenceCards} compact title="文本证据" />
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <aside className="path-side-stack">
          <section className="path-side-panel">
            <h2>
              <BookOpen size={17} />
              章节轨道
            </h2>
            <div className="path-chapter-rail">
              {pathChapters.map((chapter) => (
                <Link href={`/one-hundred-years/chapters/${chapter.slug}`} key={chapter.id}>
                  <strong>{chapter.order}</strong>
                  <span>{chapter.title}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="path-side-panel">
            <h2>
              <Quote size={17} />
              文本证据
            </h2>
            <div className="path-link-list compact">
              {pathEvidenceCards.map((card) => (
                <Link href={`/evidence/${card.id}`} key={card.id}>
                  <strong>{card.title}</strong>
                  <span>{card.quote.sourceNote}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="path-side-panel">
            <h2>
              <MapPinned size={17} />
              地点线索
            </h2>
            <div className="path-link-list">
              {pathLocations.map((location) => (
                <Link href={`/map?location=${location.id}`} key={location.id}>
                  <strong>{location.name}</strong>
                  <span>{location.summary}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="path-side-panel">
            <h2>
              <Sparkles size={17} />
              意象解释
            </h2>
            {coverMotif ? (
              <div className="path-cover-motif">
                <strong>{coverMotif.name}</strong>
                <span>{coverMotif.summary}</span>
              </div>
            ) : null}
            <div className="path-chip-list">
              {pathMotifs.map((motif) => (
                <Link href={`/motifs/${motif.id}`} key={motif.id}>
                  {motif.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="path-side-panel">
            <h2>
              <UserRound size={17} />
              人物回声
            </h2>
            <div className="path-link-list compact">
              {pathCharacters.slice(0, 8).map((character) => (
                <Link href={`/characters/${character.id}`} key={character.id}>
                  <strong>{character.canonicalName}</strong>
                  <span>{character.lonelinessType}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
