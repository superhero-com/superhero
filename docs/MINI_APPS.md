# Mini-Apps Plugin System

The Superhero platform includes a powerful plugin system that allows community developers to easily create and register their own mini-apps without forking the main repository.

## Overview

Mini-apps are self-contained applications that integrate seamlessly into the Superhero platform. They appear in the `/apps` directory and are automatically listed on the Mini-Apps landing page.

## Quick Start

### 1. Create Your Mini-App Component

Create a React component for your mini-app:

```tsx
// src/features/my-app/MyApp.tsx
import React from 'react';

export default function MyApp() {
  return (
    <div className="w-full pb-4 md:pb-6">
      {/* Your app content */}
      <h1>My Custom Mini-App</h1>
    </div>
  );
}
```

### 2. Register Your Mini-App

Create a plugin file and register your app:

```tsx
// src/features/my-app/plugin.ts
import { lazy } from 'react';
import { registerMiniApp } from '@/features/mini-apps';

registerMiniApp({
  metadata: {
    id: 'my-app',
    name: 'My App',
    description: 'A cool mini-app built by the community',
    icon: '🚀',
    path: '/apps/my-app',
    category: 'utility',
    gradient: 'from-purple-500 to-pink-500',
    author: 'Your Name',
    authorUrl: 'https://github.com/yourusername',
    version: '1.0.0',
    tags: ['utility', 'community'],
  },
  route: {
    path: '/apps/my-app',
    component: lazy(() => import('./MyApp')),
  },
});
```

### 3. Import Your Plugin

Add your plugin import to the plugins file:

```tsx
// src/features/mini-apps/plugins.ts
import { registerBuiltInMiniApps } from './built-in';
import './my-app/plugin'; // Add this line
```

## Plugin Structure

### Metadata

The `metadata` object defines how your mini-app appears in the UI:

- **id**: Unique identifier (required)
- **name**: Display name (required)
- **description**: Short description shown on the landing page (required)
- **icon**: Emoji string or React component (required)
- **path**: Route path (required, should start with `/apps/`)
- **category**: One of `'trading' | 'bridge' | 'explore' | 'community' | 'utility'` (required)
- **gradient**: Tailwind gradient classes for icon background (required)
- **author**: Your name (optional)
- **authorUrl**: Your GitHub/profile URL (optional)
- **version**: Version string (optional)
- **tags**: Array of tags for filtering (optional)
- **requiresAuth**: Whether the app requires authentication (optional)

### Route Configuration

The `route` object defines how your app is routed:

- **path**: Route path pattern (required)
- **component**: Lazy-loaded React component (required)
- **layout**: Custom layout wrapper (optional, defaults to `SocialLayout`)
- **options**: Additional route options (optional)

## Examples

### Simple Utility App

```tsx
import { lazy } from 'react';
import { registerMiniApp } from '@/features/mini-apps';

registerMiniApp({
  metadata: {
    id: 'calculator',
    name: 'Calculator',
    description: 'A simple calculator tool',
    icon: '🔢',
    path: '/apps/calculator',
    category: 'utility',
    gradient: 'from-blue-500 to-cyan-500',
    author: 'John Doe',
  },
  route: {
    path: '/apps/calculator',
    component: lazy(() => import('./Calculator')),
  },
});
```

### App with Custom Layout

```tsx
import { lazy } from 'react';
import { registerMiniApp } from '@/features/mini-apps';
import CustomLayout from './CustomLayout';

registerMiniApp({
  metadata: {
    id: 'custom-app',
    name: 'Custom App',
    description: 'An app with custom layout',
    icon: '⭐',
    path: '/apps/custom',
    category: 'community',
    gradient: 'from-purple-500 to-pink-500',
  },
  route: {
    path: '/apps/custom',
    component: lazy(() => import('./CustomApp')),
    layout: CustomLayout,
  },
});
```

### App with Initialization

```tsx
import { lazy } from 'react';
import { registerMiniApp } from '@/features/mini-apps';

registerMiniApp({
  metadata: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Token analytics dashboard',
    icon: '📊',
    path: '/apps/analytics',
    category: 'explore',
    gradient: 'from-green-500 to-teal-500',
  },
  route: {
    path: '/apps/analytics',
    component: lazy(() => import('./Analytics')),
  },
  initialize: () => {
    // Initialize analytics tracking, etc.
    console.log('Analytics app initialized');
  },
  cleanup: () => {
    // Cleanup when app is unregistered
    console.log('Analytics app cleaned up');
  },
});
```

## Best Practices

1. **Use lazy loading**: Always use `lazy()` for your component imports to enable code splitting
2. **Follow naming conventions**: Use kebab-case for IDs and paths
3. **Provide good descriptions**: Help users understand what your app does
4. **Use appropriate categories**: Choose the category that best fits your app
5. **Add tags**: Tags help users discover your app
6. **Test your routes**: Make sure your route paths don't conflict with existing routes
7. **Handle errors gracefully**: Use error boundaries and proper error handling

## Integration Points

### Using Platform Features

Your mini-app can access platform features through hooks and context:

```tsx
import { useAeSdk } from '@/hooks';
import { useToast } from '@/components/ToastProvider';

export default function MyApp() {
  const { activeAccount, sdk } = useAeSdk();
  const toast = useToast();
  
  // Use platform features
}
```

### Styling

Use Tailwind CSS classes and follow the platform's design system:

```tsx
<div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
  {/* Your content */}
</div>
```

## Community Guidelines

1. **Be respectful**: Don't create apps that harm users or violate terms of service
2. **Open source**: Consider open-sourcing your mini-app for the community
3. **Documentation**: Provide clear documentation for your app
4. **Testing**: Test your app thoroughly before registering
5. **Updates**: Keep your app updated and maintain compatibility

## Questions?

Join our developer community:
- GitHub: https://github.com/superhero-com/superhero
- Discord: [Link to Discord]
- Documentation: [Link to docs]

