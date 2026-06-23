"use client";

import Link from "next/link";
import {
  Bug,
  BookOpen,
  CircleHelp,
  Clock3,
  Crosshair,
  FlaskConical,
  GitBranch,
  Landmark,
  Network,
  Route,
  Rows3,
  Skull,
  Sparkles,
  UserRound,
  Wind
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  FamilyGraphProfile,
  FamilyLine,
  FamilyTreeEdge,
  FamilyTreeEdgeKind,
  FamilyTreeModel,
  FamilyTreeNode,
  FamilyTreeRelative
} from "@/lib/graph/family-tree";

type ViewMode = "tree" | "cards" | "fate";
type LineFilter = "all" | FamilyLine;
type GenerationFilter = "all" | number;
type DeathType = NonNullable<FamilyGraphProfile["deathType"]>;

const familyLineLabel: Record<FamilyLine, string> = {
  jose_arcadio: "何塞·阿尔卡蒂奥线",
  aureliano: "奥雷里亚诺线",
  ursula: "乌尔苏拉线",
  other: "外缘人物"
};

const lineFilterOptions: Array<{ value: LineFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "jose_arcadio", label: "何塞·阿尔卡蒂奥线" },
  { value: "aureliano", label: "奥雷里亚诺线" },
  { value: "ursula", label: "乌尔苏拉线" },
  { value: "other", label: "外缘人物" }
];

const edgeKindLabel: Record<FamilyTreeEdgeKind, string> = {
  parent: "血缘",
  partner: "伴侣",
  spouse: "婚姻",
  lover: "情人",
  incest: "禁忌",
  aggregate: "聚合血缘（私生子）"
};

const deathTypeConfig: Record<DeathType, { label: string; Icon: typeof Skull }> = {
  violent: { label: "暴力死亡", Icon: Skull },
  suicide: { label: "自杀", Icon: Skull },
  mystic: { label: "飞升/神秘", Icon: Sparkles },
  natural: { label: "自然死亡", Icon: Clock3 },
  gunshot: { label: "枪杀/枪声", Icon: Crosshair },
  poison: { label: "毒死", Icon: FlaskConical },
  ants: { label: "蚂蚁吞噬", Icon: Bug },
  vanishing: { label: "消失/退场", Icon: Wind },
  unknown: { label: "结局未明", Icon: CircleHelp }
};

const characterDeathTypeLabelOverrides: Record<string, string> = {
  character_prudencio_aguilar: "暴力死亡/斗鸡",
  character_jose_arcadio_buendia: "自然死亡/小黄花雨",
  character_jose_arcadio_son: "神秘/被暗杀",
  character_aureliano_buendia_colonel: "自然死亡/马戏团",
  character_jose_arcadio_segundo: "自然死亡/历史真相",
  character_aureliano_segundo: "自然死亡/喉咙肿瘤",
  character_fernanda: "自然死亡/子宫",
  character_jose_arcadio_seminarian: "暴力死亡/溺死",
  character_mauricio_babilonia: "枪杀/偷鸡贼",
  character_meme: "消失/克拉科夫/黄蝴蝶",
  character_santa_sofia: "消失/离开马孔多",
  character_arcadio: "行刑队/枪决",
  character_amaranta_ursula: "产后流血而死",
  character_gaston: "退场/离开马孔多",
  character_nigromanta: "被飓风抹去",
  character_little_aureliano: "被飓风抹去",
  character_ursula: "自然死亡/飞鸟",
  character_melquiades: "神秘/河湾里"
};

const fateGroups = [
  {
    key: "jose_arcadio",
    title: "何塞·阿尔卡蒂奥系",
    description: "身体、冲动、行动和暴力构成的火线。",
    match: (node: FamilyTreeNode) => node.graphProfile?.graphTags.includes("何塞·阿尔卡蒂奥系")
  },
  {
    key: "aureliano",
    title: "奥雷里亚诺·布恩迪亚系",
    description: "沉默、预感、战争和破译构成的冰线。",
    match: (node: FamilyTreeNode) => node.graphProfile?.graphTags.includes("奥雷里亚诺·布恩迪亚系")
  },
  {
    key: "women",
    title: "女性支柱",
    description: "劳作、记忆、纯真、沉默和复兴失败托住宅邸内部。",
    match: (node: FamilyTreeNode) =>
      Boolean(node.graphProfile?.graphTags.some((tag) => ["女性支柱", "纯真变体", "乌尔苏拉线"].includes(tag)))
  },
  {
    key: "witness",
    title: "外缘见证者",
    description: "镇长、亡魂、情人、战友和预言者从侧面解释家族。",
    match: (node: FamilyTreeNode) =>
      Boolean(node.graphProfile?.graphTags.some((tag) => ["外缘见证者", "外缘人物", "政治秩序"].includes(tag)))
  },
  {
    key: "ending",
    title: "终结节点",
    description: "禁忌、预言、蚂蚁和飓风把七代循环收束。",
    match: (node: FamilyTreeNode) =>
      Boolean(node.graphProfile?.graphTags.some((tag) => ["终结", "第七代", "血缘诅咒"].includes(tag)))
  }
];

