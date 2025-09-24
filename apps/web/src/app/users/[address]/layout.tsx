import type { ReactNode } from "react";

export default function UserLayout({ children }: { children: ReactNode }) {
  return <div className="max-w-[1080px] mx-auto p-3">{children}</div>;
}


