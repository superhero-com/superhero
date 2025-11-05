# Poll Created Plugin - Translation Example

## Structure

```
poll-created/
├── index.tsx              # Plugin definition with translations export
├── locales/
│   ├── en.json            # English translations
│   └── index.ts           # Export translations object
└── README.md
```

## Usage in Components

In your plugin's Render component or any React component, use the plugin ID as the namespace:

```typescript
import { useTranslation } from 'react-i18next';

export default function PollCard() {
  // Use plugin ID 'poll-created' as namespace
  const { t } = useTranslation('poll-created');
  
  return (
    <div>
      <span>{t('createdAPoll')}</span>
      <span>{t('pending')}</span>
      <span>{t('yourVote')}</span>
      <span>{t('retractVote')}</span>
      <span>{t('votes', { count: 5 })}</span>
    </div>
  );
}
```

## Adding More Languages

1. Create new JSON file: `locales/de.json`, `locales/fr.json`, etc.
2. Export in `locales/index.ts`:
   ```typescript
   import en from './en.json';
   import de from './de.json';
   import fr from './fr.json';
   
   export const translations = { en, de, fr };
   ```
3. Translations will be automatically registered when plugin loads.

