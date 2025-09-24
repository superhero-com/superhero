import type { ReactNode } from "react";
import Shell from "@super/components/layout/Shell";
import RightRail from "@super/components/layout/RightRail";

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <Shell right={<RightRail />} containerClassName="max-w-[min(1200px,100%)]">
      {children}
    </Shell>
  );
}