const treeMinWidth = 1180;
const nodeMinWidth = 214;
const nodeMaxWidth = 330;
const nodeWidthOverrides: Record<string, number> = {
  character_meme: 280
};
const nodeHeight = 100;
const nodeGap = 64;
const rowHeight = 188;
const topPadding = 62;
const sidePadding = 160;
const lateralEdgeKinds: FamilyTreeEdgeKind[] = ["partner", "spouse", "lover", "incest"];
const labeledEdgeKinds = new Set<FamilyTreeEdgeKind>(["partner", "spouse", "lover", "incest", "aggregate"]);
const aggregateLabelOffsetX = 72;
const specialEdgeLabels: Record<string, string> = {
  "edge-parent-character_jose_arcadio_buendia-character_rebeca": "养女",
  "edge-parent-character_jose_arcadio_buendia-character_jose_arcadio_son": "长子",
  relation_jose_arcadio_buendia_parent_colonel: "次子",
  "edge-parent-character_jose_arcadio_buendia-character_amaranta": "小女儿",
  "edge-parent-character_jose_arcadio_son-character_arcadio": "私生子",
  "edge-parent-character_aureliano_buendia_colonel-character_aureliano_jose": "私生子",
  "edge-parent-character_arcadio-character_remedios_the_beauty": "长女",
  relation_arcadio_parent_twins: "双胞胎",
  relation_arcadio_parent_aureliano_segundo: "双胞胎",
  relation_aureliano_segundo_parent_jose_arcadio_seminarian: "长子",
  "edge-parent-character_aureliano_segundo-character_meme": "长女",
  "edge-parent-character_aureliano_segundo-character_amaranta_ursula": "小女儿",
  relation_moscote_parent_remedios: "父女",
  "edge-partner-character_amaranta-character_gerineldo_marquez": "追求者",
  "edge-partner-character_amaranta-character_pietro_crespi": "追求者"
};
const specialLegendEdgeIds = new Set([
  "relation_moscote_parent_remedios",
  "edge-partner-character_amaranta-character_gerineldo_marquez",
  "edge-partner-character_amaranta-character_pietro_crespi"
]);
const specialEdgeVisualClasses: Record<string, string> = {
  relation_moscote_parent_remedios: "family-edge-father-daughter"
};
const childRoleEdgeIds = new Set([
  "edge-parent-character_jose_arcadio_buendia-character_rebeca",
  "edge-parent-character_jose_arcadio_buendia-character_jose_arcadio_son",
  "relation_jose_arcadio_buendia_parent_colonel",
  "edge-parent-character_jose_arcadio_buendia-character_amaranta",
  "edge-parent-character_jose_arcadio_son-character_arcadio",
  "edge-parent-character_aureliano_buendia_colonel-character_aureliano_jose",
  "edge-parent-character_arcadio-character_remedios_the_beauty",
  "relation_arcadio_parent_twins",
  "relation_arcadio_parent_aureliano_segundo",
  "relation_aureliano_segundo_parent_jose_arcadio_seminarian",
  "edge-parent-character_aureliano_segundo-character_meme",
  "edge-parent-character_aureliano_segundo-character_amaranta_ursula"
]);
const hiddenTreeEdgePairs = new Set(["partner:character_pietro_crespi:character_rebeca"]);
const lowerBranchEdgeIds = new Set(["edge-partner-character_amaranta-character_gerineldo_marquez"]);
const terminalIncestEdgeIds = new Set([
  "relation_little_aureliano_partner_amaranta_ursula",
  "relation_little_aureliano_parent_final_aureliano",
  "relation_amaranta_ursula_parent_final_aureliano"
]);
const terminalIncestNodeIds = [
  "character_little_aureliano",
  "character_amaranta_ursula",
  "character_final_aureliano"
];
const profileRelativeNotes: Record<string, string> = {
  "children:character_jose_arcadio_buendia:character_rebeca": "养女",
  "children:character_ursula:character_rebeca": "养女",
  "parents:character_rebeca:character_jose_arcadio_buendia": "养父",
  "parents:character_rebeca:character_ursula": "养母"
};

