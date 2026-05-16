# AGENTS.md — SokoDeal

This file defines mandatory coding rules for AI agents working on SokoDeal.

SokoDeal is a mobile-first marketplace for Kigali, Rwanda.

---

## 1. ABSOLUTE RULES

Never violate these rules.

- Never use `source/app/`. Always use `src/app/`.
- Never create files in bare `components/`. Always use `src/components/`.
- Never invent REST endpoints like `/api/...` unless the endpoint already exists and is explicitly required.
- Always use Supabase client direct calls:
  - `supabase.from(...).select()`
  - `supabase.from(...).insert()`
  - `supabase.from(...).update()`
  - `supabase.from(...).delete()`
- Never bypass Supabase RLS.
- Every Supabase table used by the app must have RLS enabled and policies defined.
- Never hardcode user-facing colors outside documented exceptions.
- Never use arbitrary `z-index` values.
- Never show fake numbers, fake badges, fake stats, fake views, fake favorites, fake seller scores, or fake notifications.
- Never expose private user data on public pages.
- Never expose `phone`, `email`, or private preferences on `/vendeur/[id]`.
- Never break the current BottomNav routes.
- Never implement full dark mode unless explicitly requested.
- Never implement full i18n or install `next-intl` unless explicitly requested.
- Never remove legacy `--soko-*` tokens until all old components stop using them.
- Never rewrite the whole app at once. Migrate progressively.
- Never create dashboard-looking UI. SokoDeal must stay warm, simple, premium, mobile-first.

---

## 2. TECH STACK

Use and respect the current stack:

- Next.js 16
- React 19
- TypeScript
- Supabase
- Tailwind CSS 4
- Netlify
- Lucide React icons only

Project conventions:

- App Router only.
- Use `src/app/` for routes.
- Use `src/components/` for components.
- Use `src/lib/` for shared utilities.
- Use `src/styles/` only if the project already has it or a spec explicitly asks for it.

---

## 3. DESIGN SYSTEM v4.0

Use `--sd-*` tokens for all new code.

### Colors

```css
--sd-bg: #FAF7EF;
--sd-surface: #FFFCF7;
--sd-beige: #F3E7D1;
--sd-primary: #15803D;
--sd-primary-dark: #0F5A2A;
--sd-primary-soft: #F0FAF4;
--sd-primary-muted: #DCFCE7;
--sd-border: #E8E0D4;
--sd-text: #111827;
--sd-muted: #6F6B63;

--sd-error: #B91C1C;
--sd-error-bg: #FEF2F2;
--sd-error-text: #B91C1C;

--sd-active-bg: #E8F5EE;
--sd-active-text: #166534;

--sd-pending-bg: #FEF3C7;
--sd-pending-text: #92400E;

--sd-sold-bg: #F3F4F6;
--sd-sold-text: #374151;

--sd-success-bg: #F0FAF4;
--sd-success-border: #DFF3E8;
--sd-success-text: #0B3D27;

--sd-info-bg: #F0FAF4;
--sd-info-border: #DFF3E8;
--sd-info-text: #0B3D27;

--sd-warning-bg: #FAECC9;
--sd-warning-border: #E0A12F;
```

### Typography

```css
--sd-font-body: "Inter", sans-serif;
--sd-font-display: "Syne", sans-serif;
```

Rules:

- Titles use Syne.
- Body text uses Inter.
- Prices use Inter, bold, tabular numbers.
- Icons use Lucide React only.

### Radius

```css
--sd-radius-sm: 6px;
--sd-radius-md: 10px;
--sd-radius-lg: 14px;
--sd-radius-xl: 18px;
--sd-radius-pill: 999px;
```

### Spacing

```css
--sd-space-1: 4px;
--sd-space-2: 8px;
--sd-space-3: 12px;
--sd-space-4: 16px;
--sd-space-5: 20px;
--sd-space-6: 24px;
--sd-space-8: 32px;
--sd-space-10: 40px;
--sd-space-12: 48px;
```

### Shadows

```css
--sd-shadow-sm: 0 1px 2px rgba(17,24,39,0.06);
--sd-shadow-card: 0 4px 14px rgba(17,24,39,0.06);
--sd-shadow-floating: 0 8px 24px rgba(17,24,39,0.10);
--sd-shadow-fab: 0 4px 16px rgba(21,128,61,0.28);
```

### Z-index

```css
--sd-z-sticky: 200;
--sd-z-header: 300;
--sd-z-bottom-nav: 400;
--sd-z-overlay: 800;
--sd-z-sheet: 850;
--sd-z-modal: 900;
--sd-z-toast: 1000;
```

Never use arbitrary z-index values.

### Layout

```css
--sd-header-height: 56px;
--sd-bottom-nav-height: 64px;
--sd-content-padding: 16px;
--sd-max-width: 480px;
```

