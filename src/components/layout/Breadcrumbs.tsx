import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSectionTheme } from "./AppLayout";
import { useTheme } from "@/contexts/ThemeContext";

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

// Icons for breadcrumbs
const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const HashtagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const SocialIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const DeFiIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const pathname = location.pathname;
    const items: BreadcrumbItem[] = [{ label: "Home", path: "/", icon: <HomeIcon /> }];

    if (pathname === "/" || pathname === "") {
      return items;
    }

    // Hashtags section
    if (pathname.startsWith("/trends")) {
      items.push({ label: "Hashtags", path: "/trends/tokens", icon: <HashtagIcon /> });
      
      if (pathname === "/trends/tokens") {
        // Just show Hashtags
      } else if (pathname === "/trends/create") {
        items.push({ label: "Create" });
      } else if (pathname === "/trends/daos") {
        items.push({ label: "DAOs" });
      } else if (pathname.startsWith("/trends/dao/")) {
        items.push({ label: "DAOs", path: "/trends/daos" });
        items.push({ label: "DAO Details" });
      } else if (pathname === "/trends/leaderboard") {
        items.push({ label: "Leaderboard" });
      } else if (pathname === "/trends/invite") {
        items.push({ label: "Invite & Earn" });
      } else if (pathname.startsWith("/trends/tokens/")) {
        const tokenName = params.tokenName || pathname.split("/").pop();
        items.push({ label: `#${decodeURIComponent(tokenName || "")}` });
      } else if (pathname.startsWith("/trends/accounts")) {
        items.push({ label: "Accounts" });
      }
    }

    // Social section
    if (pathname === "/social" || pathname.startsWith("/post") || pathname.startsWith("/users")) {
      items.push({ label: "Social", path: "/social", icon: <SocialIcon /> });
      
      if (pathname.startsWith("/post/")) {
        items.push({ label: "Post" });
      } else if (pathname.startsWith("/users/")) {
        items.push({ label: "Profile" });
      }
    }

    // DeFi section
    if (pathname.startsWith("/defi")) {
      items.push({ label: "DeFi", path: "/defi/swap", icon: <DeFiIcon /> });
      
      if (pathname === "/defi/swap") {
        items.push({ label: "Swap" });
      } else if (pathname === "/defi/pool") {
        items.push({ label: "Pool" });
      } else if (pathname === "/defi/wrap") {
        items.push({ label: "Wrap" });
      } else if (pathname === "/defi/bridge") {
        items.push({ label: "Bridge" });
      } else if (pathname === "/defi/buy-ae-with-eth") {
        items.push({ label: "Buy AE" });
      } else if (pathname.startsWith("/defi/explore")) {
        items.push({ label: "Explore" });
      }
    }

    // Other pages
    if (pathname === "/voting") {
      items.push({ label: "Governance" });
    }
    if (pathname === "/terms") {
      items.push({ label: "Terms" });
    }
    if (pathname === "/privacy") {
      items.push({ label: "Privacy" });
    }
    if (pathname === "/faq") {
      items.push({ label: "FAQ" });
    }

    return items;
  }, [location.pathname, params]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <svg
                className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className={`
                  flex items-center gap-1.5 transition-colors no-underline truncate max-w-[120px]
                  ${isDark 
                    ? "text-slate-400 hover:text-white" 
                    : "text-gray-500 hover:text-gray-900"
                  }
                `}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className={`flex items-center gap-1.5 truncate max-w-[200px] ${isLast ? "font-medium" : isDark ? "text-slate-400" : "text-gray-500"}`}
                style={{ color: isLast ? colors.primary : undefined }}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
