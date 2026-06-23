import Link from "next/link";

type EntityLinksProps = {
  title: string;
  items: {
    href: string;
    label: string;
    description?: string;
  }[];
};

export function EntityLinks({ title, items }: EntityLinksProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="panel">
      <h3>{title}</h3>
      <ul className="list">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <strong>{item.label}</strong>
              {item.description ? <span>{item.description}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
