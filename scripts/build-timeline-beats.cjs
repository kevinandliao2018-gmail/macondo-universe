const fs = require("node:fs");
const path = require("node:path");

const MATERIAL_FILE = "材料/情节顺序/《百年孤独》全书完整时间顺序主要事件情节.md";

const stageChapterMap = {
  1: ["chapter_ohy_02"],
  2: ["chapter_ohy_01", "chapter_ohy_02"],
  3: ["chapter_ohy_01"],
  4: ["chapter_ohy_02"],
  5: ["chapter_ohy_03"],
  6: ["chapter_ohy_04"],
  7: ["chapter_ohy_04", "chapter_ohy_05"],
  8: ["chapter_ohy_05", "chapter_ohy_06"],
  9: ["chapter_ohy_07"],
  10: ["chapter_ohy_08", "chapter_ohy_09"],
  11: ["chapter_ohy_10", "chapter_ohy_11"],
  12: ["chapter_ohy_11", "chapter_ohy_12"],
  13: ["chapter_ohy_12", "chapter_ohy_14"],
  14: ["chapter_ohy_14", "chapter_ohy_15"],
  15: ["chapter_ohy_16"],
  16: ["chapter_ohy_17"],
  17: ["chapter_ohy_18"],
  18: ["chapter_ohy_19"],
  19: ["chapter_ohy_20"],
  20: ["chapter_ohy_20"]
};

const characterRules = [
  ["character_jose_arcadio_buendia", ["何塞·阿尔卡蒂奥·布恩迪亚", "创始人", "创建者"]],
  ["character_ursula", ["乌尔苏拉", "伊瓜兰"]],
  ["character_melquiades", ["梅尔基亚德斯"]],
  ["character_jose_arcadio_son", ["长子何塞·阿尔卡蒂奥", "失踪多年的长子", "何塞·阿尔卡蒂奥的坟墓", "何塞·阿尔卡蒂奥突然", "丽贝卡与何塞·阿尔卡蒂奥", "何塞·阿尔卡蒂奥结婚", "何塞·阿尔卡蒂奥中枪"]],
  ["character_aureliano_buendia_colonel", ["奥雷里亚诺·布恩迪亚上校", "奥雷里亚诺上校", "布恩迪亚上校", "上校"]],
  ["character_amaranta", ["阿玛兰妲", "阿玛兰妲提议", "阿玛兰妲接手"]],
  ["character_rebeca", ["丽贝卡"]],
  ["character_pilar_ternera", ["庇拉尔·特尔内拉", "庇拉尔"]],
  ["character_remedios_moscote", ["蕾梅黛丝·摩斯科特", "摩斯科特的小女儿", "蕾梅黛丝突然死亡", "蕾梅黛丝生前"]],
  ["character_arcadio", ["阿尔卡蒂奥被任命", "阿尔卡蒂奥治理", "阿尔卡蒂奥掌管", "阿尔卡蒂奥把", "阿尔卡蒂奥权力", "阿尔卡蒂奥被枪决", "阿尔卡蒂奥的三个孩子"]],
  ["character_aureliano_jose", ["奥雷里亚诺·何塞"]],
  ["character_santa_sofia", ["桑塔索菲亚·德拉·彼达", "桑塔索菲亚"]],
  ["character_remedios_the_beauty", ["美人儿蕾梅黛丝"]],
  ["character_jose_arcadio_segundo", ["何塞·阿尔卡蒂奥第二"]],
  ["character_aureliano_segundo", ["奥雷里亚诺第二"]],
  ["character_fernanda", ["费尔南达"]],
  ["character_petra_cotes", ["佩特拉·科特斯"]],
  ["character_meme", ["梅梅", "雷纳塔·蕾梅黛丝"]],
  ["character_mauricio_babilonia", ["马乌里肖·巴比伦", "马乌里肖"]],
  ["character_amaranta_ursula", ["阿玛兰妲·乌尔苏拉"]],
  ["character_little_aureliano", ["奥雷里亚诺·巴比伦", "小奥雷里亚诺"]],
  ["character_nigromanta", ["尼格罗曼妲"]],
  ["character_prudencio_aguilar", ["普鲁邓希奥·阿基拉尔", "普鲁邓希奥"]],
  ["character_apolinar_moscote", ["堂阿波利纳尔·摩斯科特", "摩斯科特"]],
  ["character_pietro_crespi", ["皮埃特罗·克雷斯皮", "皮埃特罗"]],
  ["character_gerineldo_marquez", ["赫里内勒多·马尔克斯", "赫里内勒多"]],
  ["character_seventeen_aurelianos", ["十七个奥雷里亚诺", "17 个奥雷里亚诺", "十七个儿子"]],
  ["character_jose_arcadio_seminarian", ["何塞·阿尔卡蒂奥从罗马", "何塞·阿尔卡蒂奥（神学院学生）", "神学院学生", "罗马归来"]],
  ["character_gaston", ["加斯通"]],
  ["character_final_aureliano", ["第七代奥雷里亚诺", "猪尾巴婴儿", "最后的孩子", "罗德里戈"]]
];