const familyLayoutSlots: Record<string, { x: number; yOffset?: number }> = {
  character_prudencio_aguilar: { x: 80 },
  character_melquiades: { x: 400 },
  character_jose_arcadio_buendia: { x: 780 },
  character_ursula: { x: 1300 },
  character_apolinar_moscote: { x: 1640 },
  character_rebeca: { x: 170 },
  character_jose_arcadio_son: { x: 470 },
  character_pilar_ternera: { x: 800 },
  character_aureliano_buendia_colonel: { x: 1140 },
  character_remedios_moscote: { x: 1640 },
  character_amaranta: { x: 1980 },
  character_pietro_crespi: { x: 2280 },
  character_gerineldo_marquez: { x: 2280, yOffset: 112 },
  character_santa_sofia: { x: 210 },
  character_arcadio: { x: 620 },
  character_aureliano_jose: { x: 940 },
  character_seventeen_aurelianos: { x: 1240 },
  character_remedios_the_beauty: { x: 260 },
  character_jose_arcadio_segundo: { x: 650 },
  character_petra_cotes: { x: 1020 },
  character_aureliano_segundo: { x: 1340 },
  character_fernanda: { x: 1680 },
  character_jose_arcadio_seminarian: { x: 520 },
  character_mauricio_babilonia: { x: 850 },
  character_meme: { x: 1200 },
  character_amaranta_ursula: { x: 1540 },
  character_gaston: { x: 1860 },
  character_nigromanta: { x: 760 },
  character_little_aureliano: { x: 1080 },
  character_final_aureliano: { x: 1260 }
};

type TreePosition = {
  x: number;
  y: number;
  width: number;
};

type EdgePoint = {
  x: number;
  y: number;
};

function getLineClass(line: FamilyLine) {
  return `family-line-${line}`;
}

function getTreeNodeWidth(node: FamilyTreeNode) {
  const widthOverride = nodeWidthOverrides[node.id];
  if (widthOverride) {
    return widthOverride;
  }

  const nameLength = Array.from(node.canonicalName).length;
  return Math.min(nodeMaxWidth, Math.max(nodeMinWidth, 92 + nameLength * 16));
}

function getEdgeDisplayLabel(kind: FamilyTreeEdgeKind, edgeId?: string) {
  if (edgeId && specialEdgeLabels[edgeId]) {
    return specialEdgeLabels[edgeId];
  }
  if (kind === "spouse") {
    return "夫妻";
  }
  if (kind === "lover") {
    return "情人";
  }
  if (kind === "incest") {
    return "禁忌";
  }
  if (kind === "aggregate") {
    return "聚合血缘（私生子）";
  }
  if (kind === "partner") {
    return "伴侣";
  }
  return edgeKindLabel[kind];
}

function getEdgeLegendLabel(edge: FamilyTreeEdge) {
  if (specialLegendEdgeIds.has(edge.id)) {
    return getEdgeDisplayLabel(edge.kind, edge.id);
  }
  return edgeKindLabel[edge.kind];
}

function shouldShowEdgeLabel(kind: FamilyTreeEdgeKind, edgeId: string) {
  return labeledEdgeKinds.has(kind) || Boolean(specialEdgeLabels[edgeId]);
}

function getEdgeVisualClass(edge: FamilyTreeEdge) {
  return specialEdgeVisualClasses[edge.id] ?? `family-edge-${edge.kind}`;
}

function getEdgeLabelClass(edge: FamilyTreeEdge) {
  return specialEdgeVisualClasses[edge.id]
    ? `family-edge-label-${specialEdgeVisualClasses[edge.id].replace("family-edge-", "")}`
    : `family-edge-label-${edge.kind}`;
}

function shouldHideFamilyTreeEdge(edge: FamilyTreeEdge) {
  if (terminalIncestEdgeIds.has(edge.id)) {
    return true;
  }
  const [firstId, secondId] = [edge.sourceId, edge.targetId].sort();
  return hiddenTreeEdgePairs.has(`${edge.kind}:${firstId}:${secondId}`);
}

