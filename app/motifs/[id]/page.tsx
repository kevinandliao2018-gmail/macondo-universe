import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Leaf, MapPin, Route, Sparkles } from "lucide-react";
import { EvidenceCardList } from "@/components/EvidenceCardList";
import { EntityLinks } from "@/components/EntityLinks";
import { TimelineBeatList } from "@/components/TimelineBeatList";
import {
  chapters,
  characters,
  evidenceCards as allEvidenceCards,
  events,
  getCharactersByIds,
  getChaptersByIds,
  getEvidenceCardsByEntityId,
  getEventsByIds,
  getLocationsByIds,
  getMotif,
  getRelatedReadingPaths,
  getTimelineBeatsByEntityId,
  locations,
  motifs,
  readingPaths,
  researchArticles
} from "@/lib/data/static";
import type { Motif } from "@/lib/domain/schemas";

const motifGroupLabels: Record<Motif["motifGroup"], string> = {
  climate_sky: "气候天象",
  water_earth: "水土边界",
  animal: "动物吞噬",
  plant: "植物反攻",
  spatial_ruin: "空间废墟",
  object_text: "器物文本",
  fate_history: "命运历史"
};

export function generateStaticParams() {
  return motifs.map((motif) => ({ id: motif.id }));
}

export default async function MotifPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motif = getMotif(id);
  if (!motif) {
    notFound();
  }

  const relatedChapters = getChaptersByIds(motif.chapterIds);
  const relatedCharacters = getCharactersByIds(motif.characterIds);
  const relatedEvents = getEventsByIds(motif.eventIds);
  const relatedLocationIds = [...new Set(relatedEvents.flatMap((event) => event.locationIds))];
  const relatedLocations = getLocationsByIds(relatedLocationIds);
  const relatedPaths = getRelatedReadingPaths(motif.id);
  const evidenceCards = getEvidenceCardsByEntityId(motif.id);
  const relatedBeats = getTimelineBeatsByEntityId(motif.id);

  return (
    <div className="page">
      <Link className="ghost-button" href="/motifs">返回意象图鉴</Link>
      <p className="eyebrow">Motif File</p>
      <h1 className="hero-title">{motif.name}</h1>
      <p className="lead">{motif.summary}</p>
      <div className="motif-file-meta">
        <span>
          <Leaf size={16} />
          {motifGroupLabels[motif.motifGroup]}
        </span>
        <span>
          <MapPin size={16} />
          {relatedLocations.length} 个地点
        </span>
      </div>
      <div className="toolbar">
        <Link className="button" href={`/one-hundred-years?motif=${motif.id}`}>
          <BookOpen size={18} />
          章节地图
        </Link>
        <Link className="ghost-button" href={`/timeline?motif=${motif.id}`}>
          <Route size={18} />
          时间迷宫
        </Link>
        <Link className="ghost-button" href={`/motifs?motif=${motif.id}`}>
          <Sparkles size={18} />
          意象星图
        </Link>
      </div>

      <div className="detail-layout section">
        <article className="panel">
          <h2>象征层级</h2>
          <div className="motif-layers">
            {motif.symbolicLayers.map((layer) => (
              <span key={layer}>{layer}</span>
            ))}
          </div>

          <h2>具体显现</h2>
          <div className="motif-layers motif-appearances">
            {motif.appearances.map((appearance) => (
              <span key={appearance}>{appearance}</span>
            ))}
          </div>

          <h2>关键事件</h2>
          <div className="timeline">
            {relatedEvents.map((event) => (
              <div className="timeline-item" key={event.id}>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
              </div>
            ))}
          </div>

          <TimelineBeatList
            beats={relatedBeats}
            chapters={chapters}
            characters={characters}
            description="按故事顺序追踪这个意象在具体场景中的显影、转调与回声。"
            evidenceCards={allEvidenceCards}
            events={events}
            locations={locations}
            motifs={motifs}
            readingPaths={readingPaths}
            researchArticles={researchArticles}
          />

          <EvidenceCardList cards={evidenceCards} />
        </article>

        <aside className="side-stack">
          <EntityLinks
            title="关联章节"
            items={relatedChapters.map((chapter) => ({
              href: `/one-hundred-years/chapters/${chapter.slug}`,
              label: chapter.title,
              description: chapter.themeTags.join(" / ")
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
            title="关联地点"
            items={relatedLocations.map((location) => ({
              href: `/map?location=${location.id}`,
              label: location.name,
              description: location.summary
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