const motifRules = [
  ["motif_ice", ["冰块"]],
  ["motif_rain", ["雨", "暴雨", "下雨", "四年十一个月零两天"]],
  ["motif_solitude", ["孤独", "隔绝", "封闭", "无法真正"]],
  ["motif_memory", ["记忆", "遗忘", "失眠症", "标牌", "真相", "抹除"]],
  ["motif_time", ["时间", "星期一", "三月", "循环", "预言", "多年以后"]],
  ["motif_war", ["战争", "自由派", "保守派", "军营", "枪决", "停战", "内战"]],
  ["motif_family", ["家族", "血缘", "血脉", "婚姻", "乱伦", "孩子", "后代", "名字"]],
  ["motif_chestnut_tree", ["栗树"]],
  ["motif_gold_fish", ["小金鱼", "金鱼"]],
  ["motif_parchments", ["羊皮卷", "手稿", "破译"]],
  ["motif_yellow_butterflies", ["黄蝴蝶", "蝴蝶"]],
  ["motif_banana_company", ["香蕉公司", "香蕉", "工人", "罢工", "公司", "美国人"]],
  ["motif_ants", ["蚂蚁", "猪尾巴"]]
];

const locationRules = [
  ["location_buendia_house", ["布恩迪亚家", "布恩迪亚宅邸", "家里", "宅邸", "新房", "房屋", "庭院", "院子"]],
  ["location_chestnut_tree", ["栗树"]],
  ["location_melquiades_room", ["梅尔基亚德斯房间", "羊皮卷房间", "炼金", "密室"]],
  ["location_riverbank", ["河岸", "河边", "河水", "河流"]],
  ["location_gypsy_camp", ["吉卜赛", "奇迹集市"]],
  ["location_square", ["广场", "镇广场"]],
  ["location_station", ["车站", "火车站", "铁路", "火车", "列车"]],
  ["location_banana_company", ["香蕉公司", "公司区", "种植区", "美国人", "香蕉"]],
  ["location_cemetery", ["墓地", "公墓", "坟墓", "墓"]]
];

