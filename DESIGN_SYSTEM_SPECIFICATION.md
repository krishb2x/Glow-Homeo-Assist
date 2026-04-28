# DESIGN SYSTEM SPECIFICATION
## HomeoSync (Premium Clinic OS)

**Version:** 2.0  
**Last Updated:** April 25, 2026  
**Status:** Ready for Implementation

---

## TABLE OF CONTENTS

1. Design Philosophy
2. Color Palette & Tokens
3. Typography
4. Spacing & Grid
5. Components
6. Patterns & Layouts
7. Accessibility
8. Dark Mode
9. Responsive Breakpoints
10. Animation & Transitions

---

## 1. DESIGN PHILOSOPHY

### Core Principles

1. **Clinical Trust** — Every interface element communicates competence, safety, and privacy
2. **Clarity Over Cleverness** — No decorative animations; every pixel serves a purpose
3. **Progressive Disclosure** — Show essentials first; advanced options revealed on demand
4. **Role-Centric** — UI changes based on user role (Doctor sees different interface than Admin)
5. **Accessibility First** — WCAG 2.1 AA minimum; screen reader tested
6. **Performance Conscious** — Design anticipates network delays; loading states are explicit

### Visual Language

- **Warmth:** Warm, earthy palette (cream, tan, green) inspired by natural healing
- **Simplicity:** Generous whitespace; limited visual hierarchy
- **Trustworthiness:** Consistent, predictable UI patterns
- **Homeopathy-Aligned:** Subtle botanical motifs (optional); avoid corporate/tech aesthetic

---

## 2. COLOR PALETTE & TOKENS

### Primary Colors

```css
/* Core Brand Colors */
--color-primary: #1B6B5C;           /* Leaf Green - Primary actions, trust */
--color-primary-light: #2D8A77;     /* Lighter green - Hover states */
--color-primary-dark: #124E44;      /* Darker green - Focus states */
--color-primary-very-light: #E5F1EE; /* Background tint */

/* Secondary Colors */
--color-secondary: #D4A574;         /* Warm Tan - Accents, secondary buttons */
--color-secondary-light: #E8C9A6;   /* Lighter tan - Hover */
--color-secondary-dark: #B8874D;    /* Darker tan - Focus */

/* Neutral Colors */
--color-background: #F7F5F0;        /* Cream - Main background */
--color-surface: #FFFCF8;           /* Paper White - Card/surface backgrounds */
--color-text: #1C1917;              /* Ink - Primary text */
--color-text-secondary: #57534E;    /* Taupe - Secondary text */
--color-text-tertiary: #A8A29E;     /* Light Taupe - Tertiary text */
--color-border: #D6CDBF;            /* Soft Border - Subtle dividers */
--color-border-dark: #B5AEA3;       /* Dark Border - Emphasis dividers */
--color-overlay: rgba(28, 25, 23, 0.05); /* Subtle overlay */

/* Semantic Colors */
--color-success: #2D6A4F;           /* Deep Green - Success, completed */
--color-warning: #D99E2B;           /* Warm Amber - Warning, pending */
--color-danger: #8B4B4B;            /* Rust - Danger, urgent, error */
--color-info: #1E7D8D;              /* Teal - Information, notification */

/* Case Complexity Colors */
--color-simple: #A8D5BA;            /* Light Green - Simple case, quick */
--color-standard: #7EB3B3;          /* Teal - Standard case, routine */
--color-complex: #D4A574;           /* Warm Tan - Complex case, involved */
--color-urgent: #8B4B4B;            /* Rust - Urgent case, priority */

/* State Colors */
--color-disabled: #D6CDBF;          /* Disabled state */
--color-loading: #1B6B5C;           /* Loading indicator */
```

### Color Usage Guidelines

| Component | Color | Rationale |
|-----------|-------|-----------|
| Primary CTA (button) | `--color-primary` | Trust, action |
| Secondary CTA | `--color-secondary` | Softer, alternative action |
| Destructive action (delete) | `--color-danger` | Clear danger signal |
| Success message | `--color-success` | Positive outcome |
| Warning message | `--color-warning` | Attention needed |
| Disabled button | `--color-disabled` | Inactive state |
| Link (default) | `--color-primary` | Consistent with CTA |
| Link (visited) | `--color-primary-dark` | Indicate previous navigation |
| Case: Simple | `--color-simple` | Low complexity triage |
| Case: Complex | `--color-complex` | High complexity triage |
| Case: Urgent | `--color-urgent` | Immediate attention |

