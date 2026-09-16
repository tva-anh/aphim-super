---
name: enterprise-ui-design
description: >-
  Enterprise-grade UI/UX design suite inspired by Linear, Vercel, Stripe, and Netflix Studio.
  Includes modern dark glassmorphism design tokens, micro-interactions, Command Palette (Ctrl+K),
  Slide-over drawers, responsive data grids, KPI metric cards, and cohesive aesthetic principles.
---

# 🎨 Enterprise UI/UX Design System Guide

This skill provides a comprehensive design system, CSS architecture, and component library for crafting top-tier web applications and admin suites.

---

## 💎 1. Core Visual Aesthetics & Design Philosophy

### Color Tokens (Modern Deep Dark HSL Palette)
```css
:root {
  /* Background layers */
  --bg-primary: #07090e;        /* Deepest canvas */
  --bg-secondary: #0d111c;      /* Base container */
  --bg-surface: #131827;        /* Cards & panels */
  --bg-surface-hover: #1b2237;  /* Hover state */
  --bg-glass: rgba(19, 24, 39, 0.75);
  
  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-glow: rgba(99, 102, 241, 0.35);

  /* Primary Accent & Glows */
  --primary: #6366f1;           /* Indigo core */
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  --primary-glow: rgba(99, 102, 241, 0.25);

  /* Semantic Status Colors */
  --accent-gold: #fcd576;       /* Xu / Coin / Reward */
  --accent-gold-dark: #f59e0b;
  --accent-emerald: #10b981;    /* Success / Active / Online */
  --accent-cyan: #38bdf8;       /* Streaming / Links / Info */
  --accent-pink: #ec4899;       /* VIP / Exclusive */
  --accent-rose: #f43f5e;       /* Danger / Block / Ban */

  /* Typography */
  --text-white: #ffffff;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  /* Elevation Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(99, 102, 241, 0.15);

  /* Transitions */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 🧩 2. Essential Component Patterns

### A. Glassmorphic Surface
```css
.glass-panel {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-default);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  transition: all 0.25s var(--ease-spring);
}
.glass-panel:hover {
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: var(--shadow-lg);
}
```

### B. KPI Summary Stat Card
```html
<div class="kpi-card">
  <div class="kpi-icon-wrap">
    <i data-lucide="activity"></i>
  </div>
  <div class="kpi-body">
    <span class="kpi-label">DOANH THU THÁNG</span>
    <div class="kpi-value">42.500.000đ</div>
    <div class="kpi-trend positive">
      <i data-lucide="trending-up"></i> +14.2% so với tháng trước
    </div>
  </div>
</div>
```

### C. Slide-Over Detail Drawer
```css
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 13, 0.7);
  backdrop-filter: blur(6px);
  z-index: 1999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.drawer-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.slide-drawer {
  position: fixed;
  top: 0;
  right: -620px;
  width: 600px;
  max-width: 95vw;
  height: 100vh;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-default);
  box-shadow: -16px 0 40px rgba(0, 0, 0, 0.8);
  z-index: 2000;
  transition: right 0.35s var(--ease-spring);
  display: flex;
  flex-direction: column;
}
.slide-drawer.open {
  right: 0;
}
```

### D. Command Palette (`Ctrl+K`)
- Minimalist floating search box centered at `15vh` from top.
- Auto-focused search input with keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- Grouped search results: Quick Actions, Navigation Jump, Data Matches.

---

## ⚡ 3. Micro-Animations & Interaction Rules
1. **Button Hover Elevation:** `transform: translateY(-2px); box-shadow: 0 6px 20px var(--primary-glow);`
2. **Button Active Pressed:** `transform: scale(0.97);`
3. **Table Row In:** `animation: rowFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;`
4. **Skeleton Loading:** Linear gradient shimmer from `rgba(255,255,255,0.03)` to `rgba(255,255,255,0.08)`.
