"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@super/components/layout/app-header/navigationItems";
import HeaderWalletButton from "@super/components/layout/app-header/HeaderWalletButton";
import headerLogo from "@super/svg/headerLogo.svg";

export default function LeftNavNext() {
  const pathname = usePathname();
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  return (
    <nav className="flex flex-col gap-2 pr-2 min-h-screen">
      <Link href="/" className="no-underline px-3 py-2 rounded-xl text-[var(--standard-font-color)] hover:bg-white/10 transition-colors w-fit" aria-label="Superhero Home">
        {/* Use plain img to avoid SVG React component pipeline in Next */}
        <img src={headerLogo as unknown as string} alt="Superhero" className="h-8 w-auto" />
      </Link>
      <div className="grid gap-1">
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          const hasChildren = Array.isArray((item as any).children) && (item as any).children.length > 0;
          const baseClasses = `no-underline flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            active ? "bg-white/10 text-white" : "text-[var(--light-font-color)] hover:bg-white/10 hover:text-white"
          }`;
          return (
            <div key={item.id}>
              {item.isExternal ? (
                <a href={item.path} className={baseClasses} target="_blank" rel="noreferrer">
                  <span className="w-6 text-center">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              ) : (
                <Link href={item.path} className={baseClasses}>
                  <span className="w-6 text-center">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )}
              {hasChildren && (
                <div className="grid gap-1 mt-1 ml-8">
                  {(item as any).children.map((child: any) => {
                    const childActive = isActive(child.path);
                    return (
                      <Link
                        key={child.id}
                        href={child.path}
                        className={`no-underline flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                          childActive ? "bg-white/10 text-white" : "text-[var(--light-font-color)] hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="w-5 text-center">{child.icon}</span>
                        <span className="text-sm">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-3 border-t border-white/10">
        <div className="hidden lg:block">
          <HeaderWalletButton />
        </div>
      </div>
    </nav>
  );
}


