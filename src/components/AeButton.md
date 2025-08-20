# AeButton Component

A super stylish, modern button component that fits the global color scheme and can be used throughout the entire React application.

## Features

- 🎨 **7 Color Variants**: Primary, Secondary, Accent, Success, Warning, Error, Ghost
- 📏 **5 Size Options**: XS, SM, MD, LG, XL
- 🎭 **4 Style Variants**: Outlined, Gradient, Glow, Rounded
- ⚡ **Interactive States**: Loading, Disabled, Hover, Active, Focus
- 📱 **Responsive Design**: Optimized for mobile, tablet, and desktop
- ♿ **Accessibility**: Focus management, reduced motion support
- 🎯 **TypeScript**: Fully typed with comprehensive interfaces

## Basic Usage

```tsx
import AeButton from '../components/AeButton';

// Basic button
<AeButton>Click me</AeButton>

// With variant and size
<AeButton variant="primary" size="lg">
  Primary Large Button
</AeButton>

// With loading state
<AeButton variant="success" loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</AeButton>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Button content |
| `variant` | `'primary' \| 'secondary' \| 'accent' \| 'success' \| 'warning' \| 'error' \| 'ghost'` | `'primary'` | Color variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Button size |
| `disabled` | `boolean` | `false` | Disable button |
| `loading` | `boolean` | `false` | Show loading spinner |
| `fullWidth` | `boolean` | `false` | Full width button |
| `rounded` | `boolean` | `false` | Rounded corners |
| `outlined` | `boolean` | `false` | Outlined style |
| `gradient` | `boolean` | `false` | Gradient background |
| `glow` | `boolean` | `false` | Glow effect |
| `onClick` | `(e: React.MouseEvent<HTMLButtonElement>) => void` | - | Click handler |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `className` | `string` | `''` | Additional CSS classes |
| `style` | `React.CSSProperties` | `{}` | Inline styles |

## Color Variants

### Primary (Default)
```tsx
<AeButton variant="primary">Primary Action</AeButton>
```
- **Color**: `#ff6b6b` (Coral Red)
- **Use**: Main actions, CTAs, primary interactions

### Secondary
```tsx
<AeButton variant="secondary">Secondary Action</AeButton>
```
- **Color**: `#4ecdc4` (Teal)
- **Use**: Secondary actions, alternative options

### Accent
```tsx
<AeButton variant="accent">Accent Action</AeButton>
```
- **Color**: `#4ecdc4` (Teal)
- **Use**: Highlighted actions, special features

### Success
```tsx
<AeButton variant="success">Success Action</AeButton>
```
- **Color**: `#4ecdc4` (Teal)
- **Use**: Confirmations, positive actions

### Warning
```tsx
<AeButton variant="warning">Warning Action</AeButton>
```
- **Color**: `#ffd93d` (Yellow)
- **Use**: Cautions, warnings, attention needed

### Error
```tsx
<AeButton variant="error">Error Action</AeButton>
```
- **Color**: `#ff6b6b` (Coral Red)
- **Use**: Destructive actions, errors

### Ghost
```tsx
<AeButton variant="ghost">Ghost Action</AeButton>
```
- **Color**: Transparent with primary color text
- **Use**: Subtle actions, secondary interactions

## Size Variants

```tsx
<AeButton size="xs">Extra Small</AeButton>
<AeButton size="sm">Small</AeButton>
<AeButton size="md">Medium</AeButton>
<AeButton size="lg">Large</AeButton>
<AeButton size="xl">Extra Large</AeButton>
```

## Style Variants

### Outlined
```tsx
<AeButton variant="primary" outlined>
  Outlined Button
</AeButton>
```

### Gradient
```tsx
<AeButton variant="primary" gradient>
  Gradient Button
</AeButton>
```

### Glow
```tsx
<AeButton variant="primary" glow>
  Glow Button
</AeButton>
```

### Rounded
```tsx
<AeButton variant="primary" rounded>
  Rounded Button
</AeButton>
```

## States

### Loading State
```tsx
<AeButton variant="primary" loading={isLoading}>
  {isLoading ? 'Processing...' : 'Submit'}
</AeButton>
```

### Disabled State
```tsx
<AeButton variant="primary" disabled>
  Disabled Button
</AeButton>
```

### Full Width
```tsx
<AeButton variant="primary" fullWidth>
  Full Width Button
</AeButton>
```

## Real-world Examples

### Form Actions
```tsx
<div style={{ display: 'flex', gap: '1rem' }}>
  <AeButton type="submit" variant="primary" size="lg">
    Submit Form
  </AeButton>
  <AeButton variant="ghost" size="md">
    Cancel
  </AeButton>
  <AeButton type="reset" variant="warning" size="sm" outlined>
    Reset
  </AeButton>
</div>
```

### Action Buttons
```tsx
<div style={{ display: 'flex', gap: '1rem' }}>
  <AeButton variant="success" size="md" rounded>
    ✅ Confirm
  </AeButton>
  <AeButton variant="error" size="sm">
    🗑️ Delete
  </AeButton>
  <AeButton variant="accent" size="md" outlined>
    📝 Edit
  </AeButton>
</div>
```

### Navigation
```tsx
<AeButton variant="primary" size="lg" gradient glow>
  🚀 Launch App
</AeButton>
```

## Advanced Combinations

```tsx
// Success with glow and rounded corners
<AeButton variant="success" size="lg" rounded glow>
  Success Large Rounded Glow
</AeButton>

// Warning outlined small
<AeButton variant="warning" size="sm" outlined>
  Warning Small Outlined
</AeButton>

// Accent gradient extra large
<AeButton variant="accent" size="xl" gradient>
  Accent XL Gradient
</AeButton>
```

## Accessibility Features

- **Focus Management**: Proper focus indicators with `focus-visible`
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA attributes
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **High Contrast**: Maintains contrast ratios

## Mobile Optimizations

- **Touch Targets**: Minimum 44px height for touch devices
- **Touch Feedback**: Optimized hover and active states
- **Responsive Sizing**: Adjusted sizes for mobile screens
- **Performance**: Optimized animations and transitions

## CSS Custom Properties

The component uses CSS custom properties that align with the global theme:

```css
--primary-color: #ff6b6b
--secondary-color: #4ecdc4
--accent-color: #4ecdc4
--success-color: #4ecdc4
--warning-color: #ffd93d
--error-color: #ff6b6b
```

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Features**: CSS Grid, Flexbox, CSS Custom Properties, Backdrop Filter

## Performance

- **Bundle Size**: Lightweight with minimal dependencies
- **Rendering**: Optimized with CSS transforms and opacity
- **Animations**: Hardware-accelerated with `will-change`
- **Memory**: No memory leaks, proper cleanup

## Migration Guide

### From Old AeButton
```tsx
// Old
<AeButton green loading>Old Button</AeButton>

// New
<AeButton variant="success" loading>New Button</AeButton>
```

### From Regular Button
```tsx
// Old
<button className="custom-button">Custom Button</button>

// New
<AeButton variant="primary">AeButton</AeButton>
```

## Contributing

When adding new features to AeButton:

1. **Maintain Consistency**: Follow existing patterns
2. **Add Types**: Update TypeScript interfaces
3. **Test Responsive**: Ensure mobile compatibility
4. **Document**: Update this README
5. **Accessibility**: Maintain accessibility standards
