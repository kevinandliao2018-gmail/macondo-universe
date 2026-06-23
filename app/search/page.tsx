import { Suspense } from "react";
import { SearchClient } from "./search-client";

export default function SearchPage() {
  return (
    <div className="page">
      <p className="eyebrow">Search</p>
      <h1 className="hero-title">跨实体探索器</h1>
      <p className="lead">
        不必先知道该去人物图谱、时间迷宫、章节地图还是意象星图。输入“雨”“乌尔苏拉”“黄蝴蝶”或“香蕉公司”，让线索自己分组。
      </p>
      <Suspense fallback={<div className="panel search-loading">搜索索引正在展开...</div>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
