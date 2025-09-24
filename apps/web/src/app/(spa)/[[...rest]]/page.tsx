"use client";
import React from "react";
import App from "@super/App";

// Client-only catch-all to render the original SPA for all routes
// that are NOT the SSR pages (/, /post/[postId], /users/[address]).
export default function SpaCatchAll() {
  return <App />;
}


