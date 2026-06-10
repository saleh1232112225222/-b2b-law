# UI/UX Redesign — B2B-LAW Practice Management SaaS

> Use this prompt with any AI model (GPT-4, Claude, Gemini, etc.) to redesign the frontend of a law practice management SaaS without touching business logic or backend code.

---

## Role

You are a world-class UI/UX designer and front-end architect specializing in enterprise SaaS platforms. Your expertise spans Material Design 3, Apple HIG, responsive design, and high-end legal tech interfaces.

## Objective

Redesign and modernize the front-end of a cloud-based law practice management system (Vue 3 + Vuetify 3 + Tailwind CSS). The app is fully functional — the goal is **cosmetic and UX improvements only**. Do NOT modify business logic, API calls, data flows, route paths, component props, Pinia stores, or database schemas.

## Constraints (DO NOT BREAK)

1. **No business logic changes** — Never alter `.ts` logic, API calls, store actions, computed properties, or watchers.
2. **No API / route / database changes** — All endpoint URLs, route names, store keys, and localStorage keys must remain identical.
3. **No component contract changes** — Props, emits, slots, and exposed methods on existing components must stay the same.
4. **No functionality removal** — Every button, link, filter, sort, export, and action must continue working as before.

## Scope — What You CAN Touch

| Area | Details |
|------|---------|
| **Visual design** | Colors, typography, spacing, shadows, borders, glassmorphism, gradients |
| **Layout** | Sidebar, header, content area, responsive breakpoints, grid structure |
| **Animations** | Page transitions, hover states, skeleton loaders, micro-interactions, loading states |
| **Components styling** | Buttons, cards, tables, dialogs, forms, notifications, chips, badges |
| **Dashboard** | KPI cards, charts (Chart.js / ApexCharts), stats layout, quick actions |
| **Reports** | Interactive filtering, PDF/Excel export buttons, chart integration, KPI display |
| **Responsive** | Mobile navigation (bottom nav / drawer), touch-friendly tables, collapsible sections |
| **Theme** | Dark/Light mode refinement, CSS variable consistency, Tailwind integration |
| **Design system** | Unified component tokens, consistent border-radius, elevation, spacing scale |

## Design Direction

### Brand Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `primary` | Navy `#1A437D` | Gold `#E9C349` | Nav, CTAs, active states |
| `accent` | Gold `#E9C349` | Gold `#E9C349` | Highlights, badges, icons |
| `surface` | White `#FFFFFF` | Charcoal `#111622` | Cards, dialogs, drawers |
| `background` | Warm sand `#F1F5F9` | Deep `#050A15` | Page background |
| `error` | Rose `#E53935` | Rose `#EF5350` | Alerts, validation |
| `success` | Emerald `#2E7D32` | Emerald `#66BB6A` | Confirmations, status |

### Typography
- **Arabic**: Cairo (400/500/600/700/800 weights)
- **English/Latin**: Inter (400/500/600/700 weights)
- **Monospace**: JetBrains Mono (code snippets, case numbers)
- Scale: 12/14/16/18/20/24/30/36/48 px

### Design Principles
- **Enterprise elegance** — Clean, spacious, authoritative. Think Clio + Notion + Bloomberg Terminal.
- **Data density** — Tables should show maximum info without clutter. Use sticky headers, row hover, inline actions.
- **Progressive disclosure** — Show essentials first, reveal complexity on demand (expandable rows, slide-over panels).
- **Consistent rhythm** — 8px grid spacing. Cards use 16/24/32px padding. Border-radius: 8px (small), 12px (medium), 16px (large).
- **RTL-first** — Everything designed for Arabic right-to-left. Mirror layout automatically (Vuetify handles this).

## Key Pages to Redesign

1. **Login** (`/login`) — Premium glassmorphism card, animated background, social login
2. **Dashboard** (`/dashboard`) — KPI row (6 cards), case status donut chart, monthly sessions bar chart, recent activities feed, quick action FAB
3. **Cases** (`/cases`, `/cases/:id`) — Advanced data table with filters, case detail with timeline + tabs
4. **Clients / Defendants** — Contact cards, profile headers, phone/email quick actions
5. **Sessions / Calendar** — Month/week/day views, session cards with status badges
6. **Documents** — File grid/list toggle, folder tree, drag-drop upload zone
7. **Finance** — Invoice table, payment status chips, summary bar
8. **Reports** — Filter bar (date range, user, case type), chart grid, export dropdown, KPI summary
9. **Settings / Profile** — Sectioned form layout, avatar upload, toggle switches

## Deliverables

For each page/component, produce:

1. **Template** (`.vue` `<template>`) — Semantic, clean, RTL-aware, responsive structure
2. **Script** (`.vue` `<script setup>`) — Only touch `ref`, `computed`, and `onMounted` if adding UI state (loading, skeleton visible, animation flags). Never change imports that touch stores/API.
3. **Style** (`.vue` `<style scoped>`) — Use scoped styles. Leverage CSS variables for theming. Prefer Tailwind utility classes (`tw-` prefix) for spacing/typography.
4. **Responsive variants** — Mobile-first breakpoints: `xs` (<600), `sm` (600+), `md` (960+), `lg` (1280+), `xl` (1920+)
5. **Accessibility** — ARIA labels, focus indicators, keyboard navigation, `role` attributes where needed

## Tech Stack Context

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **UI Library**: Vuetify 3 (Beta) — keep `v-` components; you can add native elements for animations
- **CSS**: Tailwind with `tw-` prefix (e.g., `tw-flex`, `tw-p-4`), scoped CSS, CSS variables
- **Charts**: Chart.js via `vue-chartjs` or ApexCharts (already imported)
- **Icons**: Lucide icons via custom `<LucideIcon name="..." />` component
- **Routing**: Vue Router 4 (hash history)
- **State**: Pinia stores (DO NOT modify)
- **API**: `window.api.*` (Cloud via Axios or Desktop via IPC)
- **Build**: Vite 7
- **RTL**: Vuetify `dir="rtl"` on `<v-app>`

## What to Avoid

- ❌ Creating new store actions or modifying existing ones
- ❌ Changing API endpoint paths or adapter methods
- ❌ Deleting or renaming files
- ❌ Restructuring the file/folder layout
- ❌ Changing route guard logic
- ❌ Modifying `v-model` bindings or form submit handlers
- ❌ Removing existing CSS classes that might be targeted by tests

## Quality Checklist

- [ ] All 35 existing Vitest tests pass
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` completes with zero errors
- [ ] No new console warnings or errors
- [ ] Responsive on 375px, 768px, 1024px, 1440px
- [ ] Dark/Light mode both render correctly
- [ ] RTL layout is consistent (Arabic text, icon placement, drawer side)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Skeleton loaders shown during async operations
- [ ] Export buttons (PDF/Excel) trigger the correct existing handlers

---

**Start with the Dashboard** — it's the highest-impact page and sets the design tone for the entire app.
