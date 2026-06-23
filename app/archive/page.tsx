import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Quote, Route, Search, Tags } from "lucide-react";
import { getChaptersByIds, researchArticles } from "@/lib/data/static";
import type { ResearchArticle } from "@/lib/domain/schemas";

function getChapterRange(article: ResearchArticle) {
  const chapters = getChaptersByIds(article.chapterIds);
  if (chapters.length === 0) {
    return "章节未标注";
  }

  const orders = chapters.map((chapter) => chapter.order);
  return `第 ${Math.min(...orders)}-${Math.max(...orders)} 章`;
}

export default function ResearchArchivePage() {
  return (
    <div className="page">
      <p className="eyebrow">Research Archive</p>
      <h1 className="hero-title">研究档案</h1>
      <p className="lead">
        证据卡把判断钉回文本，研究档案把这些点状证据组织成可以连续阅读的长线论证。
        从神话结构、时间循环、意象系统、比较文学和拉美文学语境进入，沿着证据重新读马孔多的结构。
      </p>
      <div className="toolbar">
        <Link className="button" href="/search?type=article">
          <Search size={18} />
          搜索专题
        </Link>
        <Link className="ghost-button" href="/paths">
          <Route size={18} />
          命运路径
        </Link>
      </div>

      <section className="research-archive-grid section" aria-label="研究档案列表">
        {researchArticles.map((article) => (
          <Link className="card research-article-card" href={`/archive/${article.slug}`} key={article.id}>
            <div className="research-card-topline">
              <span>
                <FileText size={15} />
                {getChapterRange(article)}
              </span>
              <span>{article.sections.length} 节</span>
            </div>

            <h2>{article.title}</h2>
            <strong className="research-card-subtitle">{article.subtitle}</strong>
            <p>{article.summary}</p>
            <blockquote>{article.thesis}</blockquote>

            <div className="research-article-metrics" aria-label={`${article.title} 关联数据`}>
              <span>
                <strong>{article.evidenceCardIds.length}</strong>
                证据卡
              </span>
              <span>
                <strong>{article.pathIds.length}</strong>
                路径
              </span>
              <span>
                <strong>{article.chapterIds.length}</strong>
                章节
              </span>
            </div>

            <div className="tag-row">
              <span className="tag">
                <Tags size={13} />
                专题
              </span>
              {article.tags.slice(0, 4).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="card-actions">
              <span className="button compact-button">
                阅读全文
                <ArrowRight size={15} />
              </span>
              <span className="ghost-button compact-button">
                <Quote size={15} />
                文本证据
              </span>
              <span className="ghost-button compact-button">
                <BookOpen size={15} />
                章节轨道
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
