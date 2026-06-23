import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Search } from "lucide-react";
import { MacondoMapExplorer } from "@/app/map/macondo-map-explorer";
import {
  chapters,
  characters,
  evidenceCards,
  events,
  locations,
  motifs,
  readingPaths,
  researchArticles,
  timelineBeats
} from "@/lib/data/static";

export default function MapPage() {
  return (
    <div className="page">
      <p className="eyebrow">Spatial Archive</p>
      <h1 className="hero-title">马孔多地图</h1>
      <p className="lead">
        {locations.length} 个地点把家族、战争、香蕉公司和雨水固定在空间坐标上。沿着宅邸、栗树、车站与河岸，
        从<span className="map-hero-quote">“那里发生了什么”</span>进入马孔多。
      </p>
      <div className="toolbar">
        <Link className="button" href="/search?q=%E8%BD%A6%E7%AB%99">
          <Search size={18} />
          搜索地点
        </Link>
        <Link className="ghost-button" href="/one-hundred-years">
          <BookOpen size={18} />
          章节地图
        </Link>
      </div>

      <Suspense fallback={<div className="panel macondo-map-loading">空间档案正在显影...</div>}>
        <MacondoMapExplorer
          chapters={chapters}
          characters={characters}
          evidenceCards={evidenceCards}
          events={events}
          locations={locations}
          motifs={motifs}
          readingPaths={readingPaths}
          researchArticles={researchArticles}
          timelineBeats={timelineBeats}
        />
      </Suspense>
    </div>
  );
}
