import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "马孔多宇宙",
  description: "以《百年孤独》为核心的马孔多文学知识系统"
};

const navItems = [
  { href: "/", label: "入口" },
  { href: "/one-hundred-years", label: "百年孤独" },
  { href: "/works", label: "文学宇宙" },
  { href: "/characters", label: "家族图谱" },
  { href: "/motifs", label: "意象图鉴" },
  { href: "/paths", label: "命运路径" },
  { href: "/archive", label: "研究档案" },
  { href: "/timeline", label: "时间迷宫" },
  { href: "/map", label: "马孔多地图" },
  { href: "/search", label: "搜索" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link className="brand" href="/">
              <span className="brand-mark">M</span>
              <span>
                <strong>马孔多宇宙</strong>
                <small>热带档案馆</small>
              </span>
            </Link>
            <nav className="top-nav" aria-label="主导航">
              {navItems.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
