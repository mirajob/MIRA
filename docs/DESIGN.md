# MIRA — DESIGN.md

> Design system per lo sviluppo della piattaforma MIRA.
> Versione 1.0 · Aprile 2026 · Allineato a Brand Manual v1.0

Questo file vive nella root del repo. È la fonte di verità per colori, tipografia, spaziature, componenti, iconografia, motion e accessibilità. Quando c'è dubbio, vince questo file.

Stack di riferimento: **React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3 + Shadcn/UI**.

---

## Indice

1. [Filosofia di design](#1-filosofia-di-design)
2. [Foundations — colori](#2-foundations--colori)
3. [Foundations — tipografia](#3-foundations--tipografia)
4. [Foundations — spazi e griglia](#4-foundations--spazi-e-griglia)
5. [Foundations — radius, borders, motion](#5-foundations--radius-borders-motion)
6. [Componenti](#6-componenti)
7. [Logo e iconografia](#7-logo-e-iconografia)
8. [Favicon e touch icons](#8-favicon-e-touch-icons)
9. [Header e navigazione](#9-header-e-navigazione)
10. [Tailwind config completo](#10-tailwind-config-completo)
11. [Accessibilità](#11-accessibilità)
12. [Don't — errori comuni da evitare](#12-dont--errori-comuni-da-evitare)

---

## 1. Filosofia di design

**Heritage advisory meets AI-first product.** MIRA non deve sembrare un altro tool SaaS gradiente-pieno. Deve sembrare il prodotto digitale di una boutique advisory di Wall Street che casualmente ha una stack moderno.

Tre principi non negoziabili:

1. **Sobrietà sopra esuberanza.** Le superfici sono pulite, le ombre non esistono, i gradienti non esistono. Il colore è scarso e intenzionale.
2. **Tipografia è l'asset principale.** Le headline in serif Didone fanno il lavoro pesante. Tutto il resto serve la tipografia, non la sostituisce.
3. **Una sola accent color.** Petrol teal, usato con parsimonia. Mai due accent. Mai sostituire l'accent con un altro colore "per varietà".

Quando non sai cosa fare, scegli la versione più sobria.

---

## 2. Foundations — Colori

### 2.1 Palette principale

Quattro famiglie più stati semantici. Tutto qua.

```css
:root {
  /* === PRIMARY === */
  --color-navy:        #0A1F33;  /* Heritage navy — logo, headlines, gravitas */
  --color-navy-700:    #15293F;  /* Hover su navy */
  --color-navy-500:    #2A3F55;  /* Navy attenuato per illustrazioni */
  --color-navy-200:    #94A3B5;  /* Disabled, hint */
  --color-navy-100:    #D1D7DE;  /* Border, divider */
  --color-navy-50:     #F0F2F5;  /* Hover su superficie chiara, selezione */

  /* === ACCENT (usare con parsimonia) === */
  --color-petrol:      #0E5A6F;  /* Unico accent — link, focus, evidenza */
  --color-petrol-700:  #084150;  /* Hover su petrol */
  --color-petrol-100:  #B0D0D6;  /* Background per badge accent */
  --color-petrol-50:   #E6F0F2;  /* Background sottile, banner */

  /* === SURFACES === */
  --color-cream:       #F4EFE6;  /* Premium — letterhead, marketing, momenti hero */
  --color-paper:       #FAFAF7;  /* Alternativa morbida a white */
  --color-white:       #FFFFFF;  /* UI principale — superficie default */

  /* === TEXT (warm ink scale) === */
  --color-ink:           #1C1B1A;  /* Body text, paragraph */
  --color-ink-secondary: #5C5A57;  /* Caption, label secondaria */
  --color-ink-tertiary:  #8B8985;  /* Hint, placeholder, disabled */

  /* === BORDERS === */
  --color-border:        rgba(10, 31, 51, 0.12);  /* Default — divider, card */
  --color-border-strong: rgba(10, 31, 51, 0.22);  /* Hover, focus, evidenza */

  /* === STATES (uso minimo, solo dove semanticamente necessario) === */
  --color-success:     #1F7A56;
  --color-success-bg:  #E8F2EC;
  --color-warning:     #B47A14;
  --color-warning-bg:  #FAF1DD;
  --color-error:       #B33B3B;
  --color-error-bg:    #FAE9E9;
}
```

### 2.2 Regole d'uso

**Cosa va su cosa:**

| Foreground | Background | Uso |
|------------|------------|-----|
| Navy `#0A1F33` | White | Default UI |
| Navy | Cream | Marketing, hero |
| White | Navy | Knockout, navy moments |
| Ink `#1C1B1A` | White | Body text |
| Ink-secondary | White | Caption |
| Petrol `#0E5A6F` | White | Link, focus ring |
| White | Petrol | Badge accent (raro) |

**Cosa NON va mai:**

- Petrol come colore del wordmark — mai
- Navy con petrol contemporaneamente come due accent — mai
- Pure black `#000000` — usare `--color-ink` o `--color-navy`
- Pure gray Tailwind di default — usare la scala navy invece
- Gradient di qualunque tipo — mai

### 2.3 Dark mode

**Non implementare ancora.** Il brand è light-first, heritage non vive bene in dark mode senza un'estensione studiata della palette. Posporre.

Quando arriverà, sarà una palette dedicata, non un'inversione semplice.

---

## 3. Foundations — Tipografia

### 3.1 Famiglie

**Display serif — Tiempos Display** (Klim Type Foundry, licenza necessaria) o **GT Sectra Display** (Grilli Type, licenza necessaria).
Stand-in gratuito durante MVP: **Playfair Display** (Google Fonts).

```html
<!-- Caricare in <head> per Playfair durante MVP -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&display=swap" rel="stylesheet">
```

**UI sans — Inter** (Google Fonts, gratuito).

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

**Mono — JetBrains Mono** (per codice in dashboard sviluppatori, se servirà).

### 3.2 Scala tipografica

| Token | Size / Line | Family | Weight | Tracking | Uso |
|-------|-------------|--------|--------|----------|-----|
| `text-display-xl` | 56px / 1.05 | Display serif | 400 | -0.01em | Hero homepage |
| `text-display-lg` | 40px / 1.1 | Display serif | 400 | -0.005em | Page headline |
| `text-display-md` | 32px / 1.15 | Display serif | 400 | 0 | Section header importante |
| `text-h1` | 28px / 1.2 | Display serif | 400 | 0 | h1 standard |
| `text-h2` | 22px / 1.25 | Display serif | 400 | 0 | h2 |
| `text-h3` | 18px / 1.3 | UI sans | 600 | -0.005em | h3, sotto-sezione |
| `text-body-lg` | 17px / 1.6 | UI sans | 400 | 0 | Lede, intro paragrafi |
| `text-body` | 15px / 1.55 | UI sans | 400 | 0 | Body default |
| `text-body-sm` | 13px / 1.5 | UI sans | 400 | 0 | Caption, footnote |
| `text-label` | 13px / 1.4 | UI sans | 500 | 0.04em | Form label, button text |
| `text-eyebrow` | 11px / 1.4 | UI sans | 500 | 0.16em | Eyebrow uppercase |

**Regole d'oro:**

1. Display serif **mai** sotto i 18px — perde leggibilità. Sotto i 18px è sempre Inter.
2. Display serif **mai** in bold (700+). Funziona in regular (400). Se serve enfasi, salire di size.
3. **Mai** mescolare display serif e UI sans nello stesso paragrafo.
4. Tracking negativo (-0.01em) solo sopra i 32px — i Didone large hanno bisogno di stringere; sotto i 32px tracking sta a 0.
5. Eyebrow è l'unico caso in cui usiamo `text-transform: uppercase`. Mai uppercase su body, headline, button — è gridato.

### 3.3 Esempi pattern

**Hero pattern:**
```jsx
<div>
  <p className="text-eyebrow text-navy/60 mb-4">Per le aziende</p>
  <h1 className="text-display-xl text-navy mb-6">
    Trova chi sa fare le cose,<br/>non chi le scrive bene.
  </h1>
  <p className="text-body-lg text-ink-secondary max-w-2xl">
    Profili reali costruiti su simulazioni, progetti, evidenze.
    Non auto-dichiarazioni.
  </p>
</div>
```

**Section pattern:**
```jsx
<section>
  <p className="text-eyebrow text-navy/55 mb-3">Sezione 02</p>
  <h2 className="text-display-md text-navy mb-4">Come funziona</h2>
  <p className="text-body text-ink-secondary max-w-prose">...</p>
</section>
```

---

## 4. Foundations — Spazi e griglia

### 4.1 Scala spaziale (4px grid)

Tutto è basato su multipli di 4px. Tailwind: `1=4px`, `2=8px`, `4=16px`, ecc.

| Token | px | Uso tipico |
|-------|-----|------------|
| `space-1` | 4 | Gap micro, padding interno densi |
| `space-2` | 8 | Padding interno default, gap tra inline elements |
| `space-3` | 12 | Gap tra elementi correlati |
| `space-4` | 16 | Padding card, gap form |
| `space-6` | 24 | Gap tra sezioni di card, padding container small |
| `space-8` | 32 | Gap tra blocchi di contenuto |
| `space-12` | 48 | Padding container, gap tra sezioni |
| `space-16` | 64 | Spazio di rispetto, padding hero, page margin |
| `space-24` | 96 | Pause editoriali, separazione blocchi maggiori |
| `space-32` | 128 | Hero verticale grande |

### 4.2 Container

| Tipo | Max-width | Padding orizzontale |
|------|-----------|---------------------|
| Marketing page | 1200px | 24px mobile, 48px desktop |
| App content | 1280px | 16px mobile, 32px desktop |
| Reading | 720px | 16px mobile, 24px desktop |
| Modal | 480px (sm), 640px (md), 800px (lg) | 24px |

### 4.3 Pattern di griglia

Mobile-first, breakpoint Tailwind standard:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Per la dashboard: sidebar fissa 240px desktop (`md+`), full-width mobile.

---

## 5. Foundations — Radius, borders, motion

### 5.1 Border radius

| Token | px | Uso |
|-------|-----|-----|
| `radius-sm` | 4 | Badge, tag, pill |
| `radius-md` | 8 | Bottoni, input, card piccole |
| `radius-lg` | 12 | Card grandi, modal, panel |
| `radius-xl` | 16 | Hero card, illustrazioni grandi |
| `radius-full` | 9999 | Avatar, dot, indicator |

**Mai mescolare radius dentro la stessa card.** Una card `radius-lg` non contiene un bottone `radius-sm` — il bottone va `radius-md`.

### 5.2 Border weights

Solo due:
- **0.5px** standard — `border` con `--color-border`
- **1px** evidenza — `border-2` o focus state

Mai borders più spesse di 1px se non per stati di errore (2px error border).

### 5.3 Motion

Sottile, mai coreografato.

| Token | Durata | Uso |
|-------|--------|-----|
| `duration-fast` | 100ms | Hover su bottoni, link |
| `duration` | 200ms | Default — input focus, color change |
| `duration-medium` | 300ms | Modal apertura, slide |
| `duration-slow` | 500ms | Page transition, illustrazioni |

**Easing default:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out cubic).

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

**Don't:**
- Bouncy easing (`ease-out-back`, `ease-spring`) — sembra cartoonish
- Motion durature > 500ms — sembra rotto
- Effetti di entrata su page load (fade-in everywhere) — sembra di low-effort
- Parallax — basta

---

## 6. Componenti

Riferimento veloce. Per implementazione completa usare Shadcn/UI come base e applicare i token sotto.

### 6.1 Button

Quattro varianti. Mai aggiungerne altre.

#### Primary
Navy fill, white text. CTA principale di una vista.

```jsx
<button className="bg-navy text-white px-6 py-3 rounded-md text-label
                   hover:bg-navy-700 active:scale-[0.98]
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-petrol focus-visible:outline-offset-2
                   transition-colors duration-100 ease-out
                   disabled:opacity-40 disabled:cursor-not-allowed">
  Continua
</button>
```

#### Secondary
Cream fill, navy text. Azioni alternative.

```jsx
<button className="bg-cream text-navy px-6 py-3 rounded-md text-label
                   hover:bg-navy-50 active:scale-[0.98]
                   border border-border
                   transition-colors duration-100 ease-out">
  Annulla
</button>
```

#### Ghost
Transparent, navy text + border. Azioni terziarie nei list, table row actions.

```jsx
<button className="bg-transparent text-navy px-4 py-2 rounded-md text-label
                   border border-border hover:border-border-strong
                   hover:bg-navy-50">
  Modifica
</button>
```

#### Link
Petrol text, no background. Inline action.

```jsx
<a className="text-petrol underline underline-offset-2 decoration-1
              hover:text-petrol-700 hover:decoration-2">
  Scopri di più
</a>
```

**Sizes:**
- Small: `px-4 py-2 text-body-sm` (32px height)
- Medium (default): `px-6 py-3 text-label` (44px height — touch-friendly)
- Large: `px-8 py-4 text-body` (52px height — hero CTA)

### 6.2 Input fields

```jsx
<label className="block">
  <span className="text-label text-navy mb-2 block">Email universitaria</span>
  <input
    type="email"
    className="w-full px-4 py-3 rounded-md
               bg-white border border-border
               text-body text-ink
               placeholder:text-ink-tertiary
               hover:border-border-strong
               focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20
               transition-colors duration-200"
    placeholder="nome@studbocconi.it"
  />
</label>
```

Specifiche:
- Height 44px standard (touch-friendly)
- Padding interno 16px orizzontale, 12px verticale
- Background sempre `--color-white`, mai cream o navy
- Focus ring petrol con alpha 20% (sottile, non aggressivo)
- Error state: border `--color-error`, message sotto in `text-body-sm text-error`

### 6.3 Card

White surface, 0.5px border, radius-lg, padding generoso.

```jsx
<div className="bg-white border border-border rounded-lg p-6">
  <p className="text-eyebrow text-navy/55 mb-2">Categoria</p>
  <h3 className="text-h3 text-navy mb-3">Titolo card</h3>
  <p className="text-body text-ink-secondary">Descrizione...</p>
</div>
```

**Mai usare ombre.** La card si distingue dal background tramite border + radius. Se serve "lift", aumenta il border opacity (`border-border-strong`) e basta.

**Card hover:** se navigabile, `hover:border-border-strong`. Mai scale, mai shadow.

### 6.4 Badge / Tag

Pill rounded-full, padding piccolo.

```jsx
{/* Default */}
<span className="inline-flex items-center px-3 py-1 rounded-full
                 bg-navy-50 text-navy text-body-sm font-medium">
  Investment Banking
</span>

{/* Accent */}
<span className="bg-petrol-50 text-petrol-700 ...">Nuovo</span>

{/* Success */}
<span className="bg-success-bg text-success ...">Completato</span>
```

### 6.5 Table

Header in `text-eyebrow text-navy/60`. Row separator `border-border`. Padding row 16px verticale.

```jsx
<table className="w-full">
  <thead>
    <tr className="border-b border-border">
      <th className="text-left text-eyebrow text-navy/60 py-3">Studente</th>
      <th className="...">Università</th>
      <th className="...">Livello</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-border hover:bg-navy-50/50">
      <td className="py-4 text-body text-ink">M.B.</td>
      ...
    </tr>
  </tbody>
</table>
```

### 6.6 Modal / Dialog

Background overlay: `bg-navy/40` (40% navy alpha, mai pure black).
Modal surface: `bg-white rounded-lg max-w-lg p-8`.
Niente animazioni esuberanti — fade + lieve scale.

```jsx
{/* Overlay */}
<div className="fixed inset-0 bg-navy/40 backdrop-blur-[2px]
                animate-in fade-in duration-200">
  {/* Modal */}
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-lg w-full p-8
                    animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-h2 text-navy mb-3">Conferma</h2>
      <p className="text-body text-ink-secondary mb-6">...</p>
      <div className="flex justify-end gap-3">
        <button className="...secondary...">Annulla</button>
        <button className="...primary...">Conferma</button>
      </div>
    </div>
  </div>
</div>
```

### 6.7 Avatar

Circle, monogramma o iniziali. Per profili anonimi MIRA, **mai mostrare foto** — sempre iniziali su navy o petrol.

```jsx
<div className="w-10 h-10 rounded-full bg-navy text-white
                flex items-center justify-center text-label">
  MB
</div>
```

Sizes: `w-8 h-8` (32px), `w-10 h-10` (40px), `w-12 h-12` (48px), `w-16 h-16` (64px).

---

## 7. Logo e iconografia

### 7.1 File logo nel repo

Convenzione: i file SVG del brand vivono in `/public/brand/`.

```
/public/brand/
  ├── mira-lockup.svg              # Primary, navy su trasparente
  ├── mira-lockup-cream.svg        # Marketing, navy su cream
  ├── mira-lockup-knockout.svg     # White su navy
  ├── mira-monogram.svg            # M sola, navy
  └── mira-app-icon.svg            # M bianca su rounded square navy
```

### 7.2 Uso del logo nel codice

Componente React riutilizzabile per il monogramma:

```tsx
// components/brand/MiraMonogram.tsx
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "navy" | "white" | "current";
}

export function MiraMonogram({ className, variant = "navy" }: Props) {
  const fill = variant === "white" ? "#FFFFFF"
             : variant === "current" ? "currentColor"
             : "#0A1F33";
  return (
    <svg
      viewBox="-79 -120 158 140"
      className={cn("inline-block", className)}
      fill={fill}
      aria-label="MIRA"
    >
      <path d="M -59,0 L -59,-100 L -44,-100 L 0,-53 L 44,-100 L 59,-100
               L 59,0 L 44,0 L 44,-82 L 0,-29 L -44,-82 L -44,0 Z" />
    </svg>
  );
}
```

Uso:
```tsx
<MiraMonogram className="h-8 w-8" />
<MiraMonogram className="h-6 w-6 text-white" variant="current" />
```

Il lockup completo: importare l'SVG come asset e usarlo come `<img>`.

```tsx
import lockup from "/public/brand/mira-lockup.svg";
<img src={lockup} alt="MIRA" className="h-7" />
```

### 7.3 Iconografia

**Library: Lucide Icons** (https://lucide.dev). Già integrata con Shadcn/UI.

```tsx
import { ArrowRight, Search, Bell } from "lucide-react";

<Search className="w-5 h-5 text-ink-secondary" />
```

**Style:** line-only, mai filled. Stroke 1.5px è il default Lucide — non cambiare.

**Standard sizes:**

| Size Tailwind | px | Stroke | Uso |
|---------------|-----|--------|-----|
| `w-4 h-4` | 16 | 1.5 | Inline con testo, button small |
| `w-5 h-5` | 20 | 1.5 | Button medium, navigazione density alta |
| `w-6 h-6` | 24 | 1.5 | Default, navigazione standard |
| `w-8 h-8` | 32 | 1.75 | Hero feature, dashboard cards |

**Color:** `currentColor` (eredita dal contesto). In header navy, in body `text-ink-secondary`, attivo `text-petrol`.

**Don't:**
- Filled icons — solo stroke
- Mescolare stroke weight nello stesso screen
- Emoji al posto di icone — mai
- Custom SVG icon ad-hoc — se non c'è in Lucide, prima cercare in Phosphor o Tabler. Se proprio non c'è, disegnarla seguendo: 24×24 viewBox, stroke 1.5, round caps, round joins.

### 7.4 Illustrations

**Non c'è un sistema di illustrazioni nella v1.** Quando arriverà, sarà:
- Line-only, monocromo navy o petrol
- Stroke 2px a 400×400
- Stile editoriale, mai cartoonish (no Stubborn-Like-Notion-mascot)

Riferimenti aspirazionali: illustrazioni del Financial Times, Bloomberg longform, illustrazioni di articoli del NYT.

---

## 8. Favicon e touch icons

### 8.1 File necessari nel repo

```
/public/
  ├── favicon-16.png       (16×16)
  ├── favicon-32.png       (32×32)
  ├── apple-touch-icon.png (180×180, sostituisce mira-app-icon-180.png)
  ├── icon-512.png         (512×512, PWA)
  ├── icon-1024.png        (1024×1024, App Store)
  └── manifest.json
```

### 8.2 HTML head

```html
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0A1F33">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MIRA">
```

### 8.3 manifest.json

```json
{
  "name": "MIRA — University Talent Platform",
  "short_name": "MIRA",
  "description": "Profili reali, matching AI, contatti aziende.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0A1F33",
  "background_color": "#F4EFE6",
  "icons": [
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-1024.png", "sizes": "1024x1024", "type": "image/png", "purpose": "any maskable" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

### 8.4 Open Graph / Social meta

```html
<meta property="og:type" content="website">
<meta property="og:title" content="MIRA — University Talent Platform">
<meta property="og:description" content="Profili reali, matching AI, contatti aziende.">
<meta property="og:image" content="https://mira.example/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

L'immagine OG (1200×630) usa il lockup centrato su sfondo cream con tagline sotto. Generarla a parte e salvarla in `/public/og-image.png`.

---

## 9. Header e navigazione

### 9.1 Header app (post-login)

Altezza fissa **64px** (`h-16`). Background `bg-white`. Border bottom `border-b border-border`.

Layout:
- **Sinistra:** monogramma 32px + spacer 24px + nav primaria
- **Destra:** search trigger, notifiche, avatar utente

```tsx
<header className="h-16 bg-white border-b border-border px-6
                   flex items-center justify-between
                   sticky top-0 z-40">
  <div className="flex items-center gap-6">
    <Link to="/" aria-label="MIRA home">
      <MiraMonogram className="h-8 w-8" />
    </Link>
    <nav className="flex items-center gap-1">
      <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
      <NavLink to="/simulations" className={navLinkClass}>Simulazioni</NavLink>
      <NavLink to="/orientation" className={navLinkClass}>Orientamento</NavLink>
      <NavLink to="/profile" className={navLinkClass}>Profilo</NavLink>
    </nav>
  </div>

  <div className="flex items-center gap-2">
    <button aria-label="Cerca" className="...icon-button-class...">
      <Search className="w-5 h-5" />
    </button>
    <button aria-label="Notifiche" className="...">
      <Bell className="w-5 h-5" />
    </button>
    <button className="ml-2"><Avatar /></button>
  </div>
</header>
```

`navLinkClass` esempio:
```ts
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn("px-3 py-2 rounded-md text-label transition-colors",
     isActive
       ? "text-navy bg-navy-50"
       : "text-ink-secondary hover:text-navy hover:bg-navy-50/50");
```

### 9.2 Header marketing (pre-login)

Altezza **80px** (`h-20`). Background `bg-cream`. Più aria, più heritage.

Layout:
- **Sinistra:** lockup completo (`h-7`)
- **Centro/Destra:** link minimi (Per studenti, Per aziende, Associazioni) + CTA "Accedi" (link) + "Inizia" (primary)

```tsx
<header className="h-20 bg-cream px-6 lg:px-12
                   flex items-center justify-between">
  <Link to="/"><img src={lockup} alt="MIRA" className="h-7" /></Link>
  <nav className="hidden md:flex items-center gap-8">
    <a className="text-body text-navy hover:text-petrol">Per studenti</a>
    <a className="text-body text-navy hover:text-petrol">Per aziende</a>
    <a className="text-body text-navy hover:text-petrol">Associazioni</a>
  </nav>
  <div className="flex items-center gap-4">
    <a className="text-body text-navy hover:text-petrol">Accedi</a>
    <button className="...primary...">Inizia</button>
  </div>
</header>
```

### 9.3 Sidebar dashboard (alternativa)

Quando la nav primaria diventa profonda (admin, aziende), passare a sidebar laterale fissa.

- Width: **240px** desktop, full-width drawer mobile
- Background: `bg-white`
- Border destro: `border-r border-border`
- Padding top: 24px
- Logo monogramma + wordmark in alto

### 9.4 Footer marketing

Background `bg-navy`, text `text-white/80`. Lockup knockout in alto, colonne di link sotto.

---

## 10. Tailwind config completo

Copia-paste-able. Estende il default Tailwind senza sostituirlo.

```js
// tailwind.config.js
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0A1F33",
          50:  "#F0F2F5",
          100: "#D1D7DE",
          200: "#94A3B5",
          500: "#2A3F55",
          700: "#15293F",
          900: "#0A1F33",
        },
        petrol: {
          DEFAULT: "#0E5A6F",
          50:  "#E6F0F2",
          100: "#B0D0D6",
          500: "#0E5A6F",
          700: "#084150",
        },
        cream: "#F4EFE6",
        paper: "#FAFAF7",
        ink: {
          DEFAULT: "#1C1B1A",
          secondary: "#5C5A57",
          tertiary:  "#8B8985",
        },
        border: {
          DEFAULT: "rgba(10, 31, 51, 0.12)",
          strong:  "rgba(10, 31, 51, 0.22)",
        },
        success: { DEFAULT: "#1F7A56", bg: "#E8F2EC" },
        warning: { DEFAULT: "#B47A14", bg: "#FAF1DD" },
        error:   { DEFAULT: "#B33B3B", bg: "#FAE9E9" },
      },
      fontFamily: {
        display: ['"Tiempos Display"', '"Playfair Display"', "Georgia", "serif"],
        sans:    ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1.05", letterSpacing: "-0.01em",  fontWeight: "400" }],
        "display-lg": ["40px", { lineHeight: "1.1",  letterSpacing: "-0.005em", fontWeight: "400" }],
        "display-md": ["32px", { lineHeight: "1.15", fontWeight: "400" }],
        "h1":         ["28px", { lineHeight: "1.2",  fontWeight: "400" }],
        "h2":         ["22px", { lineHeight: "1.25", fontWeight: "400" }],
        "h3":         ["18px", { lineHeight: "1.3",  letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-lg":    ["17px", { lineHeight: "1.6",  fontWeight: "400" }],
        "body":       ["15px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm":    ["13px", { lineHeight: "1.5",  fontWeight: "400" }],
        "label":      ["13px", { lineHeight: "1.4",  letterSpacing: "0.04em",   fontWeight: "500" }],
        "eyebrow":    ["11px", { lineHeight: "1.4",  letterSpacing: "0.16em",   fontWeight: "500" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      transitionTimingFunction: {
        out:    "cubic-bezier(0.22, 1, 0.36, 1)",
        inOut:  "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        100: "100ms",
        200: "200ms",
        300: "300ms",
        500: "500ms",
      },
      maxWidth: {
        prose:    "65ch",
        marketing:"1200px",
        app:      "1280px",
        reading:  "720px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
};

export default config;
```

### 10.1 globals.css (CSS reset + base)

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-white text-ink font-sans text-body;
  }

  /* Focus ring globale */
  *:focus-visible {
    outline: 2px solid theme("colors.petrol.DEFAULT");
    outline-offset: 2px;
    border-radius: 2px;
  }

  /* Selezione testo */
  ::selection {
    background: theme("colors.petrol.50");
    color: theme("colors.navy.DEFAULT");
  }

  /* Heading di default usano display serif */
  h1, h2 { @apply font-display; }
  h3, h4, h5, h6 { @apply font-sans font-semibold; }
}
```

---

## 11. Accessibilità

Non opzionale. Ogni screen che esce dal repo è testato.

### 11.1 Contrasto

Tutte le combo testo/sfondo del sistema di base passano WCAG AA:

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| Navy `#0A1F33` | White | **17.4:1** | AAA |
| Ink `#1C1B1A` | White | **16.0:1** | AAA |
| Ink-secondary `#5C5A57` | White | **6.8:1** | AA |
| Ink-tertiary `#8B8985` | White | **3.6:1** | AA Large only |
| Petrol `#0E5A6F` | White | **6.8:1** | AA |
| White | Navy | **17.4:1** | AAA |
| Navy | Cream | **15.5:1** | AAA |

`text-ink-tertiary` può essere usato solo per testo ≥ 18px o ≥ 14px bold (AA Large).

### 11.2 Focus

Focus visible **sempre**. Mai rimuovere `outline` senza sostituirlo.
Default: outline 2px petrol con offset 2px (vedi globals.css sopra).

### 11.3 Touch targets

Mai sotto **44×44px** su mobile. Padding interno minimo 12px su elementi tappabili.

### 11.4 Semantica

- Bottoni che fanno azioni → `<button>`
- Link che navigano → `<a>` o `<Link>`
- Mai `<div onClick>`
- Form label sempre legati a input via `for` / `htmlFor`
- Icone decorative: `aria-hidden="true"`. Icone funzionali (icon-only button): `aria-label` obbligatorio.
- `lang="it"` su `<html>`

### 11.5 Riduzione motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. Don't — errori comuni da evitare

Lista di cose che spesso si infilano nei prodotti SaaS e che MIRA non deve fare. Quando un dev ha dubbio, controlli qua prima.

### 12.1 Visual

- ❌ Box shadow su card, bottoni, modal
- ❌ Gradient su qualunque cosa
- ❌ Glassmorphism / backdrop-blur grossi
- ❌ Pure black `#000000` o pure white text on dark — usare warm ink/cream
- ❌ Più di un accent color contemporaneamente
- ❌ Petrol teal sul wordmark MIRA
- ❌ Icone filled
- ❌ Mescolare radius dentro la stessa card (radius-sm dentro radius-lg)
- ❌ Border > 1px (eccetto error state)

### 12.2 Tipografia

- ❌ Display serif sotto i 18px
- ❌ Display serif in bold
- ❌ Mescolare display serif e sans nello stesso paragrafo
- ❌ ALL CAPS su body o headline (solo eyebrow)
- ❌ Tracking positivo su body (genera "spread" leggibile-ma-spento)
- ❌ Line-height < 1.4 su testo lungo
- ❌ Font Inter pesi diversi da 400/500/600 (700+ è troppo pesante per Inter, 300 è troppo leggero)

### 12.3 Motion

- ❌ Bouncy / spring easing
- ❌ Page transition fancy (parallax, fade-up sequenziali, ecc.)
- ❌ Scroll-jacking di qualsiasi tipo
- ❌ Loading spinner generici Material — usare progress bar minimale petrol
- ❌ Skeleton shimmer aggressivi — preferire skeleton statici cream/paper

### 12.4 UX

- ❌ Toast con auto-dismiss veloce (< 4 secondi) per messaggi importanti
- ❌ Modal nested (modal dentro modal)
- ❌ Tooltip con info essenziali (non scopribile su touch)
- ❌ Dropdown con > 8 voci senza search
- ❌ Empty state senza CTA o spiegazione
- ❌ Error message generici tipo "Something went wrong"

### 12.5 Performance

- ❌ Caricare Playfair Display in tutti i 9 weight (servono solo 400, 400 italic, 700)
- ❌ Importare Lucide intero invece dei singoli icon
- ❌ Immagini PNG dove va SVG
- ❌ `<img>` senza `width`/`height` (causa CLS)

---

## Versioning

Quando il design system evolve, aggiornare la versione in cima al file e mantenere CHANGELOG.md a parte. Breaking changes (rinominare token, rimuovere colori) richiedono major bump e nota di migrazione.

**v1.0** · Aprile 2026 · Setup iniziale post-brand-lock