### Motion

```css
--sd-duration-fast: 120ms;
--sd-duration-default: 200ms;
--sd-duration-slow: 320ms;
--sd-ease: ease;
--sd-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--sd-ease-in: ease-in;
```

### Documented exceptions

Only these hardcoded colors are allowed:

- `#D6D3D1` for toggle OFF state only.
- `#25D366` for WhatsApp only.
- `#050505` for fullscreen image viewer only.
- Red destructive tones such as `rgba(185,28,28,...)` for destructive actions only.

---

## 4. LEGACY TOKENS

The project still uses legacy `--soko-*` tokens.
Do not remove them until all components are migrated.

Legacy tokens may remain as fallbacks:

```css
var(--sd-primary, var(--soko-green-800))
```

New code must use `--sd-*`.

---

## 5. SUPABASE PATTERNS

Use Supabase client direct.

Correct:

```ts
const { data, error } = await supabase
  .from('listings')
  .select('*')
  .eq('status', 'active');
```

Incorrect:

```ts
await fetch('/api/listings');
```

Do not invent REST endpoints.

### Required public listing filters

When reading public listings:

```ts
const now = new Date().toISOString();

const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('status', 'active')
  .is('deleted_at', null)
  .or(`expires_at.is.null,expires_at.gt.${now}`);
```

### Private user queries

Always filter by the current user:

```ts
.eq('user_id', session.user.id)
```

or:

```ts
.eq('seller_id', session.user.id)
```

### RLS

Every table must have:

```sql
alter table table_name enable row level security;
```

Policies must explicitly define:

- `select`
- `insert`
- `update`
- `delete`

as needed.

### Public profiles

Do not expose profiles directly for public seller pages.
Use a safe view such as `public_profiles`.

Public seller pages must not select:

- `phone`
- `email`
- notification preferences
- private account settings

---

## 6. STORAGE PATTERNS

Buckets:

- `avatars`
- `listing-images`

If using `getPublicUrl()`, the bucket must be public in Supabase Dashboard.

Upload rules:

- Disable CTA during upload.
- Only update URL after successful upload.
- Handle retry.
- Never lose the previous valid image if upload fails.
- Compress images before upload when possible.

---

## 7. MOBILE-FIRST RULES

SokoDeal is mobile-first.

Mandatory:

- Max page width: 480px.
- Test iPhone SE width: 375px.
- Use safe-area padding.
- Touch targets must be at least 44px × 44px.
- No horizontal overflow.
- BottomNav must respect `env(safe-area-inset-bottom)`.
- Sticky bottom CTAs must not cover content.
- Prefer bottom sheets over desktop-style modals.
- Keep UI warm, lightweight, breathable.

Use:

```css
max-width: var(--sd-max-width);
padding-bottom: calc(var(--sd-bottom-nav-height) + 24px + env(safe-area-inset-bottom));
```

---

## 8. I18N-READY RULES

SokoDeal will support later:

- French default
- English
- Kinyarwanda
- Swahili

Do not implement full i18n yet.
Do not install `next-intl` yet.
But all new code must be i18n-ready.

### Text

Avoid hardcoded user-facing JSX text.

Prefer:

```ts
const UI_TEXT = {
  searchPlaceholder: 'Rechercher une annonce...',
};
```

Then:

```tsx
<p>{UI_TEXT.searchPlaceholder}</p>
```

### Naming

Do not use language-specific names.

Incorrect:

```ts
frenchLabel
texteFr
```

Correct:

```ts
label
uiText
```

### Numbers and dates

Use:

- `Intl.NumberFormat`
- `Intl.DateTimeFormat`
- `Intl.RelativeTimeFormat`

Use helpers from:

```txt
src/lib/format.ts
```

### Logic

Do not base business logic on translated labels.

Incorrect:

```ts
if (zone === 'Kigali City Center')
```

Correct:

```ts
if (zone === ZONES.KIGALI_CITY_CENTER)
```

---

## 9. DARK MODE READY RULES

Do not implement full dark mode yet unless requested.
But new code must be dark-mode-ready.

Use tokens only:

```css
background: var(--sd-bg);
color: var(--sd-text);
border-color: var(--sd-border);
```

Do not hardcode light colors in components.

Dark mode is prepared through:

```css
[data-theme="dark"] {
  ...
}
```

---

## 10. EXISTING COMPONENTS

Do not recreate existing components unless they are broken.

Check these first:

- `src/components/Header.tsx`
- `src/components/navigation/BottomNav.tsx`
- `src/components/listings/ListingCard.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Chip.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/lib/supabase.ts`
- `src/lib/format.ts`
- `src/lib/categories.ts`

If a component exists:

- improve it,
- migrate it to DS v4.0,
- keep compatibility,
- avoid duplicate components with similar responsibilities.

