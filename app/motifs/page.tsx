import { Suspense } from "react";
import { MotifConstellationExplorer } from "@/app/motifs/motif-constellation-explorer";
import { chapters, characters, events, locations, motifs } from "@/lib/data/static";

export default function MotifsPage() {
  return (
    <div className="page">
      <p className="eyebrow">Motif Atlas</p>
      <h1 className="hero-title">意象图鉴</h1>
      <p className="lead">
        从物件、自然和空间进入马孔多。每个意象都连接人物、章节和事件，而不是停留在孤立解释。
      </p>

      <Suspense fallback={<div className="panel motif-constellation-loading">意象星图正在显影...</div>}>
        <MotifConstellationExplorer
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
