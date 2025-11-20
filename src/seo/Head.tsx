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

  // Helper function to ensure image URLs are absolute
  const getAbsoluteImageUrl = (imageUrl?: string): string => {
    if (!imageUrl) {
      return `${CANONICAL_ORIGIN}/og-default.png`;
    }
    // If already absolute URL, return as is
    if (/^https?:\/\//i.test(imageUrl)) {
      return imageUrl;
    }
    // Convert relative path to absolute URL
    const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${CANONICAL_ORIGIN}${path}`;
  };

  const ogImageUrl = getAbsoluteImageUrl(ogImage);

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
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      <meta name="twitter:image" content={ogImageUrl} />

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


