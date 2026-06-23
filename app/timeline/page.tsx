import { Suspense } from "react";
import { TimelineExplorer } from "@/app/timeline/timeline-explorer";
import {
  characters,
  chapters,
  evidenceCards,
  events,
  locations,
  motifs,
  readingPaths,
  researchArticles,
  timelineBeats,
  timelineStages
} from "@/lib/data/static";

export default function TimelinePage() {
  return (
    <div className="page">
      <p className="eyebrow">Time Labyrinth</p>
      <h1 className="hero-title">时间迷宫</h1>
      <p className="lead">
        {timelineBeats.length} 条情节与 {events.length} 个关键坐标像钉在羊皮卷上的金色刻度，从创世前的血缘恐惧延伸到被飓风抹去的最后一页。
      </p>

      <Suspense fallback={<div className="panel timeline-loading">时间坐标正在显影...</div>}>
        <TimelineExplorer
          characters={characters}
          chapters={chapters}
          evidenceCards={evidenceCards}
          events={events}
          locations={locations}
          motifs={motifs}
          readingPaths={readingPaths}
          researchArticles={researchArticles}
          timelineBeats={timelineBeats}
          timelineStages={timelineStages}
        />
      </Suspense>
    </div>
  );
}
