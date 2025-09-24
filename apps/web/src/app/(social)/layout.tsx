import "../../globals.css";
import type { ReactNode } from "react";

export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full max-w-[1080px] mx-auto p-3">
      {children}
    </div>
  );
}


