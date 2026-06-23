import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, FileText, LibraryBig, MapPinned, Network, Route, Search, Sparkles, Waves } from "lucide-react";
import { chapters, characters, events, locations, motifs, readingPaths, researchArticles, works } from "@/lib/data/static";

const entryPoints = [
  {
    href: "/characters",
    title: "家族图谱",
    description: "从七代布恩迪亚家族进入，区分重复姓名与循环命运。",
    icon: Network,
    stat: `${characters.length} 位人物`
  },
  {
    href: "/one-hundred-years",
    title: "百年孤独",
    description: "按二十章梳理故事、人物、事件、意象和主题。",
    icon: BookOpen,
    stat: `${chapters.length} 章`
  },
  {
    href: "/works",
    title: "文学宇宙",
    description: "把马孔多出现、近场小镇、创作史线索和后期互文拆成作品谱系。",
    icon: LibraryBig,
    stat: `${works.length} 部作品`
  },
  {
    href: "/motifs",
    title: "意象图鉴",
    description: "从冰块、雨、黄蝴蝶、小金鱼和羊皮卷反向进入文本。",
    icon: Sparkles,
    stat: `${motifs.length} 个意象`
  },
  {
    href: "/paths",
    title: "命运路径",
    description: "把人物、事件、章节、意象和地点串成可跟随的主题路线。",
    icon: Route,
    stat: `${readingPaths.length} 条路径`
  },
  {
    href: "/archive",
    title: "研究档案",
    description: "把证据卡组织成完整专题，阅读马孔多内部的长线论证。",
    icon: FileText,
    stat: `${researchArticles.length} 篇专题`
  },
  {
    href: "/timeline",
    title: "时间迷宫",
    description: "把马孔多百年的故事事件排成可追踪的时间线。",
    icon: Clock3,
    stat: `${events.length} 个事件`
  },
  {
    href: "/map",
    title: "马孔多地图",
    description: "从宅邸、栗树、车站和香蕉公司进入空间叙事。",
    icon: MapPinned,
    stat: `${locations.length} 个地点`
  }
];

const orbitNodes = [
  { label: "冰块", href: "/motifs/motif_ice", className: "orbit-node node-a" },
  { label: "雨", href: "/motifs/motif_rain", className: "orbit-node node-b" },
  { label: "羊皮卷", href: "/motifs/motif_parchments", className: "orbit-node node-c" },
  { label: "黄蝴蝶", href: "/motifs/motif_yellow_butterflies", className: "orbit-node node-d" },
  { label: "布恩迪亚宅邸", href: "/map?location=location_buendia_house", className: "orbit-node node-e" }
];

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Black Gold Codex / Macondo Knowledge Atlas</p>
          <h1 className="hero-title">马孔多宇宙</h1>
          <p className="lead">
            一座被雨水显影的文学星图。家族、章节、意象、时间和空间在黑金羊皮卷上彼此照亮，
            每一次点击都像翻开梅尔基亚德斯房间里尚未冷却的一页。
          </p>
          <div className="archive-stats" aria-label="马孔多宇宙数据概览">
            <span><strong>{characters.length}</strong>人物</span>
            <span><strong>{chapters.length}</strong>章节</span>
            <span><strong>{motifs.length}</strong>意象</span>
            <span><strong>{readingPaths.length}</strong>路径</span>
            <span><strong>{works.length}</strong>作品</span>
            <span><strong>{researchArticles.length}</strong>专题</span>
            <span><strong>{events.length}</strong>事件</span>
            <span><strong>{locations.length}</strong>地点</span>
          </div>
          <div className="hero-actions">
            <Link className="button" href="/characters">
              <Network size={18} />
              进入家族图谱
            </Link>
            <Link className="ghost-button" href="/search">
              <Search size={18} />
              搜索马孔多
            </Link>
          </div>
        </div>

        <div className="universe-map" aria-label="马孔多宇宙入口星图">
          <div className="map-grain" aria-hidden="true" />
          <div className="map-crosshair" aria-hidden="true" />
          <span className="map-label label-north">MELQUIADES ROOM</span>
          <span className="map-label label-south">BANANA STATION</span>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <Link className="core-node" href="/one-hundred-years">
            <span>《百年孤独》</span>
            <small>核心文本</small>
          </Link>
          {orbitNodes.map((node) => (
            <Link href={node.href} className={node.className} key={node.href}>
              {node.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>八个入口</h2>
          <p>从血脉、文本、作品谱系、象征、命运路径、研究档案、时间和空间进入同一座城镇；每条路径都会回到马孔多深处。</p>
        </div>
        <div className="grid">
          {entryPoints.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="card entry-card" href={item.href} key={item.href}>
                <span className="entry-icon">
                  <Icon size={22} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="meta-row">
                  <span className="meta-pill">{item.stat}</span>
                  <span className="meta-pill">进入 <ArrowRight size={13} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section rain-band">
        <div>
          <p className="eyebrow">Aguacero Archive</p>
          <h2>马孔多在下雨</h2>
          <p>
            那句电报不是天气报告，而是一条被雨水打湿的求救线。沿着它进入，
            你会看见战争、遗忘和香蕉公司之后漫长的潮湿回声。
          </p>
        </div>
        <span className="rain-index">4Y / 11M / 2D</span>
        <Link className="button" href="/experiences/macondo-rain">
          <Waves size={18} />
          进入雨中
        </Link>
      </section>
    </div>
  );
}
