import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText, Quote, Route, Search, Sparkles, UserRound } from "lucide-react";
import { EntityLinks } from "@/components/EntityLinks";
import { EvidenceCardList } from "@/components/EvidenceCardList";
import {
  getCharactersByIds,
  getChaptersByIds,
  getEvidenceCardsByIds,
  getMotifsByIds,
  getResearchArticleBySlug,
  readingPaths,
  researchArticles
} from "@/lib/data/static";

export function generateStaticParams() {
  return researchArticles.map((article) => ({ slug: article.slug }));
}

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getResearchArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const articleEvidenceCards = getEvidenceCardsByIds(article.evidenceCardIds);
  const relatedPaths = readingPaths.filter((path) => article.pathIds.includes(path.id));
  const relatedChapters = getChaptersByIds(article.chapterIds);
  const relatedCharacters = getCharactersByIds(article.characterIds);
  const relatedMotifs = getMotifsByIds(article.motifIds);
  const firstPath = relatedPaths[0];
  const firstEvidenceCard = articleEvidenceCards[0];

  return (
    <div className="page">
      <Link className="ghost-button" href="/archive">返回研究档案</Link>
      <p className="eyebrow">Research File</p>
      <h1 className="hero-title">{article.title}</h1>
      <p className="lead">{article.summary}</p>

      <div className="toolbar">
        <Link className="button" href={`/search?type=article&q=${encodeURIComponent(article.tags[0] ?? article.title)}`}>
          <Search size={18} />
          搜索专题
        </Link>
        {firstPath ? (
          <Link className="ghost-button" href={`/paths/${firstPath.slug}`}>
            <Route size={18} />
            相关路径
          </Link>
        ) : null}
        {firstEvidenceCard ? (
          <Link className="ghost-button" href={`/evidence/${firstEvidenceCard.id}`}>
            <Quote size={18} />
            第一张证据
          </Link>
        ) : null}
      </div>

      <section className="article-thesis-panel">
        <FileText size={24} />
        <div>
          <strong>{article.subtitle}</strong>
          <p>{article.thesis}</p>
        </div>
      </section>

      <section className="article-stat-strip" aria-label={`${article.title} 数据概览`}>
        <span>
          <strong>{article.sections.length}</strong>
          论证段落
        </span>
        <span>
          <strong>{articleEvidenceCards.length}</strong>
          证据卡
        </span>
        <span>
          <strong>{relatedChapters.length}</strong>
          章节
        </span>
        <span>
          <strong>{relatedMotifs.length}</strong>
          意象
        </span>
      </section>

      <div className="research-article-layout section">
        <article className="research-article-surface">
          <div className="surface-title">
            <FileText size={18} />
            长线论证
            <small>{article.sections.length} 节按主题推进</small>
          </div>

          <div className="research-section-stack">
            {article.sections.map((section, index) => {
              const sectionEvidenceCards = getEvidenceCardsByIds(section.evidenceCardIds);
              return (
                <section className="research-section-card" id={section.id} key={section.id}>
                  <div className="research-section-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="research-section-body">
                    <h2>{section.title}</h2>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <EvidenceCardList cards={sectionEvidenceCards} compact title="本节证据" />
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <aside className="article-side-stack">
          <EntityLinks
            title="关联路径"
            items={relatedPaths.map((path) => ({
              href: `/paths/${path.slug}`,
              label: path.title,
              description: path.summary
            }))}
          />
          <EntityLinks
            title="全文证据卡"
            items={articleEvidenceCards.map((card) => ({
              href: `/evidence/${card.id}`,
              label: card.title,
              description: card.quote.sourceNote
            }))}
          />
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
            items={relatedCharacters.slice(0, 10).map((character) => ({
              href: `/characters/${character.id}`,
              label: character.canonicalName,
              description: character.lonelinessType
            }))}
          />
          <section className="panel article-jump-panel">
            <h3>快速探索</h3>
            <div className="card-actions">
              {relatedChapters[0] ? (
                <Link className="ghost-button compact-button" href={`/one-hundred-years/chapters/${relatedChapters[0].slug}`}>
                  <BookOpen size={15} />
                  章节
                </Link>
              ) : null}
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
            </div>
          </section>
          <EntityLinks
            title="关联意象"
            items={relatedMotifs.map((motif) => ({
              href: `/motifs/${motif.id}`,
              label: motif.name,
              description: motif.symbolicLayers.join(" / ")
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