function getEdgeRender(kind: FamilyTreeEdgeKind, source: TreePosition, target: TreePosition, edgeId?: string) {
  const isLateral = lateralEdgeKinds.includes(kind);
  if (isLateral) {
    if (edgeId && lowerBranchEdgeIds.has(edgeId)) {
      const origin = source.x <= target.x ? source : target;
      const branchTarget = source.x <= target.x ? target : source;
      const originY = origin.y + nodeHeight / 2;
      const targetX = branchTarget.x - branchTarget.width / 2;

      return {
        path: `M ${origin.x} ${originY} L ${origin.x} ${branchTarget.y} L ${targetX} ${branchTarget.y}`,
        labelX: (origin.x + targetX) / 2,
        labelY: branchTarget.y - 10
      };
    }

    const sourceIsLeft = source.x <= target.x;
    const sourceX = source.x + (sourceIsLeft ? source.width / 2 : -source.width / 2);
    const targetX = target.x + (sourceIsLeft ? -target.width / 2 : target.width / 2);
    const labelX = (sourceX + targetX) / 2;

    if (Math.abs(source.y - target.y) <= nodeHeight / 2) {
      return {
        path: `M ${sourceX} ${source.y} L ${targetX} ${target.y}`,
        labelX,
        labelY: source.y - 12
      };
    }

    const midX = (sourceX + targetX) / 2;
    return {
      path: `M ${sourceX} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${targetX} ${target.y}`,
      labelX: midX,
      labelY: (source.y + target.y) / 2 - 10
    };
  }

  const direction = target.y >= source.y ? 1 : -1;
  const sourceY = source.y + direction * (nodeHeight / 2);
  const targetY = target.y - direction * (nodeHeight / 2);
  const midY = (sourceY + targetY) / 2;
  const points = [
    { x: source.x, y: sourceY },
    { x: source.x, y: midY },
    { x: target.x, y: midY },
    { x: target.x, y: targetY }
  ];

  return {
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
    labelX:
      kind === "aggregate"
        ? (source.x + target.x) / 2 + aggregateLabelOffsetX
        : edgeId && childRoleEdgeIds.has(edgeId)
          ? target.x
          : (source.x + target.x) / 2,
    labelY: midY - 10,
    points
  };
}

function getDoubleLinePaths(points: EdgePoint[], offset = 3) {
  return points.slice(1).flatMap((point, index) => {
    const previous = points[index];
    const isHorizontal = Math.abs(previous.y - point.y) < 0.5;
    if (isHorizontal) {
      return [
        `M ${previous.x} ${previous.y - offset} L ${point.x} ${point.y - offset}`,
        `M ${previous.x} ${previous.y + offset} L ${point.x} ${point.y + offset}`
      ];
    }

    return [
      `M ${previous.x - offset} ${previous.y} L ${point.x - offset} ${point.y}`,
      `M ${previous.x + offset} ${previous.y} L ${point.x + offset} ${point.y}`
    ];
  });
}

function getTerminalIncestRender(aureliano: TreePosition, amarantaUrsula: TreePosition, child: TreePosition) {
  const sourceX = aureliano.x + aureliano.width / 2;
  const relationshipY = aureliano.y;
  const spouseStemX = amarantaUrsula.x;
  const spouseStemY = amarantaUrsula.y + nodeHeight / 2;
  const childStemX = child.x;
  const childStemY = child.y - nodeHeight / 2;

  return {
    path: [
      `M ${sourceX} ${relationshipY} L ${spouseStemX} ${relationshipY} L ${spouseStemX} ${spouseStemY}`,
      `M ${childStemX} ${relationshipY} L ${childStemX} ${childStemY}`
    ].join(" "),
    labelX: (sourceX + spouseStemX) / 2,
    labelY: relationshipY - 12
  };
}