### Tailwind Config Update

```typescript
// apps/web/tailwind.config.ts
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        hs: {
          // Primary
          primary: "#1B6B5C",
          "primary-light": "#2D8A77",
          "primary-dark": "#124E44",
          "primary-very-light": "#E5F1EE",
          
          // Secondary
          secondary: "#D4A574",
          "secondary-light": "#E8C9A6",
          "secondary-dark": "#B8874D",
          
          // Neutral
          cream: "#F7F5F0",
          paper: "#FFFCF8",
          ink: "#1C1917",
          text: {
            DEFAULT: "#1C1917",
            secondary: "#57534E",
            tertiary: "#A8A29E"
          },
          border: {
            DEFAULT: "#D6CDBF",
            dark: "#B5AEA3"
          },
          
          // Semantic
          success: "#2D6A4F",
          warning: "#D99E2B",
          danger: "#8B4B4B",
          info: "#1E7D8D",
          
          // Case Complexity
          "complexity-simple": "#A8D5BA",
          "complexity-standard": "#7EB3B3",
          "complexity-complex": "#D4A574",
          "complexity-urgent": "#8B4B4B"
        }
      },
      backgroundColor: {
        overlay: "rgba(28, 25, 23, 0.05)"
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px rgba(28, 25, 23, 0.06)",
        input: "inset 0 1px 2px rgba(28, 25, 23, 0.02)",
        dropdown: "0 4px 12px rgba(28, 25, 23, 0.08)"
      }
    }
  },
  plugins: []
};
```

---

## 3. TYPOGRAPHY

### Font Stack

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Monaco", "Courier New", monospace;
```

### Type Scale

```css
/* Display */
--text-display-xl: 3rem (48px) / 1.2 line-height / 700 weight;
--text-display-lg: 2.25rem (36px) / 1.2 / 700;

/* Heading */
--text-heading-xl: 2rem (32px) / 1.3 / 600;
--text-heading-lg: 1.75rem (28px) / 1.3 / 600;
--text-heading-md: 1.5rem (24px) / 1.3 / 600;
--text-heading-sm: 1.25rem (20px) / 1.4 / 600;

/* Body */
--text-body-lg: 1.125rem (18px) / 1.5 / 400;
--text-body-md: 1rem (16px) / 1.5 / 400;    /* Default body text */
--text-body-sm: 0.875rem (14px) / 1.5 / 400;

/* Caption */
--text-caption-md: 0.875rem (14px) / 1.4 / 500;
--text-caption-sm: 0.75rem (12px) / 1.4 / 500;

