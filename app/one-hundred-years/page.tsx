import Link from "next/link";
import { Suspense } from "react";
import { Route, Search } from "lucide-react";
import { ChapterAtlasExplorer } from "@/app/one-hundred-years/chapter-atlas-explorer";
import { chapters, characters, events, locations, motifs } from "@/lib/data/static";

export default function OneHundredYearsPage() {
  return (
    <div className="page">
      <p className="eyebrow">Core Text</p>
      <h1 className="hero-title">百年孤独</h1>
      <p className="lead">
        二十章构成一座循环建筑：从冰块开始，以羊皮卷和飓风结束；每一章都是通向家族、意象和历史的门。
      </p>
      <div className="toolbar">
        <Link className="button" href="/search">
          <Search size={18} />
          搜索章节
        </Link>
        <Link className="ghost-button" href="/timeline">
          <Route size={18} />
          时间迷宫
        </Link>
      </div>

      <Suspense fallback={<div className="panel chapter-atlas-loading">章节地图正在展开...</div>}>
        <ChapterAtlasExplorer
          chapters={chapters}
          characters={characters}
          events={events}
          locations={locations}
          motifs={motifs}
        />
      </Suspense>
    </div>
  );
}
