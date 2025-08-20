import React, { useState } from 'react';
import AeButton from './AeButton';

export default function AeButtonExamples() {
  const [loading, setLoading] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>AeButton Component Examples</h1>
      
      {/* Basic Variants */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Basic Variants</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton variant="primary">Primary</AeButton>
          <AeButton variant="secondary">Secondary</AeButton>
          <AeButton variant="accent">Accent</AeButton>
          <AeButton variant="success">Success</AeButton>
          <AeButton variant="warning">Warning</AeButton>
          <AeButton variant="error">Error</AeButton>
          <AeButton variant="ghost">Ghost</AeButton>
        </div>
      </section>

      {/* Size Variants */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Size Variants</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <AeButton size="xs">Extra Small</AeButton>
          <AeButton size="sm">Small</AeButton>
          <AeButton size="md">Medium</AeButton>
          <AeButton size="lg">Large</AeButton>
          <AeButton size="xl">Extra Large</AeButton>
        </div>
      </section>

      {/* Style Variants */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Style Variants</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton variant="primary" outlined>Outlined</AeButton>
          <AeButton variant="primary" gradient>Gradient</AeButton>
          <AeButton variant="primary" glow>Glow</AeButton>
          <AeButton variant="primary" rounded>Rounded</AeButton>
        </div>
      </section>

      {/* States */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>States</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton variant="primary" loading={loading} onClick={handleLoadingClick}>
            {loading ? 'Loading...' : 'Click to Load'}
          </AeButton>
          <AeButton variant="primary" disabled>Disabled</AeButton>
          <AeButton variant="primary" fullWidth>Full Width</AeButton>
        </div>
      </section>

      {/* Combinations */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Combinations</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton variant="success" size="lg" rounded glow>
            Success Large Rounded Glow
          </AeButton>
          <AeButton variant="warning" size="sm" outlined>
            Warning Small Outlined
          </AeButton>
          <AeButton variant="accent" size="xl" gradient>
            Accent XL Gradient
          </AeButton>
        </div>
      </section>

      {/* Real-world Examples */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Real-world Examples</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton variant="primary" size="lg" gradient>
            🚀 Launch App
          </AeButton>
          <AeButton variant="success" size="md" rounded>
            ✅ Confirm
          </AeButton>
          <AeButton variant="warning" size="sm" outlined>
            ⚠️ Cancel
          </AeButton>
          <AeButton variant="error" size="sm">
            🗑️ Delete
          </AeButton>
          <AeButton variant="ghost" size="md">
            📝 Edit
          </AeButton>
        </div>
      </section>

      {/* Form Examples */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Form Examples</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <AeButton type="submit" variant="primary" size="lg">
            Submit Form
          </AeButton>
          <AeButton type="reset" variant="ghost" size="md">
            Reset
          </AeButton>
          <AeButton variant="secondary" size="md" outlined>
            Cancel
          </AeButton>
        </div>
      </section>
    </div>
  );
}