const eventRules = [
  ["event_final_child_devoured", ["蚂蚁", "拖回巢", "最后的孩子"]],
  ["event_macondo_erased", ["马孔多被", "飓风", "抹去", "毁灭"]],
  ["event_parchments_decoded", ["破译羊皮卷", "读懂羊皮卷", "全部译出"]],
  ["event_final_child_birth", ["猪尾巴婴儿出生", "带猪尾巴", "第七代奥雷里亚诺"]],
  ["event_amaranta_ursula_death", ["阿玛兰妲·乌尔苏拉产后", "母子死亡", "产后死亡"]],
  ["event_last_love", ["奥雷里亚诺与阿玛兰妲·乌尔苏拉相爱", "最后爱情"]],
  ["event_gaston_leaves", ["加斯通离开", "加斯通回"]],
  ["event_amaranta_ursula_returns", ["阿玛兰妲·乌尔苏拉归来", "带加斯通回到马孔多"]],
  ["event_jose_arcadio_seminarian_death", ["浴室", "被杀", "何塞·阿尔卡蒂奥从罗马归来又被杀"]],
  ["event_jose_arcadio_seminarian_return", ["何塞·阿尔卡蒂奥从罗马", "神学院学生"]],
  ["event_nigromanta_love", ["尼格罗曼妲"]],
  ["event_parchments_guarded", ["守护羊皮卷", "研究羊皮卷", "梅尔基亚德斯房间里的最后读者", "羊皮卷和大屠杀记忆"]],
  ["event_fernanda_death", ["费尔南达死", "费尔南达死亡"]],
  ["event_santa_sofia_leaves", ["桑塔索菲亚离家", "桑塔索菲亚离开"]],
  ["event_house_declines", ["宅邸进入衰败", "家宅腐败", "布恩迪亚家也在雨中衰败"]],
  ["event_twins_die", ["双胞胎相继死去", "双胞胎死亡", "双胞胎死", "同日死亡", "误葬"]],
  ["event_ursula_death", ["乌尔苏拉死", "乌尔苏拉离世"]],
  ["event_rain_stops", ["雨停", "大雨停止"]],
  ["event_rain_corrosion", ["雨水腐蚀", "冲毁", "腐烂废墟", "四年十一个月零两天的大雨"]],
  ["event_rain_begins", ["大雨开始", "雨开始"]],
  ["event_little_aureliano_hidden", ["小奥雷里亚诺出生", "被藏入布恩迪亚家", "被隐藏"]],
  ["event_massacre_witness", ["大屠杀", "三千多死者", "死者", "见证"]],
  ["event_banana_strike", ["工人罢工", "罢工"]],
  ["event_meme_exile", ["梅梅被送", "修道院", "送走"]],
  ["event_mauricio_shot", ["马乌里肖被枪击", "枪击"]],
  ["event_yellow_butterflies_love", ["黄蝴蝶", "梅梅与马乌里肖"]],
  ["event_amaranta_death", ["阿玛兰妲迎接死亡", "阿玛兰妲死亡"]],
  ["event_amaranta_shroud", ["寿衣"]],
  ["event_amaranta_ursula_childhood", ["阿玛兰妲·乌尔苏拉被送", "童年"]],
  ["event_chestnut_binding", ["绑在栗树", "栗树下", "禁锢在栗树"]],
  ["event_ursula_blindness", ["乌尔苏拉失明", "失明"]],
  ["event_seventeen_aurelianos_assassinated", ["十七个奥雷里亚诺被屠杀", "十七个奥雷里亚诺遭到暗杀", "圣灰十字"]],
  ["event_seventeen_aurelianos_marked", ["十七个奥雷里亚诺", "圣灰十字标记"]],
  ["event_remedios_ascension", ["美人儿蕾梅黛丝升天", "升天"]],
  ["event_foreign_order_expands", ["美国人", "独立城区", "外来秩序", "金属网"]],
  ["event_banana_company_arrives", ["香蕉公司进入", "赫伯特先生", "杰克·布朗", "香蕉公司"]],
  ["event_train_arrives", ["火车抵达", "黄色火车", "铁路正式开通"]],
  ["event_fernanda_arrival", ["费尔南达进入", "费尔南达共同"]],
  ["event_petra_cotes_bond", ["佩特拉·科特斯"]],
  ["event_aureliano_segundo_fortune", ["奥雷里亚诺第二", "繁盛财富", "豪宴"]],
  ["event_gold_fish_cycle", ["小金鱼", "金鱼"]],
  ["event_war_ends", ["停战", "战争以虚无收束", "签署停战"]],
  ["event_macondo_rain_telegram", ["马孔多在下雨", "电报"]],
  ["event_colonel_hardens", ["变得寒冷", "权力和虚无", "蒙卡达"]],
  ["event_gerineldo_courtship", ["赫里内勒多", "追求阿玛兰妲"]],
  ["event_aureliano_jose_death", ["奥雷里亚诺·何塞被", "被击毙"]],
  ["event_war_spreads", ["战争扩散", "长期循环"]],
  ["event_jose_arcadio_son_death", ["何塞·阿尔卡蒂奥中枪", "血迹"]],
  ["event_jose_arcadio_son_return", ["长子何塞·阿尔卡蒂奥突然回到", "失踪多年的长子"]],
  ["event_colonel_execution_escape", ["行刑队", "逃过行刑"]],
  ["event_remedios_beauty_matures", ["美人儿蕾梅黛丝显露", "异质之美"]],
  ["event_arcadio_execution", ["阿尔卡蒂奥被枪决", "枪决阿尔卡蒂奥"]],
  ["event_arcadio_excess", ["阿尔卡蒂奥权力失控", "地方暴政"]],
  ["event_twins_born", ["双胞胎", "何塞·阿尔卡蒂奥第二与奥雷里亚诺第二出生"]],
  ["event_arcadio_rule", ["阿尔卡蒂奥治理", "阿尔卡蒂奥掌管马孔多"]],
  ["event_war_begins", ["战争萌芽", "宣布自己成为上校", "战争开始"]],
  ["event_pietro_crespi_suicide", ["皮埃特罗", "自尽", "自杀"]],
  ["event_pietro_crespi_courtship", ["皮埃特罗", "自动钢琴", "订婚"]],
  ["event_aureliano_jose_desire", ["奥雷里亚诺·何塞", "禁忌欲望"]],
  ["event_remedios_death", ["蕾梅黛丝突然死亡", "蕾梅黛丝死"]],
  ["event_remedios_marriage", ["奥雷里亚诺与她的婚礼", "与蕾梅黛丝", "成婚"]],
  ["event_moscote_arrival", ["摩斯科特", "地方官", "镇长"]],
  ["event_melquiades_returns", ["梅尔基亚德斯归来", "恢复马孔多的记忆", "治疗"]],
  ["event_insomnia_plague", ["失眠症", "标牌"]],
  ["event_rebeca_arrival", ["丽贝卡", "骨殖", "食土"]],
  ["event_arcadio_birth_secret", ["阿尔卡蒂奥", "身世", "庇拉尔生下"]],
  ["event_jose_arcadio_son_departure", ["长子何塞·阿尔卡蒂奥", "出走", "吉卜赛女郎"]],
  ["event_ice_discovery", ["冰块"]],
  ["event_melquiades_first_wonders", ["磁铁", "望远镜", "炼金", "吉卜赛人每年到来"]],
  ["event_foundation_of_macondo", ["建立村镇", "建立马孔多", "马孔多由二十户", "创立"]],
  ["event_prudencio_duel", ["普鲁邓希奥", "长矛", "斗鸡"]],
  ["event_original_sin_memory", ["猪尾巴恐惧", "乱伦", "血缘", "防护", "圆房"]]
];

