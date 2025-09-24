import type { ReactNode } from "react";
import Shell from "@super/components/layout/Shell";
import RightRail from "@super/components/layout/RightRail";
import dynamic from "next/dynamic";

const LeftNavNext = dynamic(() => import("./LeftNavNext"), { ssr: false });

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <Shell left={<LeftNavNext />} right={<RightRail />} containerClassName="max-w-[min(1200px,100%)]">
      {children}
    </Shell>
  );
}


