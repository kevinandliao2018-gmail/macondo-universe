import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceCardList } from "@/components/EvidenceCardList";
import { EntityLinks } from "@/components/EntityLinks";
import { TimelineBeatList } from "@/components/TimelineBeatList";
import {
  chapters,
  characters,
  evidenceCards as allEvidenceCards,
  events,
  getCharacter,
  getChaptersByIds,
  getEvidenceCardsByEntityId,
  getEventsByIds,
  getMotifsByIds,
  getRelatedReadingPaths,
  getRelatedCharacters,
  getTimelineBeatsByEntityId,
  locations,
  motifs,
  readingPaths,
  researchArticles
} from "@/lib/data/static";

export function generateStaticParams() {
  return characters.map((character) => ({ id: character.id }));
}

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) {
    notFound();
  }

  const relatedCharacters = getRelatedCharacters(character.id);
  const firstChapter = character.firstAppearanceChapterId
    ? getChaptersByIds([character.firstAppearanceChapterId])
    : [];
  const keyEvents = getEventsByIds(character.keyEventIds);
  const relatedMotifs = getMotifsByIds(character.relatedMotifIds);
  const relatedPaths = getRelatedReadingPaths(character.id);
  const evidenceCards = getEvidenceCardsByEntityId(character.id);
  const relatedBeats = getTimelineBeatsByEntityId(character.id);

  return (
    <div className="page">
      <Link className="ghost-button" href="/characters">返回人物列表</Link>
      <p className="eyebrow">Character File</p>
      <h1 className="hero-title">{character.canonicalName}</h1>
      <p className="lead">{character.shortDescription}</p>

      <div className="detail-layout section">
        <article className="panel">
          <h2>人物档案</h2>
          <dl className="fact-list">
            <div>
              <dt>代际</dt>
              <dd>第 {character.generation ?? "未知"} 代</dd>
            </div>
            <div>
              <dt>孤独类型</dt>
              <dd>{character.lonelinessType}</dd>
            </div>
            <div>
              <dt>命运结局</dt>
              <dd>{character.fate}</dd>
            </div>
            <div>
              <dt>别名</dt>
              <dd>{character.aliases.length > 0 ? character.aliases.join(" / ") : "无"}</dd>
            </div>
          </dl>

          <h2>关键事件</h2>
          <div className="timeline">
            {keyEvents.map((event) => (
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
            description="把关键事件之间的细部行动、场景与象征线索串成可回访的命运轨迹。"
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
            title="轻量关系"
            items={relatedCharacters.map((item) => ({
              href: `/characters/${item.id}`,
              label: item.canonicalName,
              description: item.lonelinessType
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
            title="相关路径"
            items={relatedPaths.map((path) => ({
              href: `/paths/${path.slug}`,
              label: path.title,
              description: path.summary
            }))}
          />
          <EntityLinks
            title="首次出现"
            items={firstChapter.map((chapter) => ({
              href: `/one-hundred-years/chapters/${chapter.slug}`,
              label: chapter.title,
              description: chapter.summary
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
