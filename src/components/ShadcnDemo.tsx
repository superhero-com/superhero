import React from 'react';
import { AeButton } from './ui/ae-button';
import { AeCard, AeCardContent, AeCardDescription, AeCardHeader, AeCardTitle } from './ui/ae-card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

export default function ShadcnDemo() {
  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-primary-gradient bg-clip-text text-transparent">
            Shadcn/UI Migration Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Showcasing the new shadcn/ui components with your existing design system
          </p>
        </div>

        <Separator className="my-8" />

        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <AeButton variant="default">Primary</AeButton>
            <AeButton variant="secondary">Secondary</AeButton>
            <AeButton variant="accent">Accent</AeButton>
            <AeButton variant="success">Success</AeButton>
            <AeButton variant="warning">Warning</AeButton>
            <AeButton variant="error">Error</AeButton>
            <AeButton variant="ghost">Ghost</AeButton>
            <AeButton variant="outline">Outline</AeButton>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <AeButton size="xs">Extra Small</AeButton>
            <AeButton size="sm">Small</AeButton>
            <AeButton size="default">Default</AeButton>
            <AeButton size="lg">Large</AeButton>
            <AeButton size="xl">Extra Large</AeButton>
          </div>

          <div className="flex flex-wrap gap-4">
            <AeButton loading>Loading</AeButton>
            <AeButton disabled>Disabled</AeButton>
            <AeButton glow>Glow Effect</AeButton>
            <AeButton fullWidth>Full Width</AeButton>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Cards Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AeCard variant="default">
              <AeCardHeader>
                <AeCardTitle>Default Card</AeCardTitle>
                <AeCardDescription>
                  A standard card with the default styling
                </AeCardDescription>
              </AeCardHeader>
              <AeCardContent>
                <p className="text-sm text-muted-foreground">
                  This card uses the default variant with standard background and borders.
                </p>
              </AeCardContent>
            </AeCard>

            <AeCard variant="glass">
              <AeCardHeader>
                <AeCardTitle>Glass Card</AeCardTitle>
                <AeCardDescription>
                  A glassmorphism card with backdrop blur
                </AeCardDescription>
              </AeCardHeader>
              <AeCardContent>
                <p className="text-sm text-muted-foreground">
                  This card features glassmorphism with backdrop blur effects.
                </p>
              </AeCardContent>
            </AeCard>

            <AeCard variant="gradient">
              <AeCardHeader>
                <AeCardTitle>Gradient Card</AeCardTitle>
                <AeCardDescription>
                  A card with gradient background
                </AeCardDescription>
              </AeCardHeader>
              <AeCardContent>
                <p className="text-sm text-muted-foreground">
                  This card uses a gradient background from your design system.
                </p>
              </AeCardContent>
            </AeCard>

            <AeCard variant="glow">
              <AeCardHeader>
                <AeCardTitle>Glow Card</AeCardTitle>
                <AeCardDescription>
                  A card with glow effects
                </AeCardDescription>
              </AeCardHeader>
              <AeCardContent>
                <p className="text-sm text-muted-foreground">
                  This card features the signature glow effects from your design.
                </p>
              </AeCardContent>
            </AeCard>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Form Elements Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Form Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Enter your message" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="select">Select Option</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                    <SelectItem value="option3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">User Name</p>
                  <p className="text-xs text-muted-foreground">user@example.com</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Design System Colors</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-pink"></div>
                    <span>Neon Pink</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-teal"></div>
                    <span>Neon Teal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-blue"></div>
                    <span>Neon Blue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-yellow"></div>
                    <span>Neon Yellow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Integration Notes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Migration Notes</h2>
          <AeCard variant="glass">
            <AeCardHeader>
              <AeCardTitle>What's Been Migrated</AeCardTitle>
            </AeCardHeader>
            <AeCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-green-400 mb-2">✅ Completed</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Shadcn/ui installation and configuration</li>
                    <li>• Custom AeButton component with all variants</li>
                    <li>• Custom AeCard component with glassmorphism</li>
                    <li>• Custom dropdown menu components</li>
                    <li>• Tailwind configuration with design system colors</li>
                    <li>• HeaderWalletButton migration</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-2">🔄 Next Steps</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Migrate remaining components</li>
                    <li>• Update form components</li>
                    <li>• Test responsive design</li>
                    <li>• Remove old SCSS files</li>
                    <li>• Performance optimization</li>
                  </ul>
                </div>
              </div>
            </AeCardContent>
          </AeCard>
        </section>
      </div>
    </div>
  );
}
