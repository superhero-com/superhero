import React from "react";
import { Helmet } from "react-helmet-async";

type HeadProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Array<Record<string, any>> | Record<string, any> | null;
};

const CANONICAL_ORIGIN = "https://superhero.com";

export function Head(props: HeadProps) {
  const {
    title,
    description,
    canonicalPath,
    ogImage,
    noindex,
    jsonLd,
  } = props;

  const canonicalUrl = canonicalPath
    ? `${CANONICAL_ORIGIN}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`
    : undefined;

  const jsonLdArray = Array.isArray(jsonLd)
    ? jsonLd
    : jsonLd
    ? [jsonLd]
    : [];

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? (
        <meta name="description" content={description} />
      ) : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

      {/* OpenGraph */}
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:site_name" content="Superhero" />
      <meta property="og:image" content={ogImage || '/og-default.png'} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      <meta name="twitter:image" content={ogImage || '/og-default.png'} />

      {/* JSON-LD */}
      {jsonLdArray.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

export default Head;


