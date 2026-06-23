import type { Character, Event, Motif, Relation } from "@/lib/domain/schemas";

export type FamilyLine = Character["familyLine"];
export type FamilyGraphProfile = NonNullable<Character["graphProfile"]>;
export type FamilyTreeEdgeKind = "parent" | "partner" | "spouse" | "lover" | "incest" | "aggregate";

export type FamilyTreeEvent = Pick<Event, "id" | "title" | "summary" | "storyOrder">;
export type FamilyTreeMotif = Pick<Motif, "id" | "name" | "symbolicLayers">;

export type FamilyTreeRelative = {
  id: string;
  canonicalName: string;
  generation?: number;
  familyLine: FamilyLine;
  lonelinessType: string;
};

export type FamilyTreeNode = {
  id: string;
  canonicalName: string;
  aliases: string[];
  generation: number;
  familyLine: FamilyLine;
  shortDescription: string;
  fate: string;
  lonelinessType: string;
  graphProfile?: FamilyGraphProfile;
  parentIds: string[];
  partnerIds: string[];
  childIds: string[];
  keyEvents: FamilyTreeEvent[];
  relatedMotifs: FamilyTreeMotif[];
  relatives: {
    parents: FamilyTreeRelative[];
    partners: FamilyTreeRelative[];
    children: FamilyTreeRelative[];
  };
};

export type FamilyTreeEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: FamilyTreeEdgeKind;
  label: string;
};

export type FamilyGenerationGroup = {
  generation: number;
  label: string;
  nodes: FamilyTreeNode[];
};

export type FamilyTreeModel = {
  nodes: FamilyTreeNode[];
  edges: FamilyTreeEdge[];
  generationGroups: FamilyGenerationGroup[];
  familyLineCounts: Record<FamilyLine, number>;
  generationCounts: Record<number, number>;
  deathTypeCounts: Record<string, number>;
  graphTagCounts: Record<string, number>;
  edgeKindCounts: Record<FamilyTreeEdgeKind, number>;
  defaultCharacterId: string;
};

type BuildFamilyTreeModelInput = {
  characters: Character[];
  events: Event[];
  motifs: Motif[];
  relations?: Relation[];
};

const defaultFamilyLineCounts: Record<FamilyLine, number> = {
  jose_arcadio: 0,
  aureliano: 0,
  ursula: 0,
  other: 0
};

const defaultEdgeKindCounts: Record<FamilyTreeEdgeKind, number> = {
  parent: 0,
  partner: 0,
  spouse: 0,
  lover: 0,
  incest: 0,
  aggregate: 0
};

const edgeKindLabels: Record<FamilyTreeEdgeKind, string> = {
  parent: "血缘",
  partner: "伴侣",
  spouse: "婚姻",
  lover: "情人",
  incest: "禁忌",
  aggregate: "聚合血缘（私生子）"
};

function relationTypeToEdgeKind(type: Relation["type"]): FamilyTreeEdgeKind | undefined {
  if (type === "parent_of") {
    return "parent";
  }
  if (type === "partner_of") {
    return "partner";
  }
  if (type === "spouse_of") {
    return "spouse";
  }
  if (type === "lover_of") {
    return "lover";
  }
  if (type === "incest_partner_of") {
    return "incest";
  }
  if (type === "aggregate_parent_of") {
    return "aggregate";
  }
  return undefined;
}

function toRelative(character: Character): FamilyTreeRelative {
  return {
    id: character.id,
    canonicalName: character.canonicalName,
    generation: character.generation,
    familyLine: character.familyLine,
    lonelinessType: character.lonelinessType
  };
}

function sortByStoryOrder(a: FamilyTreeEvent, b: FamilyTreeEvent) {
  return a.storyOrder - b.storyOrder;
}

