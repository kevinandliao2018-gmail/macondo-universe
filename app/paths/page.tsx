import Link from "next/link";
import { ArrowRight, BookOpen, Route, Sparkles, Waypoints } from "lucide-react";
import { getChaptersByIds, getMotif, readingPaths } from "@/lib/data/static";
import type { ReadingPath } from "@/lib/domain/schemas";

function getUniquePathIds(path: ReadingPath, key: "chapterIds" | "eventIds" | "characterIds" | "locationIds" | "motifIds") {
  return [...new Set(path.steps.flatMap((step) => step[key]))];
}

function getChapterRange(path: ReadingPath) {
  const chapters = getChaptersByIds(getUniquePathIds(path, "chapterIds"));
  if (chapters.length === 0) {
    return "章节未标注";
  }

  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  return first.id === last.id ? `第 ${first.order} 章` : `第 ${first.order}-${last.order} 章`;
}

export default function ReadingPathsPage() {
  return (
    <div className="page">
      <p className="eyebrow">Fate Routes</p>
      <h1 className="hero-title">命运路径</h1>
      <p className="lead">
        四条可跟随的阅读路线，把人物、事件、章节、意象和地点串成马孔多内部的命运轨道。
        现在不只查一个点，也可以沿着一条线读完整座城镇。
      </p>
      <div className="toolbar">
        <Link className="button" href="/search?type=path">
          <Route size={18} />
          搜索路径
        </Link>
        <Link className="ghost-button" href="/timeline">
          <Waypoints size={18} />
          时间迷宫
        </Link>
      </div>

      <section className="reading-paths-grid section" aria-label="命运路径列表">
        {readingPaths.map((path) => {
          const motif = getMotif(path.coverMotifId);
          const chapterCount = getUniquePathIds(path, "chapterIds").length;
          const eventCount = getUniquePathIds(path, "eventIds").length;
          const locationCount = getUniquePathIds(path, "locationIds").length;

          return (
            <Link className="card reading-path-card" href={`/paths/${path.slug}`} key={path.id}>
              <div className="reading-path-card-topline">
                <span>
                  <Route size={15} />
                  {getChapterRange(path)}
                </span>
                <span>{path.steps.length} 节点</span>
              </div>
              <h2>{path.title}</h2>
              <p>{path.summary}</p>
              <blockquote>{path.thesis}</blockquote>

              <div className="reading-path-metrics" aria-label={`${path.title} 关联数据`}>
                <span>
                  <strong>{chapterCount}</strong>
                  章节
                </span>
                <span>
                  <strong>{eventCount}</strong>
                  事件
                </span>
                <span>
                  <strong>{locationCount}</strong>
                  地点
                </span>
              </div>

              <div className="tag-row">
                <span className="tag">
                  <Sparkles size={13} />
                  {motif?.name ?? "核心意象"}
                </span>
                {path.tags.slice(0, 3).map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="card-actions">
                <span className="button compact-button">
                  进入路径
                  <ArrowRight size={15} />
                </span>
                <span className="ghost-button compact-button">
                  <BookOpen size={15} />
                  章节轨道
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
