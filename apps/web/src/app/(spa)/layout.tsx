"use client";
import React from "react";

// Simple passthrough client layout so the SPA can control its own header/router.
export default function SpaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