export function buildFamilyTreeModel({
  characters,
  events,
  motifs,
  relations = []
}: BuildFamilyTreeModelInput): FamilyTreeModel {
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const motifById = new Map(motifs.map((motif) => [motif.id, motif]));
  const familyLineCounts = { ...defaultFamilyLineCounts };
  const generationCounts: Record<number, number> = {};
  const deathTypeCounts: Record<string, number> = {};
  const graphTagCounts: Record<string, number> = {};

  const nodes: FamilyTreeNode[] = characters.map((character) => {
    const generation = character.generation ?? 0;
    familyLineCounts[character.familyLine] += 1;
    generationCounts[generation] = (generationCounts[generation] ?? 0) + 1;
    if (character.graphProfile?.deathType) {
      deathTypeCounts[character.graphProfile.deathType] =
        (deathTypeCounts[character.graphProfile.deathType] ?? 0) + 1;
    }
    for (const tag of character.graphProfile?.graphTags ?? []) {
      graphTagCounts[tag] = (graphTagCounts[tag] ?? 0) + 1;
    }

    return {
      id: character.id,
      canonicalName: character.canonicalName,
      aliases: character.aliases,
      generation,
      familyLine: character.familyLine,
      shortDescription: character.shortDescription,
      fate: character.fate,
      lonelinessType: character.lonelinessType,
      graphProfile: character.graphProfile,
      parentIds: character.parentIds,
      partnerIds: character.partnerIds,
      childIds: character.childIds,
      keyEvents: character.keyEventIds
        .map((id) => eventById.get(id))
        .filter((event): event is Event => Boolean(event))
        .map(({ id, title, summary, storyOrder }) => ({ id, title, summary, storyOrder }))
        .sort(sortByStoryOrder),
      relatedMotifs: character.relatedMotifIds
        .map((id) => motifById.get(id))
        .filter((motif): motif is Motif => Boolean(motif))
        .map(({ id, name, symbolicLayers }) => ({ id, name, symbolicLayers })),
      relatives: {
        parents: character.parentIds
          .map((id) => characterById.get(id))
          .filter((relative): relative is Character => Boolean(relative))
          .map(toRelative),
        partners: character.partnerIds
          .map((id) => characterById.get(id))
          .filter((relative): relative is Character => Boolean(relative))
          .map(toRelative),
        children: character.childIds
          .map((id) => characterById.get(id))
          .filter((relative): relative is Character => Boolean(relative))
          .map(toRelative)
      }
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: FamilyTreeEdge[] = [];
  const edgeKeys = new Set<string>();

  function addEdge(sourceId: string, targetId: string, kind: FamilyTreeEdgeKind, idHint?: string) {
    if (!nodeById.has(sourceId) || !nodeById.has(targetId)) {
      return;
    }
    const isDirectional = kind === "parent" || kind === "aggregate";
    const directedBase = `${sourceId}-${targetId}`;
    const lateralBase = [sourceId, targetId].sort().join("-");
    if (kind === "parent" && edgeKeys.has(`aggregate-${directedBase}`)) {
      return;
    }
    if (
      kind === "partner" &&
      (edgeKeys.has(`spouse-${lateralBase}`) ||
        edgeKeys.has(`lover-${lateralBase}`) ||
        edgeKeys.has(`incest-${lateralBase}`))
    ) {
      return;
    }
    const edgeKey = isDirectional
      ? `${kind}-${directedBase}`
      : `${kind}-${lateralBase}`;
    if (edgeKeys.has(edgeKey)) {
      return;
    }
    edgeKeys.add(edgeKey);
    edges.push({
      id: idHint ?? `edge-${edgeKey}`,
      sourceId,
      targetId,
      kind,
      label: edgeKindLabels[kind]
    });
  }

  for (const relation of relations) {
    const kind = relationTypeToEdgeKind(relation.type);
    if (kind) {
      addEdge(relation.sourceId, relation.targetId, kind, relation.id);
    }
  }

  for (const node of nodes) {
    for (const parentId of node.parentIds) {
      addEdge(parentId, node.id, "parent");
    }

    for (const partnerId of node.partnerIds) {
      addEdge(node.id, partnerId, "partner");
    }
  }

  const edgeKindCounts = edges.reduce<Record<FamilyTreeEdgeKind, number>>((acc, edge) => {
    acc[edge.kind] += 1;
    return acc;
  }, { ...defaultEdgeKindCounts });

  const generationGroups = Object.entries(
    nodes.reduce<Record<number, FamilyTreeNode[]>>((acc, node) => {
      acc[node.generation] = acc[node.generation] ?? [];
      acc[node.generation].push(node);
      return acc;
    }, {})
  )
    .map(([generation, groupedNodes]) => ({
      generation: Number(generation),
      label: `第 ${generation} 代`,
      nodes: groupedNodes
    }))
    .sort((a, b) => a.generation - b.generation);

  return {
    nodes,
    edges,
    generationGroups,
    familyLineCounts,
    generationCounts,
    deathTypeCounts,
    graphTagCounts,
    edgeKindCounts,
    defaultCharacterId: characters[0]?.id ?? ""
  };
}
