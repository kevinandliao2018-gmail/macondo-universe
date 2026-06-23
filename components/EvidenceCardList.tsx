import Link from "next/link";
import { BookOpen, ExternalLink, Quote, Tags } from "lucide-react";
import { TextWithSerifQuotes } from "@/components/TextWithSerifQuotes";
import type { EvidenceCard } from "@/lib/domain/schemas";

type EvidenceCardListProps = {
  cards: EvidenceCard[];
  compact?: boolean;
  description?: string;
  showDetailLink?: boolean;
  title?: string;
};

export function EvidenceCardList({
  cards,
  compact = false,
  description,
  showDetailLink = true,
  title = "文本证据"
}: EvidenceCardListProps) {
  if (cards.length === 0) {
    return null;
  }

  const heading = (
    <>
      <Quote size={compact ? 15 : 18} />
      {title}
      <small>{cards.length} 张证据卡</small>
    </>
  );

  return (
    <section className={`evidence-block ${compact ? "is-compact" : ""}`}>
      <div className="evidence-block-heading">
        {compact ? <h3>{heading}</h3> : <h2>{heading}</h2>}
        {description ? <p>{description}</p> : null}
      </div>

      <div className="evidence-card-list">
        {cards.map((card) => (
          <article className="evidence-card-snippet" id={card.id} key={card.id}>
            <div className="evidence-card-topline">
              <span>
                <BookOpen size={14} />
                {card.quote.sourceNote}
              </span>
              {showDetailLink ? (
                <Link href={`/evidence/${card.id}`}>
                  卡片详情
                  <ExternalLink size={13} />
                </Link>
              ) : null}
            </div>

            <blockquote>“{card.quote.text}”</blockquote>
            <p className="evidence-paraphrase">{card.paraphrase}</p>
            <p className="evidence-interpretation">
              <TextWithSerifQuotes text={card.interpretation} />
            </p>

            <div className="tag-row evidence-tags">
              <span className="meta-pill">
                <Tags size={12} />
                {card.quote.translator}译
              </span>
              {card.tags.slice(0, 5).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
