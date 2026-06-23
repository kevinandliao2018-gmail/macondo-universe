import Link from "next/link";
import { CloudRain, Waves } from "lucide-react";

export default function MacondoRainExperiencePage() {
  return (
    <div className="rain-experience">
      <div className="rain-lines" aria-hidden="true" />
      <div className="rain-plate" aria-hidden="true" />
      <section className="rain-stage">
        <p className="eyebrow">Aguacero Archive / Chapter IX Echo</p>
        <h1>马孔多在下雨</h1>
        <p>
          电报线在潮湿的黑暗里颤动。赫里内勒多·马尔克斯上校说出的不是八月天气，
          而是战争之后无法被理解的孤独；四年十一个月零两天的雨，已经在远处开始聚集。
        </p>
        <div className="rain-metrics" aria-label="雨意象线索">
          <span>电码</span>
          <span>孤独</span>
          <span>香蕉公司</span>
          <span>遗忘</span>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/motifs/motif_rain">
            <Waves size={18} />
            查看雨意象
          </Link>
          <Link className="ghost-button" href="/">
            <CloudRain size={18} />
            返回入口
          </Link>
        </div>
      </section>
    </div>
  );
}
