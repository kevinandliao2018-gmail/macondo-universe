import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, HelpCircle, Lightbulb, ScrollText } from "lucide-react";
import { EvidenceCardList } from "@/components/EvidenceCardList";
import { EntityLinks } from "@/components/EntityLinks";
import { TimelineBeatList } from "@/components/TimelineBeatList";
import {
  characters,
  chapters,
  evidenceCards as allEvidenceCards,
  events,
  getCharactersByIds,
  getChapterBySlug,
  getEvidenceCardsByChapterId,
  getEventsByIds,
  getLocationsByIds,
  getMotifsByIds,
  getRelatedReadingPaths,
  getTimelineBeatsByChapterId,
  locations,
  motifs,
  readingPaths,
  researchArticles
} from "@/lib/data/static";
import type { Chapter } from "@/lib/domain/schemas";

export function generateStaticParams() {
  return chapters.map((chapter) => ({ slug: chapter.slug }));
}

function ChapterFocusLinks({ focusPoint }: { focusPoint: Chapter["readingGuide"]["focusPoints"][number] }) {
  const focusEvents = getEventsByIds(focusPoint.eventIds);
  const focusCharacters = getCharactersByIds(focusPoint.characterIds);
  const focusMotifs = getMotifsByIds(focusPoint.motifIds);
  const focusLocations = getLocationsByIds(focusPoint.locationIds);
  const links = [
    ...focusEvents.map((event) => ({ href: `/timeline?event=${event.id}`, label: event.title })),
    ...focusCharacters.map((character) => ({ href: `/characters/${character.id}`, label: character.canonicalName })),
    ...focusMotifs.map((motif) => ({ href: `/motifs/${motif.id}`, label: motif.name })),
    ...focusLocations.map((location) => ({ href: `/map?location=${location.id}`, label: location.name }))
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

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = getChapterBySlug(slug);
  if (!chapter) {
    notFound();
  }

  const chapterEvents = getEventsByIds(chapter.eventIds);
  const chapterCharacters = getCharactersByIds(chapter.characterIds);
  const chapterLocationIds = new Set([
    ...chapterEvents.flatMap((event) => event.locationIds),
    ...locations
      .filter((location) => location.chapterIds.includes(chapter.id))
      .map((location) => location.id)
  ]);
  const chapterLocations = getLocationsByIds([...chapterLocationIds]);
  const chapterMotifs = getMotifsByIds(chapter.motifIds);
  const relatedPaths = getRelatedReadingPaths(chapter.id);
  const evidenceCards = getEvidenceCardsByChapterId(chapter.id);
  const chapterBeats = getTimelineBeatsByChapterId(chapter.id);

  return (
    <div className="page">
      <Link className="ghost-button" href="/one-hundred-years">返回章节列表</Link>
      <p className="eyebrow">Chapter {chapter.order}</p>
      <h1 className="hero-title">{chapter.title}</h1>
      <p className="lead">{chapter.summary}</p>

      <div className="detail-layout section">
        <article className="panel">
          <section className="chapter-detail-guide" aria-labelledby="chapter-detail-guide-title">
            <div className="chapter-detail-guide-heading">
              <p className="eyebrow">Reading Guide</p>
              <h2 id="chapter-detail-guide-title">本章导读</h2>
            </div>

            <div className="chapter-guide-insight">
              <div>
                <Compass size={16} />
                <span>核心导读</span>
              </div>
              <p>{chapter.readingGuide.thesis}</p>
              <small>{chapter.readingGuide.entryPoint}</small>
            </div>

            <div className="chapter-detail-guide-grid">
              {chapter.readingGuide.focusPoints.map((focusPoint) => (
                <article className="chapter-guide-focus-card" key={focusPoint.title}>
                  <div className="chapter-detail-focus-heading">
                    <Lightbulb size={15} />
                    <strong>{focusPoint.title}</strong>
                  </div>
                  <p>{focusPoint.summary}</p>
                  <ChapterFocusLinks focusPoint={focusPoint} />
                </article>
              ))}
            </div>

            <div className="chapter-detail-guide-footer">
              <div className="chapter-guide-spotlight">
                <div className="chapter-detail-focus-heading">
                  <ScrollText size={15} />
                  <strong>{chapter.readingGuide.spotlight.title}</strong>
                </div>
                <p>{chapter.readingGuide.spotlight.summary}</p>
              </div>

              <div className="chapter-guide-spotlight">
                <div className="chapter-detail-focus-heading">
                  <HelpCircle size={15} />
                  <strong>带着问题读</strong>
                </div>
                <ol className="chapter-guide-question-list">
                  {chapter.readingGuide.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <h2>本章事件</h2>
          <div className="timeline">
            {chapterEvents.map((event) => (
              <div className="timeline-item" id={event.id} key={event.id}>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
                <div className="tag-row">
                  {event.tags.map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <TimelineBeatList
            beats={chapterBeats}
            chapters={chapters}
            characters={characters}
            description="按故事顺序展开本章细部情节，补足证据卡之外的阅读坐标。"
            evidenceCards={allEvidenceCards}
            events={events}
            locations={locations}
            motifs={motifs}
            readingPaths={readingPaths}
            researchArticles={researchArticles}
            title="本章情节细读"
          />

          <EvidenceCardList cards={evidenceCards} />
        </article>

        <aside className="side-stack">
          <EntityLinks
            title="本章人物"
            items={chapterCharacters.map((character) => ({
              href: `/characters/${character.id}`,
              label: character.canonicalName,
              description: character.lonelinessType
            }))}
          />
          <EntityLinks
            title="本章地点"
            items={chapterLocations.map((location) => ({
              href: `/map?location=${location.id}`,
              label: location.name,
              description: location.summary
            }))}
          />
          <EntityLinks
            title="本章意象"
            items={chapterMotifs.map((motif) => ({
              href: `/motifs/${motif.id}`,
              label: motif.name,
              description: motif.symbolicLayers.join(" / ")
            }))}
          />
          <EntityLinks
            title="相关路径"
            items={relatedPaths.map((path) => ({
              href: `/paths/${path.slug}`,
              label: path.title,
              description: path.summary
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
