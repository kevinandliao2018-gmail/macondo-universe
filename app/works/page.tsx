import Link from "next/link";
import { BookOpen, Compass, FileText, Network, Search, Sparkles, Tags } from "lucide-react";
import { works } from "@/lib/data/static";
import type { Work } from "@/lib/domain/schemas";

type WorkLayer = NonNullable<Work["macondoLayer"]>;

const layerOrder: WorkLayer[] = ["core", "nearby", "genesis", "echo"];

const layerMeta: Record<WorkLayer, {
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Sparkles;
}> = {
  core: {
    title: "核心出现",
    eyebrow: "Macondo Proper",
    description: "作品明确以马孔多为场景，或题名直接出现马孔多，是文学宇宙的地基。",
    icon: Sparkles
  },
  nearby: {
    title: "近场关联",
    eyebrow: "Adjacent Towns",
    description: "与马孔多共享人物、时代和热带小镇结构，但不把地点草率等同为马孔多。",
    icon: Compass
  },
  genesis: {
    title: "创作史线索",
    eyebrow: "Genesis Notes",
    description: "房子、上校、雨、香蕉公司和死者在这些材料中先后显影，马孔多由此慢慢凝结。",
    icon: FileText
  },
  echo: {
    title: "主题互文",
    eyebrow: "Later Echoes",
    description: "不列作马孔多场景，却能与孤独、权力、爱情、疾病和历史循环互相照亮。",
    icon: Network
  }
};

const typeLabels: Record<Work["type"], string> = {
  novel: "长篇",
  novella: "中篇",
  short_story: "短篇",
  nonfiction: "非虚构",
  interview: "访谈",
  draft: "草稿"
};

function getWorksByLayer(layer: WorkLayer) {
  return works
    .filter((work) => work.macondoLayer === layer)
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}

export default function WorksPage() {
  const groupedWorks = layerOrder.map((layer) => ({
    layer,
    meta: layerMeta[layer],
    items: getWorksByLayer(layer)
  }));

  return (
    <div className="page">
      <section className="works-hero">
        <div>
          <p className="eyebrow">Macondo Bibliographic Constellation</p>
          <h1 className="hero-title">文学宇宙</h1>
          <p className="lead">
            这不是一张简单书单，而是一份从马孔多向外展开的作品谱系：哪些文本真正发生在马孔多，
            哪些只是共享同一座热带小镇的气候，哪些又在后来的爱情、权力和历史书写里回响。
          </p>
          <div className="toolbar">
            <Link className="button" href="/search?type=work">
              <Search size={18} />
              搜索作品
            </Link>
            <Link className="ghost-button" href="/one-hundred-years">
              <BookOpen size={18} />
              回到《百年孤独》
            </Link>
          </div>
        </div>

        <div className="works-hero-panel panel" aria-label="作品谱系统计">
          <span className="works-panel-mark">M</span>
          <h2>作品进入马孔多的四种方式</h2>
          <p>
            核心层负责“发生在哪里”，近场层负责“像哪座镇”，创作史层负责“它怎样长出来”，
            互文层负责“它后来如何回响”。
          </p>
          <div className="works-layer-stats">
            {groupedWorks.map(({ layer, meta, items }) => (
              <a className="works-layer-stat" href={`#${layer}`} key={layer}>
                <strong>{items.length}</strong>
                <span>{meta.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section works-layer-grid" aria-label="作品谱系分层总览">
        {groupedWorks.map(({ layer, meta, items }) => {
          const Icon = meta.icon;
          return (
            <a className={`works-layer-card works-layer-card-${layer}`} href={`#${layer}`} key={layer}>
              <span className="entry-icon">
                <Icon size={22} />
              </span>
              <p className="eyebrow">{meta.eyebrow}</p>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
              <span className="meta-pill">{items.length} 部作品</span>
            </a>
          );
        })}
      </section>

      {groupedWorks.map(({ layer, meta, items }) => (
        <section className="section" id={layer} key={layer}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{meta.eyebrow}</p>
              <h2>{meta.title}</h2>
            </div>
            <p>{meta.description}</p>
          </div>

          <div className="works-grid">
            {items.map((work) => (
              <article className="card work-card" id={work.id} key={work.id}>
                <div className="work-card-topline">
                  <span>{work.year ?? "年代待核"}</span>
                  <span>{typeLabels[work.type]}</span>
                </div>
                <h3>{work.title}</h3>
                {work.originalTitle ? (
                  <strong className="work-original-title">{work.originalTitle}</strong>
                ) : null}
                <p>{work.summary}</p>

                <div className="work-relation">
                  <span>{work.relationLabel ?? "谱系关系"}</span>
                  <p>{work.relationSummary ?? "这部作品与马孔多宇宙存在主题或结构关联。"}</p>
                </div>

                <div className="tag-row">
                  {work.tags.slice(0, 5).map((tag) => (
                    <span className="tag" key={tag}>
                      <Tags size={13} />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="card-actions">
                  <Link className="ghost-button compact-button" href={`/search?q=${encodeURIComponent(work.title)}&type=work`}>
                    <Search size={15} />
                    搜索线索
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