/* Mono (for codes, timestamps) */
--text-mono: 0.875rem / 1.5 / 400;
```

### Weight Usage

- **700 (Bold):** Display, primary headings, strong emphasis
- **600 (Semibold):** Secondary headings, button labels, strong text
- **500 (Medium):** Form labels, captions, secondary headings
- **400 (Regular):** Body text, default

### Tailwind Typography

```typescript
// Extend tailwind.config.ts with type utilities
const config: Config = {
  theme: {
    extend: {
      fontSize: {
        // Display
        "display-xl": ["3rem", { lineHeight: "1.2", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        
        // Heading
        "heading-xl": ["2rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-lg": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        
        // Body
        "body-lg": ["1.125rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        
        // Caption
        "caption-md": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        "caption-sm": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }]
      }
    }
  }
};
```

---

## 4. SPACING & GRID

### Spacing Scale

```css
--space-px: 1px;
--space-0: 0;
--space-1: 0.25rem (4px);
--space-2: 0.5rem (8px);
--space-3: 0.75rem (12px);
--space-4: 1rem (16px);      /* Base unit */
--space-5: 1.25rem (20px);
--space-6: 1.5rem (24px);
--space-7: 1.75rem (28px);
--space-8: 2rem (32px);
--space-12: 3rem (48px);
--space-16: 4rem (64px);
```

### Grid System

**Base:** 8px grid  
**Container Max-Width:** 1200px  
**Columns:** 12-column responsive grid

```css
/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Grid Gap */
--grid-gap-sm: 0.5rem;     /* 8px — compact layouts */
--grid-gap-md: 1rem;       /* 16px — standard layouts */
--grid-gap-lg: 1.5rem;     /* 24px — spacious layouts */

/* Padding */
--padding-sm: 0.75rem;     /* 12px — compact containers */
--padding-md: 1rem;        /* 16px — standard padding */
--padding-lg: 1.5rem;      /* 24px — spacious containers */
--padding-xl: 2rem;        /* 32px — extra spacious */
```

### Practical Spacing Rules

- **Page Container:** `padding: var(--space-6)` (24px all sides)
- **Card/Panel:** `padding: var(--space-6)` interior; `margin: var(--space-4)` between
- **Form Input:** `padding: var(--space-3) var(--space-4)` (12px top/bottom, 16px left/right)
- **Button:** `padding: var(--space-3) var(--space-6)` (12px top/bottom, 24px left/right)
- **Gap Between Sections:** `margin-bottom: var(--space-8)` (32px)

---

## 5. COMPONENTS

### Button Component

```tsx
// Component: Button
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Variants
export function Button({ variant, size, disabled, loading, icon, children }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg transition";
  
  const variantClasses = {
    primary: "bg-hs-primary text-white hover:bg-hs-primary-light active:bg-hs-primary-dark",
    secondary: "bg-hs-secondary text-white hover:bg-hs-secondary-light active:bg-hs-secondary-dark",
    tertiary: "bg-transparent border border-hs-border text-hs-text hover:bg-hs-overlay",
    danger: "bg-hs-danger text-white hover:opacity-90 active:opacity-100"
  };
  
  const sizeClasses = {
    sm: "px-3 py-2 text-body-sm gap-2",
    md: "px-6 py-2.5 text-body-md gap-2",
    lg: "px-8 py-3 text-body-lg gap-3"
  };
  
  return (
    <button
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${loading ? "pointer-events-none" : ""}
      `}
    >
      {loading && <SpinnerIcon />}
      {icon && !loading && icon}
      {children}
    </button>
  );
}
```

### Form Input Component

```tsx
interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
}

export function Input({
  label,
  error,
  hint,
  required,
  disabled,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-caption-md font-semibold text-hs-text">
        {label}
        {required && <span className="text-hs-danger ml-1">*</span>}
      </label>
      <input
        {...rest}
        disabled={disabled}
        className={`
          px-4 py-3 rounded-lg border text-body-md
          font-normal transition
          ${error ? "border-hs-danger" : "border-hs-border"}
          focus:outline-none focus:ring-2
          ${error ? "focus:ring-hs-danger focus:ring-opacity-50" : "focus:ring-hs-primary focus:ring-opacity-30"}
          ${disabled ? "bg-hs-border opacity-50 cursor-not-allowed" : "bg-hs-paper"}
        `}
      />
      {error && <span className="text-caption-sm text-hs-danger">{error}</span>}
      {hint && !error && <span className="text-caption-sm text-hs-text-tertiary">{hint}</span>}
    </div>
  );
}
```

### Card Component

```tsx
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`
      bg-hs-paper rounded-2xl border border-hs-border
      shadow-card p-6 transition
      hover:shadow-lg ${className}
    `}>
      {children}
    </div>
  );
}
```

### Status Badge Component

```tsx
interface BadgeProps {
  status: 'active' | 'pending' | 'completed' | 'urgent' | 'resolved';
  children: React.ReactNode;
}

export function Badge({ status, children }: BadgeProps) {
  const colorMap = {
    active: "bg-hs-primary-very-light text-hs-primary",
    pending: "bg-yellow-100 text-yellow-900",
    completed: "bg-green-100 text-hs-success",
    urgent: "bg-red-100 text-hs-danger",
    resolved: "bg-teal-100 text-hs-info"
  };
  
  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full
      text-caption-sm font-semibold ${colorMap[status]}
    `}>
      {children}
    </span>
  );
}
```

### Appointment Card (Custom)

```tsx
interface AppointmentCardProps {
  time: string;
  duration: number;
  patientName: string;
  complexity: 'simple' | 'standard' | 'complex' | 'urgent';
  lastVisit?: string;
  status: 'on-time' | 'waiting' | 'in-progress' | 'overdue';
}

export function AppointmentCard({
  time,
  duration,
  patientName,
  complexity,
  lastVisit,
  status
}: AppointmentCardProps) {
  const complexityColors = {
    simple: "bg-hs-complexity-simple",
    standard: "bg-hs-complexity-standard",
    complex: "bg-hs-complexity-complex",
    urgent: "bg-hs-complexity-urgent"
  };
  
  const statusIcons = {
    "on-time": "🟢",
    "waiting": "🟡",
    "in-progress": "🔵",
    "overdue": "🔴"
  };
  
  return (
    <Card className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-heading-sm font-semibold">{time}</span>
          <span className="text-caption-sm text-hs-text-tertiary">({duration}m)</span>
        </div>
        <h3 className="text-body-lg font-semibold mb-1">{patientName}</h3>
        {lastVisit && (
          <p className="text-body-sm text-hs-text-secondary">Last: {lastVisit}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge status={complexity}>{complexity}</Badge>
        <span className="text-2xl">{statusIcons[status]}</span>
      </div>
    </Card>
  );
}
```

---

## 6. PATTERNS & LAYOUTS

### Three-Pane Consultation Layout

```tsx
export function ConsultationLayout({ left, center, right, bottom }: ConsultationLayoutProps) {
  return (
    <div className="grid grid-cols-[25%_50%_25%] gap-6 h-screen bg-hs-cream">
      {/* LEFT PANE: Patient History */}
      <aside className="overflow-y-auto bg-hs-paper rounded-2xl p-6 border border-hs-border">
        {left}
      </aside>
      
      {/* CENTER PANE: Live Transcript */}
      <main className="flex flex-col gap-4">
        <Card className="flex-1 overflow-y-auto">{center}</Card>
      </main>
      
      {/* RIGHT PANE: Suggestions */}
      <aside className="overflow-y-auto bg-hs-paper rounded-2xl p-6 border border-hs-border">
        {right}
      </aside>
      
      {/* BOTTOM DRAWER: Prescription Builder */}
      <div className="col-span-3 bg-hs-paper border-t border-hs-border p-4 rounded-t-2xl">
        {bottom}
      </div>
    </div>
  );
}
```

### Dashboard Grid Layout

```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-6 p-6 bg-hs-cream min-h-screen">
      {/* Sidebar: 3 columns (25%) */}
      <aside className="col-span-3 flex flex-col gap-6">
        {/* Navigation, filters, etc. */}
      </aside>
      
      {/* Main Content: 9 columns (75%) */}
      <main className="col-span-9">
        {children}
      </main>
    </div>
  );
}
```

### Form Layout

```tsx
export function FormLayout({ children, title, onSubmit }: FormLayoutProps) {
  return (
    <Card className="max-w-2xl">
      {title && <h1 className="text-heading-lg font-semibold mb-6">{title}</h1>}
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {children}
      </form>
    </Card>
  );
}
```

---

## 7. ACCESSIBILITY

### WCAG 2.1 AA Compliance

- **Color Contrast:** All text must have 4.5:1 ratio (normal) or 3:1 (large)
- **Keyboard Navigation:** All interactive elements reachable via Tab key
- **Screen Reader:** Semantic HTML + ARIA labels
- **Focus Indicators:** Visible focus ring on all interactive elements
- **Motion:** Reduced motion respected (prefers-reduced-motion)

### Implementation Checklist

```tsx
// ✅ Semantic HTML
<button>Click me</button>  // Not <div onClick={...}>

// ✅ ARIA Labels
<button aria-label="Close menu" />

// ✅ Keyboard Navigation
<div role="button" tabIndex={0} onKeyPress={handler} />

// ✅ Focus Indicator
button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

// ✅ Reduced Motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// ✅ Color Not Only Signal
// Use icons + color for status, not color alone
<Badge status="urgent">
  <AlertIcon /> Urgent
</Badge>
```

### Screen Reader Testing Tools

- NVDA (Windows, free)
- JAWS (Windows/Mac, commercial)
- VoiceOver (Mac/iOS, built-in)
- TalkBack (Android, built-in)

---

## 8. DARK MODE

### Dark Mode Support (Optional Phase 2)

```css
/* Dark Mode Palette */
@media (prefers-color-scheme: dark) {
  --color-background: #1a1815;
  --color-surface: #2a2520;
  --color-text: #f5f1ed;
  --color-text-secondary: #a8a29e;
  --color-border: #3d3933;
  
  /* Colors adjusted for readability */
  --color-primary: #4a9b89;
  --color-secondary: #e6c89f;
}
```

---

## 9. RESPONSIVE BREAKPOINTS

### Mobile-First Approach

```css
/* Base: Mobile (default, 375px–599px) */
.grid {
  grid-template-columns: 1fr;
}

/* Tablet (600px–1023px) */
@media (min-width: 600px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Tailwind Breakpoints

```typescript
// Default Tailwind: sm, md, lg, xl, 2xl
// Use for: sm: 640px | md: 768px | lg: 1024px | xl: 1280px | 2xl: 1536px
```

### Responsive Navigation

```tsx
export function Navigation() {
  return (
    <>
      {/* Mobile: Hamburger Menu */}
      <div className="md:hidden">
        <HamburgerMenu />
      </div>
      
      {/* Desktop: Full Navigation */}
      <nav className="hidden md:flex gap-6">
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/patients">Patients</NavLink>
        <NavLink href="/consultations">Consultations</NavLink>
      </nav>
    </>
  );
}
```

---

## 10. ANIMATION & TRANSITIONS

### Principles

- **Purposeful:** Only animate to convey state changes or guide attention
- **Fast:** 150–300ms duration (feels responsive)
- **Subtle:** No bouncy or playful animations in clinical context
- **Accessible:** Respect prefers-reduced-motion

### Common Transitions

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Down */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse (Loading) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Duration & Easing */
--transition-fast: 150ms ease-out;
--transition-normal: 200ms ease-out;
--transition-slow: 300ms ease-out;

button:hover {
  background-color: var(--color-primary-light);
  transition: background-color var(--transition-fast);
}
```

### Loading States

```tsx
// Skeleton Loader (instead of spinner)
export function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="h-4 bg-hs-border rounded animate-pulse" />
      <div className="h-4 bg-hs-border rounded w-5/6 animate-pulse" />
      <div className="h-20 bg-hs-border rounded animate-pulse" />
    </div>
  );
}