const highValueTags = [
  "创世",
  "迁徙",
  "吉卜赛人",
  "现代性",
  "香蕉公司",
  "战争",
  "爱情",
  "死亡",
  "雨",
  "羊皮卷",
  "记忆",
  "遗忘",
  "家族",
  "血脉",
  "马孔多",
  "宅邸",
  "火车",
  "大屠杀",
  "黄蝴蝶",
  "猪尾巴"
];

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", fileName), "utf8"));
}

function uniq(values) {
  return [...new Set(values)];
}

function matches(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function inferIds(text, rules) {
  if (rules === characterRules) {
    return inferCharacterIds(text);
  }
  return rules.filter(([, patterns]) => matches(text, patterns)).map(([id]) => id);
}

function inferCharacterIds(text) {
  const protectedText = text
    .replaceAll("阿玛兰妲·乌尔苏拉", "")
    .replaceAll("何塞·阿尔卡蒂奥·布恩迪亚", "")
    .replaceAll("何塞·阿尔卡蒂奥第二", "")
    .replaceAll("何塞·阿尔卡蒂奥（神学院学生）", "")
    .replaceAll("长子何塞·阿尔卡蒂奥", "")
    .replaceAll("小奥雷里亚诺", "");

  const ids = characterRules
    .filter(([id, patterns]) => {
      if (id === "character_ursula" || id === "character_amaranta" || id === "character_arcadio") {
        return matches(protectedText, patterns);
      }
      return matches(text, patterns);
    })
    .map(([id]) => id);

  return ids;
}

function inferLinkedEventId(text) {
  return eventRules.find(([, patterns]) => matches(text, patterns))?.[0] ?? null;
}

function makeTitle(text) {
  const clean = text.replace(/[。；;]$/, "");
  const firstClause = clean.split(/[，,；;]/)[0];
  if (firstClause.length <= 24) {
    return firstClause;
  }
  return `${firstClause.slice(0, 23)}…`;
}

function makeBeatId(index) {
  return `timeline_beat_${String(index).padStart(3, "0")}`;
}

function makeStageId(order) {
  return `timeline_stage_${String(order).padStart(2, "0")}`;
}

function normalizeStageTitle(title) {
  return title.replace("何塞死亡", "何塞·阿尔卡蒂奥死亡");
}

function parseMaterial() {
  const absoluteFile = path.join(process.cwd(), MATERIAL_FILE);
  const lines = fs.readFileSync(absoluteFile, "utf8").split(/\r?\n/);
  const overview = new Map();
  const stages = [];
  const stageItems = new Map();
  let inOverview = false;
  let currentStage = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line === "## 全书阶段总览") {
      inOverview = true;
      currentStage = null;
      return;
    }
    if (line === "## 全书完整时间顺序主要事件") {
      inOverview = false;
      currentStage = null;
      return;
    }

    const stageMatch = line.match(/^### (\d{2}) (.+)$/);
    if (stageMatch) {
      const order = Number(stageMatch[1]);
      currentStage = {
        id: makeStageId(order),
        order,
        title: normalizeStageTitle(stageMatch[2]),
        summary: "",
        source: {
          file: MATERIAL_FILE,
          heading: line.replace(/^### /, ""),
          line: lineNumber
        }
      };
      stages.push(currentStage);
      stageItems.set(currentStage.id, []);
      return;
    }

    const itemMatch = line.match(/^(\d+)\. (.+)$/);
    if (!itemMatch) {
      return;
    }

    const item = {
      item: Number(itemMatch[1]),
      text: itemMatch[2].trim(),
      line: lineNumber
    };

    if (inOverview) {
      overview.set(item.item, item);
    } else if (currentStage) {
      stageItems.get(currentStage.id).push(item);
    }
  });

  stages.forEach((stage) => {
    const firstItems = (stageItems.get(stage.id) ?? []).slice(0, 2).map((item) => item.text);
    stage.summary = firstItems.length > 0 ? firstItems.join(" ") : stage.title;
  });

  return { stages, stageItems, overview };
}