function DeathTypeBadge({ characterId, deathType }: { characterId?: string; deathType?: DeathType }) {
  if (!deathType) {
    return null;
  }
  const { Icon, label: defaultLabel } = deathTypeConfig[deathType];
  const label = characterId ? (characterDeathTypeLabelOverrides[characterId] ?? defaultLabel) : defaultLabel;

  return (
    <span className={`death-badge death-${deathType}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function useFilteredNodes(
  model: FamilyTreeModel,
  lineFilter: LineFilter,
  generationFilter: GenerationFilter
) {
  return useMemo(
    () =>
      model.nodes.filter((node) => {
        const matchesLine = lineFilter === "all" || node.familyLine === lineFilter;
        const matchesGeneration = generationFilter === "all" || node.generation === generationFilter;
        return matchesLine && matchesGeneration;
      }),
    [generationFilter, lineFilter, model.nodes]
  );
}

function buildTreePositions(groups: FamilyTreeModel["generationGroups"], visibleIds: Set<string>) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      nodes: group.nodes.filter((node) => visibleIds.has(node.id))
    }))
    .filter((group) => group.nodes.length > 0);

  const nodeWidths = new Map(visibleGroups.flatMap((group) => group.nodes.map((node) => [node.id, getTreeNodeWidth(node)])));
  const positions = new Map<string, TreePosition>();
  const layoutEntries = visibleGroups.flatMap((group, rowIndex) =>
    group.nodes.map((node, nodeIndex) => {
      const nodeWidth = nodeWidths.get(node.id) ?? nodeMinWidth;
      const slot = familyLayoutSlots[node.id];
      return {
        id: node.id,
        rawX: slot?.x ?? nodeIndex * (nodeMaxWidth + nodeGap),
        rowIndex,
        width: nodeWidth,
        yOffset: slot?.yOffset ?? 0
      };
    })
  );

  const minLeft = layoutEntries.length
    ? Math.min(...layoutEntries.map((entry) => entry.rawX - entry.width / 2))
    : 0;
  const maxRight = layoutEntries.length
    ? Math.max(...layoutEntries.map((entry) => entry.rawX + entry.width / 2))
    : treeMinWidth;
  const contentWidth = maxRight - minLeft;
  const width = Math.max(treeMinWidth, sidePadding * 2 + contentWidth);
  const shiftX = sidePadding - minLeft + Math.max(0, (width - sidePadding * 2 - contentWidth) / 2);

  layoutEntries.forEach((entry) => {
    positions.set(entry.id, {
      x: entry.rawX + shiftX,
      y: topPadding + nodeHeight / 2 + entry.rowIndex * rowHeight + entry.yOffset,
      width: entry.width
    });
  });

  const maxBottom = layoutEntries.length
    ? Math.max(...layoutEntries.map((entry) => topPadding + nodeHeight + entry.rowIndex * rowHeight + entry.yOffset))
    : 0;

  return {
    visibleGroups,
    positions,
    width,
    height: Math.max(320, maxBottom + topPadding)
  };
}

function RelationGroup({
  label,
  ownerId,
  relatives,
  role,
  onSelect
}: {
  label: string;
  ownerId: string;
  relatives: FamilyTreeRelative[];
  role: "parents" | "partners" | "children";
  onSelect: (id: string) => void;
}) {
  if (relatives.length === 0) {
    return null;
  }

  return (
    <div className="profile-relation-group">
      <dt>{label}</dt>
      <dd>
        {relatives.map((relative) => {
          const note = profileRelativeNotes[`${role}:${ownerId}:${relative.id}`];

          return (
            <button
              className={`relation-chip ${getLineClass(relative.familyLine)}`}
              key={relative.id}
              onClick={() => onSelect(relative.id)}
              type="button"
            >
              <span>{relative.canonicalName}</span>
              {note ? <small>{note}</small> : null}
            </button>
          );
        })}
      </dd>
    </div>
  );
}

function ProfilePanel({
  node,
  onSelect
}: {
  node: FamilyTreeNode;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className={`family-profile ${getLineClass(node.familyLine)}`} aria-label={`${node.canonicalName} 人物卡`}>
      <div className="profile-kicker">
        <span>{familyLineLabel[node.familyLine]}</span>
        <span>第 {node.generation} 代</span>
        <DeathTypeBadge characterId={node.id} deathType={node.graphProfile?.deathType} />
      </div>
      <h2>{node.canonicalName}</h2>
      <p>{node.shortDescription}</p>

      {node.graphProfile ? (
        <div className="fate-callout">
          <strong>{node.graphProfile.fateLine}</strong>
          <span>{node.graphProfile.nameDestiny}</span>
        </div>
      ) : null}

      <dl className="profile-facts">
        <div>
          <dt>孤独类型</dt>
          <dd>{node.lonelinessType}</dd>
        </div>
        <div>
          <dt>命运结局</dt>
          <dd>{node.fate}</dd>
        </div>
        {node.graphProfile?.symbol ? (
          <div>
            <dt>象征物</dt>
            <dd>{node.graphProfile.symbol}</dd>
          </div>
        ) : null}
        {node.aliases.length > 0 ? (
          <div>
            <dt>别名</dt>
            <dd>{node.aliases.join(" / ")}</dd>
          </div>
        ) : null}
      </dl>

      {node.graphProfile?.graphTags.length ? (
        <div className="profile-tag-cloud" aria-label="材料归纳标签">
          {node.graphProfile.graphTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      <dl className="profile-relations">
        <RelationGroup label="父母" ownerId={node.id} relatives={node.relatives.parents} role="parents" onSelect={onSelect} />
        <RelationGroup label="伴侣" ownerId={node.id} relatives={node.relatives.partners} role="partners" onSelect={onSelect} />
        <RelationGroup label="子女" ownerId={node.id} relatives={node.relatives.children} role="children" onSelect={onSelect} />
      </dl>

      <div className="profile-section">
        <h3>
          <Landmark size={16} />
          关键事件
        </h3>
        <div className="profile-event-list">
          {node.keyEvents.map((event) => (
            <article key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.summary}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <h3>
          <Sparkles size={16} />
          关联意象
        </h3>
        <div className="profile-motif-list">
          {node.relatedMotifs.map((motif) => (
            <Link href={`/motifs/${motif.id}`} key={motif.id}>
              {motif.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="profile-actions">
        <Link className="ghost-button profile-link" href={`/timeline?character=${node.id}`}>
          <Route size={17} />
          事件轨迹
        </Link>
        <Link className="button profile-link" href={`/characters/${node.id}`}>
          <BookOpen size={17} />
          查看完整档案
        </Link>
      </div>
    </aside>
  );
}

function FamilyTreeView({
  model,
  visibleNodes,
  selectedId,
  onSelect
}: {
  model: FamilyTreeModel;
  visibleNodes: FamilyTreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const { visibleGroups, positions, width, height } = useMemo(
    () => buildTreePositions(model.generationGroups, visibleIds),
    [model.generationGroups, visibleIds]
  );

  const visibleEdges = model.edges.filter(
    (edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId) && !shouldHideFamilyTreeEdge(edge)
  );
  const shouldRenderTerminalIncestUnit = terminalIncestNodeIds.every((id) => visibleIds.has(id));
  const visibleEdgeLegendItems = Array.from(
    new Map(
      [
        ...visibleEdges.map((edge) => {
          const label = getEdgeLegendLabel(edge);
          const visualClass = getEdgeVisualClass(edge);
          return [`${visualClass}-${label}`, { kind: edge.kind, label, visualClass }] as const;
        }),
        ...(shouldRenderTerminalIncestUnit
          ? ([
              [
                "family-edge-incest-禁忌",
                { kind: "incest" as FamilyTreeEdgeKind, label: "禁忌", visualClass: "family-edge-incest" }
              ]
            ] as const)
          : [])
      ]
    ).values()
  );

  return (
    <>
      <div className="desktop-family-tree">
        <div className="edge-legend" aria-label="关系线型图例">
          {visibleEdgeLegendItems.map(({ label, visualClass }) => (
            <span className={`edge-legend-item ${visualClass}`} key={`${visualClass}-${label}`}>
              <i />
              {label}
            </span>
          ))}
        </div>
        <div className="family-tree-scroll">
          <div className="family-tree-canvas" style={{ height, minWidth: width }}>
            <svg
              aria-hidden="true"
              className="family-tree-lines"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              width={width}
            >
              {visibleEdges.map((edge) => {
                const source = positions.get(edge.sourceId);
                const target = positions.get(edge.targetId);
                if (!source || !target) {
                  return null;
                }
                const edgeRender = getEdgeRender(edge.kind, source, target, edge.id);
                const visualClass = getEdgeVisualClass(edge);
                const aggregateLinePaths =
                  edge.kind === "aggregate" && edgeRender.points ? getDoubleLinePaths(edgeRender.points) : null;

                return (
                  <g aria-label={edge.label} key={edge.id}>
                    <path
                      className={`family-edge ${visualClass} family-edge-halo`}
                      d={edgeRender.path}
                      pathLength="1"
                    />
                    {aggregateLinePaths ? (
                      aggregateLinePaths.map((path, index) => (
                        <path
                          className={`family-edge ${visualClass}`}
                          d={path}
                          key={`${edge.id}-${index}`}
                          pathLength="1"
                        />
                      ))
                    ) : (
                      <path
                        className={`family-edge ${visualClass}`}
                        d={edgeRender.path}
                        pathLength="1"
                      />
                    )}
                    {shouldShowEdgeLabel(edge.kind, edge.id) ? (
                      <text
                        className={`family-edge-label ${getEdgeLabelClass(edge)}`}
                        x={edgeRender.labelX}
                        y={edgeRender.labelY}
                      >
                        {getEdgeDisplayLabel(edge.kind, edge.id)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {shouldRenderTerminalIncestUnit ? (
                (() => {
                  const aureliano = positions.get("character_little_aureliano");
                  const amarantaUrsula = positions.get("character_amaranta_ursula");
                  const child = positions.get("character_final_aureliano");
                  if (!aureliano || !amarantaUrsula || !child) {
                    return null;
                  }
                  const edgeRender = getTerminalIncestRender(aureliano, amarantaUrsula, child);

                  return (
                    <g aria-label="禁忌" key="terminal-incest-family-unit">
                      <path
                        className="family-edge family-edge-incest"
                        d={edgeRender.path}
                        pathLength="1"
                      />
                      <text
                        className="family-edge-label family-edge-label-incest"
                        x={edgeRender.labelX}
                        y={edgeRender.labelY}
                      >
                        禁忌
                      </text>
                    </g>
                  );
                })()
              ) : null}
            </svg>

            {visibleGroups.map((group, rowIndex) => (
              <span
                className="tree-generation-label"
                key={group.generation}
                style={{ top: topPadding + rowIndex * rowHeight + 18 }}
              >
                {group.label}
              </span>
            ))}

            {visibleNodes.map((node) => {
              const position = positions.get(node.id);
              if (!position) {
                return null;
              }
              return (
                <button
                  aria-pressed={selectedId === node.id}
                  className={`family-node ${getLineClass(node.familyLine)}`}
                  key={node.id}
                  onClick={() => onSelect(node.id)}
                  style={{
                    left: position.x - position.width / 2,
                    top: position.y - nodeHeight / 2,
                    width: position.width,
                    height: nodeHeight
                  }}
                  type="button"
                >
                  <span>{node.canonicalName}</span>
                  <small>{node.lonelinessType}</small>
                  <DeathTypeBadge characterId={node.id} deathType={node.graphProfile?.deathType} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mobile-generation-rail">
        {visibleGroups.map((group) => (
          <section className="mobile-generation-column" key={group.generation}>
            <h3>{group.label}</h3>
            {group.nodes.map((node) => (
              <button
                aria-pressed={selectedId === node.id}
                className={`mobile-family-node ${getLineClass(node.familyLine)}`}
                key={node.id}
                onClick={() => onSelect(node.id)}
                type="button"
              >
                <span>{node.canonicalName}</span>
                <small>{node.lonelinessType}</small>
                <DeathTypeBadge characterId={node.id} deathType={node.graphProfile?.deathType} />
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

function CharacterCardsView({
  nodes,
  selectedId,
  onSelect
}: {
  nodes: FamilyTreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="character-card-grid">
      {nodes.map((node) => (
        <article className={`card character-card atlas-card ${getLineClass(node.familyLine)}`} key={node.id}>
          <div className="meta-row">
            <span className="meta-pill">{familyLineLabel[node.familyLine]}</span>
            <span className="meta-pill">第 {node.generation} 代</span>
          </div>
          <h3>{node.canonicalName}</h3>
          <p>{node.shortDescription}</p>
          <div className="tag-row">
            <span className="tag">{node.relatedMotifs.length} 个关联意象</span>
            <span className="tag">{node.keyEvents.length} 个关键事件</span>
          </div>
          {node.graphProfile ? (
            <div className="card-fate-line">
              <DeathTypeBadge characterId={node.id} deathType={node.graphProfile.deathType} />
              <strong>{node.graphProfile.fateLine}</strong>
            </div>
          ) : null}
          <div className="card-actions">
            <button
              aria-pressed={selectedId === node.id}
              className="ghost-button compact-button"
              onClick={() => onSelect(node.id)}
              type="button"
            >
              <UserRound size={16} />
              聚焦
            </button>
            <Link className="ghost-button compact-button" href={`/timeline?character=${node.id}`}>
              <Route size={16} />
              轨迹
            </Link>
            <Link className="button compact-button" href={`/characters/${node.id}`}>
              <BookOpen size={16} />
              档案
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function FateCodeView({
  nodes,
  selectedId,
  onSelect
}: {
  nodes: FamilyTreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fate-code-grid">
      {fateGroups.map((group) => {
        const groupNodes = nodes.filter(group.match);
        if (groupNodes.length === 0) {
          return null;
        }

        return (
          <section className="fate-code-panel" key={group.key}>
            <div className="fate-code-heading">
              <h3>{group.title}</h3>
              <span>{groupNodes.length} 位</span>
            </div>
            <p>{group.description}</p>
            <div className="fate-node-list">
              {groupNodes.map((node) => (
                <button
                  aria-pressed={selectedId === node.id}
                  className={`fate-node ${getLineClass(node.familyLine)}`}
                  key={`${group.key}-${node.id}`}
                  onClick={() => onSelect(node.id)}
                  type="button"
                >
                  <span>{node.canonicalName}</span>
                  <small>{node.graphProfile?.fateLine ?? node.lonelinessType}</small>
                  <DeathTypeBadge characterId={node.id} deathType={node.graphProfile?.deathType} />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CharactersExplorer({ model }: { model: FamilyTreeModel }) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [lineFilter, setLineFilter] = useState<LineFilter>("all");
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>("all");
  const [selectedId, setSelectedId] = useState(model.defaultCharacterId);

  const visibleNodes = useFilteredNodes(model, lineFilter, generationFilter);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const selectedNode = visibleNodeIds.has(selectedId)
    ? model.nodes.find((node) => node.id === selectedId)
    : visibleNodes[0] ?? model.nodes[0];
  const generationOptions = model.generationGroups.map((group) => group.generation);

  function selectLineFilter(value: LineFilter) {
    setLineFilter(value);
    const nextNode = model.nodes.find((node) => {
      const matchesLine = value === "all" || node.familyLine === value;
      const matchesGeneration = generationFilter === "all" || node.generation === generationFilter;
      return matchesLine && matchesGeneration;
    });
    if (nextNode) {
      setSelectedId(nextNode.id);
    }
  }

  function selectGenerationFilter(value: GenerationFilter) {
    setGenerationFilter(value);
    const nextNode = model.nodes.find((node) => {
      const matchesLine = lineFilter === "all" || node.familyLine === lineFilter;
      const matchesGeneration = value === "all" || node.generation === value;
      return matchesLine && matchesGeneration;
    });
    if (nextNode) {
      setSelectedId(nextNode.id);
    }
  }

  if (!selectedNode) {
    return null;
  }

  return (
    <section className="section family-explorer" aria-labelledby="family-explorer-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bloodline Console</p>
          <h2 id="family-explorer-title">布恩迪亚家族与外缘人物</h2>
        </div>
        <p>从创建者、守护者、战争者、见证者到最后的破译者，家族的每次重复都带着细微偏移。</p>
      </div>

      <div className="family-stat-strip" aria-label="家族图谱数据概览">
        <span>
          <strong>{model.nodes.length}</strong>
          人物
        </span>
        <span>
          <strong>{model.generationGroups.length}</strong>
          代际
        </span>
        <span>
          <strong>{model.edges.length}</strong>
          关系边
        </span>
        <span>
          <strong>{Object.keys(model.graphTagCounts).length}</strong>
          命运标签
        </span>
      </div>

      <div className="atlas-toolbar">
        <div className="segmented-control" aria-label="图谱视图">
          <button
            aria-pressed={viewMode === "tree"}
            onClick={() => setViewMode("tree")}
            type="button"
          >
            <GitBranch size={17} />
            家族树
          </button>
          <button
            aria-pressed={viewMode === "cards"}
            onClick={() => setViewMode("cards")}
            type="button"
          >
            <Rows3 size={17} />
            人物卡
          </button>
          <button
            aria-pressed={viewMode === "fate"}
            onClick={() => setViewMode("fate")}
            type="button"
          >
            <Sparkles size={17} />
            命运密码
          </button>
        </div>

        <div className="filter-group" aria-label="人物系列筛选">
          {lineFilterOptions.map((option) => (
            <button
              aria-pressed={lineFilter === option.value}
              key={option.value}
              onClick={() => selectLineFilter(option.value)}
              type="button"
            >
              {option.label}
              <span>{option.value === "all" ? model.nodes.length : model.familyLineCounts[option.value]}</span>
            </button>
          ))}
        </div>

        <div className="filter-group generation-filter" aria-label="代际筛选">
          <button
            aria-pressed={generationFilter === "all"}
            onClick={() => selectGenerationFilter("all")}
            type="button"
          >
            全部代际
            <span>{model.nodes.length}</span>
          </button>
          {generationOptions.map((generation) => (
            <button
              aria-pressed={generationFilter === generation}
              key={generation}
              onClick={() => selectGenerationFilter(generation)}
              type="button"
            >
              第 {generation} 代
              <span>{model.generationCounts[generation]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="family-workbench">
        <div className="family-atlas-surface">
          <div className="surface-title">
            <Network size={19} />
            <span>{viewMode === "tree" ? "家族树" : viewMode === "cards" ? "人物卡" : "命运密码"}</span>
            <small>{visibleNodes.length} 位人物</small>
          </div>

          {viewMode === "tree" ? (
            <FamilyTreeView
              model={model}
              onSelect={setSelectedId}
              selectedId={selectedNode.id}
              visibleNodes={visibleNodes}
            />
          ) : viewMode === "cards" ? (
            <CharacterCardsView nodes={visibleNodes} onSelect={setSelectedId} selectedId={selectedNode.id} />
          ) : (
            <FateCodeView nodes={visibleNodes} onSelect={setSelectedId} selectedId={selectedNode.id} />
          )}
        </div>

        <ProfilePanel node={selectedNode} onSelect={setSelectedId} />
      </div>
    </section>
  );
}