// Spinner (for short operations)
export function Spinner() {
  return (
    <div className="animate-spin">
      <svg className="h-6 w-6 text-hs-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="..." />
      </svg>
    </div>
  );
}
```

---

## COMPONENT LIBRARY (Storybook)

### Setup

```bash
npm install -D storybook @storybook/react @storybook/addon-essentials

npx storybook init
```

### Example Story

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "tertiary", "danger"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    loading: { control: "boolean" }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Click me"
  }
};

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "Delete"
  }
};

export const Loading: Story = {
  args: {
    loading: true,
    children: "Loading..."
  }
};
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Update `tailwind.config.ts` with new color tokens
- [ ] Update `globals.css` with type utilities
- [ ] Create `components/ui/Button.tsx`
- [ ] Create `components/ui/Input.tsx`
- [ ] Create `components/ui/Card.tsx`
- [ ] Create `components/ui/Badge.tsx`
- [ ] Create `components/consultation/ConsultationLayout.tsx`
- [ ] Create `components/dashboard/DashboardLayout.tsx`
- [ ] Set up Storybook
- [ ] Write 10+ component stories
- [ ] Accessibility audit (axe-core)
- [ ] WCAG 2.1 AA testing
- [ ] Screen reader testing (NVDA)
- [ ] Performance audit (Lighthouse)

---

## DESIGN TOKENS EXPORT (CSS Variables)

```typescript
// Design tokens can be exported for use in other platforms (mobile, etc.)
export const designTokens = {
  colors: {
    primary: "#1B6B5C",
    secondary: "#D4A574",
    // ... all colors
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px"
  },
  typography: {
    headingSm: { fontSize: "20px", fontWeight: 600, lineHeight: 1.4 },
    bodyMd: { fontSize: "16px", fontWeight: 400, lineHeight: 1.5 }
  },
  shadows: {
    card: "0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px rgba(28, 25, 23, 0.06)"
  }
};
```

---

**Document Status:** Ready for Implementation  
**Design System Version:** 2.0  
**Last Reviewed:** April 25, 2026  

**Next Steps:**  
1. Review with design team
2. Update Figma file with new tokens
3. Implement Storybook
4. Begin component development (Phase 3)