function main() {
  const chapters = readJson("chapters.json");
  const events = readJson("events.json");
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const { stages, stageItems, overview } = parseMaterial();
  const beats = [];

  stages.forEach((stage) => {
    const overviewItem = overview.get(stage.order);
    if (overviewItem) {
      beats.push({
        id: makeBeatId(beats.length + 1),
        title: stage.title,
        summary: overviewItem.text,
        storyOrder: beats.length + 1,
        narrativeOrder: 0,
        stageId: stage.id,
        chapterIds: stageChapterMap[stage.order] ?? [],
        participantCharacterIds: uniq(inferIds(`${stage.title} ${overviewItem.text}`, characterRules)),
        motifIds: uniq(inferIds(`${stage.title} ${overviewItem.text}`, motifRules)),
        locationIds: uniq(inferIds(`${stage.title} ${overviewItem.text}`, locationRules)),
        tags: buildTags(`${stage.title} ${overviewItem.text}`, stage),
        linkedEventId: inferLinkedEventId(`${stage.title} ${overviewItem.text}`),
        source: {
          file: MATERIAL_FILE,
          section: "全书阶段总览",
          item: overviewItem.item,
          line: overviewItem.line
        }
      });
    }

    const items = stageItems.get(stage.id) ?? [];
    items.forEach((item) => {
      const text = item.text;
      const linkedEventId = inferLinkedEventId(text);
      const linkedEvent = linkedEventId ? eventById.get(linkedEventId) : null;
      const chapterIds = linkedEvent?.chapterIds?.length
        ? linkedEvent.chapterIds
        : (stageChapterMap[stage.order] ?? []);

      beats.push({
        id: makeBeatId(beats.length + 1),
        title: makeTitle(text),
        summary: text,
        storyOrder: beats.length + 1,
        narrativeOrder: 0,
        stageId: stage.id,
        chapterIds,
        participantCharacterIds: uniq([
          ...inferIds(text, characterRules),
          ...(linkedEvent?.participantCharacterIds ?? [])
        ]),
        motifIds: uniq([
          ...inferIds(text, motifRules),
          ...(linkedEvent?.motifIds ?? [])
        ]),
        locationIds: uniq([
          ...inferIds(text, locationRules),
          ...(linkedEvent?.locationIds ?? [])
        ]),
        tags: buildTags(text, stage),
        linkedEventId,
        source: {
          file: MATERIAL_FILE,
          section: `${String(stage.order).padStart(2, "0")} ${stage.title}`,
          item: item.item,
          line: item.line
        }
      });
    });
  });

  const narrativeSorted = [...beats].sort((a, b) => {
    const chapterDelta = getMinChapterOrder(a.chapterIds, chapterById) - getMinChapterOrder(b.chapterIds, chapterById);
    if (chapterDelta !== 0) {
      return chapterDelta;
    }
    return a.storyOrder - b.storyOrder;
  });

  narrativeSorted.forEach((beat, index) => {
    beat.narrativeOrder = index + 1;
  });

  const value = {
    stages,
    beats
  };

  fs.writeFileSync(
    path.join(process.cwd(), "data", "timeline-beats.json"),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );

  console.log(`Built ${stages.length} timeline stages and ${beats.length} timeline beats.`);
}

function getMinChapterOrder(chapterIds, chapterById) {
  const orders = chapterIds
    .map((id) => chapterById.get(id)?.order)
    .filter((order) => Number.isInteger(order));
  return orders.length > 0 ? Math.min(...orders) : Number.MAX_SAFE_INTEGER;
}

function buildTags(text, stage) {
  const tags = [
    `阶段${String(stage.order).padStart(2, "0")}`,
    ...highValueTags.filter((tag) => text.includes(tag)),
    ...motifRules
      .filter(([, patterns]) => matches(text, patterns))
      .map(([id]) => id.replace("motif_", ""))
  ];
  return uniq(tags).slice(0, 8);
}

main();
