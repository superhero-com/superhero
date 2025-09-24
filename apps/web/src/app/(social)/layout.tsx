import type { ReactNode } from "react";
import Shell from "@super/components/layout/Shell";
import RightRailClient from "./RightRailClient";
import LeftNavNext from "./LeftNavNext";
import AppHeaderClient from "./AppHeaderClient";

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <Shell left={<LeftNavNext />} right={<RightRailClient />} containerClassName="max-w-[min(1200px,100%)]">
      <AppHeaderClient />
      {children}
    </Shell>
  );
}