---

## 11. OFFICIAL ROUTES

Current official BottomNav routes:

```txt
/          Accueil
/favoris   Favoris
/publier   Publier
/messages  Messages
/profil    Profil
```

Do not replace BottomNav routes unless explicitly requested.

Core marketplace routes:

```txt
/                       Accueil
/explorer               Explorer
/annonce/[id]           Page annonce
/publier                Publier une annonce
/favoris                Favoris
/mes-annonces           Mes annonces
/vendeur/[id]           Profil vendeur public
```

Messaging routes:

```txt
/messages               Liste conversations
/messages/[id]          Conversation individuelle
```

Account routes:

```txt
/auth                   Auth
/profil                 Profil privé
/profil/edit            Édition profil
/profil/confidentialite Confidentialité
/profil/notifications   Préférences notifications
/profil/recommandations Astuces & améliorations
/parametres             Paramètres
```

Utility routes:

```txt
/notifications           Notifications
/alertes                 Alertes
/aide                    Aide & support
```

Legacy or migration routes:

```txt
/u/[username]            Legacy seller public page
/modifier/[id]           Legacy edit listing page
/admin                   Admin legacy
/abonnement              V2/payment related
/verification            Legacy verification
/verification-identite   Legacy identity verification
```

These may exist and must be handled carefully.
Do not delete legacy routes without checking references.

---

## 12. AUTH RULES

Official auth modes:

```txt
/auth?mode=login
/auth?mode=signup
/auth?mode=verify
/auth?mode=forgot
/auth?mode=reset
```

Use `mode=signup`, not `mode=register`.

Redirect must be internal only.

Reject:

```txt
https://external.com
//external.com
```

Use safe redirects:

```ts
function getSafeRedirect(value: string | null) {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}
```

---

## 13. DATA RULES

Never invent data.

If a value is missing:

- hide the section,
- show a soft empty state,
- use a neutral fallback,
- never fake the value.

Examples:

- No fake views.
- No fake favorite counts.
- No fake unread counts.
- No fake seller verified badge.
- No fake seller score.
- No fake reviews.
- No fake notifications.

---

## 14. MIGRATION RULES

The current code may still use:

- `ads`
- `users`
- `saved_searches`
- `search_history`
- `boosts`
- `payments`
- `reviews`

Target schema uses:

- `listings`
- `profiles`
- `favorites`
- `conversations`
- `messages`
- `notifications`
- `saved_alerts`
- `support_tickets`
- `seller_stats`
- `seller_recommendations`
- `listing_drafts`

Migrate progressively.
Do not rename everything at once.

Recommended mapping:

```txt
ads              → listings
users            → profiles
saved_searches   → saved_alerts
search_history   → local history or analytics later
reviews          → v2
boosts/payments  → v2
```

---

## 15. UI/UX RULES

SokoDeal tone:

- warm
- human
- simple
- calm
- premium
- trustworthy

Avoid:

- cold dashboard UI
- aggressive validation
- too many badges
- noisy notifications
- cluttered cards
- complex desktop patterns

Validation should be soft and helpful.
Loading should never be a blank spinner for long actions.

Use:

- skeletons
- helpful loading text
- retry states
- empty states

---

## 16. BEFORE EVERY COMMIT

Check:

- [ ] Uses `src/app` and `src/components` only
- [ ] No `source/app`
- [ ] No invented REST endpoint
- [ ] Supabase client direct
- [ ] RLS respected
- [ ] No private data exposed
- [ ] Design tokens `--sd-*` used
- [ ] Legacy `--soko-*` not removed prematurely
- [ ] No arbitrary z-index
- [ ] No fake numbers or fake badges
- [ ] Mobile width 375px works
- [ ] No horizontal overflow
- [ ] Touch targets >= 44px
- [ ] Safe-area respected
- [ ] Loading state exists
- [ ] Empty state exists
- [ ] Error state exists
- [ ] Auth redirect works if page is protected
- [ ] Text is i18n-ready
- [ ] Numbers/dates use Intl or `src/lib/format.ts`
- [ ] Dark-mode-ready tokens used
- [ ] Existing components reused where possible
- [ ] BottomNav routes unchanged
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## 17. PRIORITY ORDER

When improving the project, follow this order:

1. `globals.css` tokens
2. `src/lib/format.ts`
3. BottomNav
4. Header
5. ListingCard
6. Supabase schema/RLS
7. Accueil
8. Explorer
9. Page annonce
10. Publier
11. Favoris
12. Profil
13. Messages/Auth
14. New account pages

Do not start with advanced pages before the foundations are stable.

---

## 18. FINAL PRINCIPLE

Stabilize first.
Then harmonize.
Then migrate.
Then extend.

Do not rewrite everything at once.
