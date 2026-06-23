import { Network } from "lucide-react";
import { CharactersExplorer } from "@/app/characters/characters-explorer";
import { characters, events, motifs, relations } from "@/lib/data/static";
import { buildFamilyTreeModel } from "@/lib/graph/family-tree";

export default function CharactersPage() {
  const familyTree = buildFamilyTreeModel({ characters, events, motifs, relations });

  return (
    <div className="page">
      <p className="eyebrow">Family Atlas</p>
      <h1 className="hero-title">家族图谱</h1>
      <p className="lead">
        重复的名字像回声穿过代际。这里按血脉、伴侣、命运和意象展开，让每一位布恩迪亚都拥有清晰坐标。
      </p>

      <CharactersExplorer model={familyTree} />

      <section className="section rain-band">
        <Network size={34} />
        <div>
          <h2>关系先清楚，图谱才有意义</h2>
          <p>父母、伴侣、子女、意象和事件彼此牵引；命运不是直线，而是一张逐渐收紧的网。</p>
        </div>
      </section>
    </div>
  );
}
