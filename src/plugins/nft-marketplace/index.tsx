import React from 'react';
import { definePlugin } from '@/plugin-sdk';
import MarketApp from './ui/MarketApp';

export default definePlugin({
  meta: {
    id: 'nft-marketplace',
    name: 'NFT Marketplace',
    version: '0.1.0',
    apiVersion: '1.x',
    capabilities: ['routes'],
    description: 'List and buy NFTs on Aeternity',
  },
  setup({ register }) {
    register({
      routes: [{ path: '/nft', element: <MarketApp /> }],
      menu: [{ id: 'nft', label: 'NFTs', path: '/nft', icon: '🖼️' }],
    });
  },
});


