import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { getRoutes } from './routes';
import { useRoutes } from 'react-router-dom';

function ServerRoutes({ url }: { url: string }) {
  return <StaticRouter location={url}>{useRoutes(getRoutes() as any)}</StaticRouter>;
}

export async function render(url: string) {
  const helmetContext: any = {};
  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <ServerRoutes url={url} />
    </HelmetProvider>
  );

  const helmet = helmetContext.helmet;
  const head = [
    helmet?.title?.toString?.() || '',
    helmet?.meta?.toString?.() || '',
    helmet?.link?.toString?.() || '',
    helmet?.script?.toString?.() || '',
  ]
    .filter(Boolean)
    .join('\n');

  return { appHtml, head };
}
