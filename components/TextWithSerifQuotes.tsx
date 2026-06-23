import { Fragment } from "react";

type TextWithSerifQuotesProps = {
  text: string;
};

const chineseQuotePattern = /(“[^”]+”)/g;

export function TextWithSerifQuotes({ text }: TextWithSerifQuotesProps) {
  return (
    <>
      {text.split(chineseQuotePattern).map((part, index) => (
        part.startsWith("“") && part.endsWith("”") ? (
          <span className="serif-inline-quote" key={`${part}-${index}`}>
            {part}
          </span>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        )
      ))}
    </>
  );
}
