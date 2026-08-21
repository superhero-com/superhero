import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
// React Router 7 dropped the `react-router-dom/server` entry point; `react-router-dom` now
// re-exports everything from `react-router`, `StaticRouter` included.
import { StaticRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes';

const ServerRoutes = ({ url }: { url: string }) => <StaticRouter location={url}>{useRoutes(routes as any)}</StaticRouter>;

export async function render(url: string) {
  const helmetContext: any = {};
  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <ServerRoutes url={url} />
    </HelmetProvider>,
  );

  const { helmet } = helmetContext;
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
