---
name: FoodSaaS
description: Multi-tenant restaurant POS/ops SaaS — sala, cocina/KDS, caja, ventas, FEL/SUNAT, carta.
colors:
  brand-hex: "#660033"
  brand-50: "oklch(0.97 0.014 358)"
  brand-100: "oklch(0.93 0.032 358)"
  brand-200: "oklch(0.86 0.058 358)"
  brand-300: "oklch(0.74 0.09 358)"
  brand-400: "oklch(0.58 0.115 358)"
  brand-500: "oklch(0.48 0.118 358)"
  brand-600: "oklch(0.278 0.118 358)"
  brand-700: "oklch(0.23 0.102 358)"
  brand-800: "oklch(0.19 0.085 358)"
  brand-900: "oklch(0.16 0.07 358)"
  brand-950: "oklch(0.12 0.055 358)"
  primary: "oklch(0.278 0.118 358)"
  primary-foreground: "oklch(1 0 0)"
  background: "oklch(0.985 0.003 247)"
  foreground: "oklch(0.158 0.005 80)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.158 0.005 80)"
  secondary: "oklch(0.961 0.005 80)"
  secondary-foreground: "oklch(0.205 0.005 80)"
  muted: "oklch(0.961 0.005 80)"
  muted-foreground: "oklch(0.448 0.008 80)"
  accent: "oklch(0.97 0.014 358)"
  accent-foreground: "oklch(0.23 0.102 358)"
  border: "oklch(0.918 0.005 80)"
  input: "oklch(0.918 0.005 80)"
  ring: "oklch(0.278 0.118 358)"
  destructive: "oklch(0.555 0.221 26)"
  success: "oklch(0.62 0.176 142)"
  warning: "oklch(0.7 0.169 65)"
  info: "oklch(0.58 0.151 235)"
  sidebar: "oklch(1 0 0)"
  sidebar-foreground: "oklch(0.27 0.005 80)"
  sidebar-primary: "oklch(0.278 0.118 358)"
  sidebar-accent: "oklch(0.97 0.014 358)"
  sidebar-border: "oklch(0.918 0.005 80)"
typography:
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  "2xl": "16px"
  full: "9999px"
spacing:
  page-x: "16px"
  page-x-sm: "24px"
  page-gap: "20px"
  stack-sm: "8px"
  stack-md: "12px"
  stack-lg: "16px"
  cell-x: "16px"
  cell-y: "8px"
  control-h: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, oklch(0.278 0.118 358) 95%, transparent)"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
  button-export:
    backgroundColor: "color-mix(in oklch, oklch(0.62 0.176 142) 10%, transparent)"
    textColor: "#065f46"
    rounded: "{rounded.md}"
    height: "36px"
  input-default:
    backgroundColor: "color-mix(in oklch, oklch(1 0 0) 70%, transparent)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  data-table-shell:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
  page-header-title:
    textColor: "{colors.brand-600}"
    typography: "{typography.headline}"
  stat-badge-primary:
    backgroundColor: "color-mix(in oklch, oklch(0.278 0.118 358) 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  cocina-ticket:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.2xl}"
  sidebar-nav-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.brand-700}"
    rounded: "{rounded.md}"
---

# Design System: FoodSaaS

## Overview

**Creative North Star: "La Consola de Piso"**

FoodSaaS es un SaaS multi-tenant de operación gastronómica (POS/ops): sala, cocina/KDS, caja, ventas, facturación FEL/SUNAT y carta. La UI que se envía hoy es una consola de servicio — densa, legible bajo presión y anclada a un burdeos de marca (`#660033` / `brand-600`) sobre neutros stone fríos. No es marketing landing: es software de piso.

La tipografía es una sola familia (Instrument Sans). El color de acento marca cabeceras, foco, selección y CTAs; el estado operativo (libre/ocupado, fresco/caliente, éxito/error) vive en una capa semántica emerald / amber / rose / sky, nunca sustituyendo al burdeos de identidad. El shell es sidebar inset + área de contenido scrolleable; las pantallas Operate priorizan tablas densas, grids de mesas, tableros KDS y paneles de cobro.

**Key Characteristics:**
- Burdeos `#660033` como única voz de marca; stone para superficies y texto
- Densidad Operate: `text-sm`, tablas, `tabular-nums`, chips de estado compactos
- Radio suave shadcn (`--radius: 0.625rem`) — controles `md`, cards `xl`, tickets KDS `2xl`
- Elevación mínima: bordes + `shadow-xs`/`sm`; lift solo en hover de tickets
- Dark mode con superficies teñidas de burdeos, no grises neutros puros

## Colors

Paleta burgundy + stone: un acento de marca y una familia de neutros cálidos-fríos para lectura densa.

### Primary
- **Burgundy Floor** (`brand-600` / `#660033`): CTA primario, título de página (`text-brand-600`), ring de foco, progress Inertia/PWA, checks seleccionados, acentos de mesa unida, charts primarios.
- **Brand wash** (`brand-50` → `brand-200`): fondos de thead de tabla, accent de sidebar, chips `primary/10`, paneles `bg-primary/5`.
- **Brand ink** (`brand-700` / `brand-800`): texto de acento en dark/light (p. ej. títulos de ticket cocina, headers de tabla).

### Secondary
- No hay un segundo acento de marca. El rol `secondary` es un stone fill (`muted`/`secondary`) para botones secundarios y superficies quietas.

### Tertiary
Omitido — no existe un tercer acento de identidad. Los tonos emerald / amber / rose / sky / teal / violet son **estado o entidad**, no marca.

### Neutral
- **Cool Paper** (`background`): lienzo de app, ligeramente azulado.
- **Ink Stone** (`foreground`): texto principal.
- **Card White** (`card` / `popover`): superficies elevadas / paneles.
- **Quiet Stone** (`muted` / `secondary`): filas de toolbar, chips idle, fondos secundarios.
- **Muted Ink** (`muted-foreground`): descripciones, meta, timestamps.
- **Hairline** (`border` / `input`): divisores y campos; a menudo al 60% de opacidad (`border-border/60`).

### Semantic (ops)
- **Success / emerald**: listo, export, mesa libre, líneas KDS listas.
- **Warning / amber**: en espera, ocupado suave, urgencia media KDS (&lt;12 min).
- **Danger / rose–red**: destructivo, urgencia alta KDS (≥12 min), danger badges.
- **Info / sky**: badges informativos, chart-2.

### Named Rules
**The One Burgundy Rule.** El burdeos de marca es la única voz de identidad. En pantallas Operate ocupa cabeceras, foco y CTAs; el resto del color es estado semántico o acento de entidad hasheado (zonas/categorías).

**The Status Is Not Brand Rule.** Emerald/amber/rose comunican tiempo y estado de servicio. No re-pintar CTAs primarios con esos tonos.

## Typography

**Display Font:** Instrument Sans (ui-sans-serif, system-ui)
**Body Font:** Instrument Sans (misma pila)
**Label/Mono Font:** Instrument Sans; cifras con `tabular-nums` / `font-mono` solo donde el dato lo exige (series FEL, montos)

**Character:** Una sola sans operativa — clara, compacta, sin display editorial. La jerarquía se hace con peso, tamaño y color de marca, no con un segundo typeface.

### Hierarchy
- **Headline** (600, `text-2xl` / `sm:text-3xl`, tracking-tight, `text-brand-600`): título de `PageHeader` en listados y CRUDs.
- **Title** (600, ~`text-lg`, tracking-tight): títulos de ticket KDS, bloques de panel (cobro, mesa).
- **Body** (400, `text-sm`, leading relaxed en descripciones): UI default, celdas, formularios.
- **Label** (600, `text-xs`, tracking-wide): thead de `DataTable`, meta de filtros; microcopy a veces `text-[10px]`/`text-[11px]` uppercase en grupos de columna.
- **Stat / chip** (500–600, `text-xs`, rounded-full): `StatBadge` y chips de urgencia.

### Named Rules
**The Brand Title Rule.** Los `h1` de página usan `text-brand-600` vía `PageHeader`; no overridear a negro/foreground.

**The Tabular Ops Rule.** Montos, tiempos de espera, códigos de mesa y series usan `tabular-nums` (y mono cuando es identificador fiscal).

## Layout

Shell: sidebar fija (`16rem`, icon `3rem`, mobile `18rem`) + contenido inset redondeado en desktop. El área de página es columna flex scrolleable con padding canónico `p-4 sm:p-6` y ritmo vertical `gap-5` (cocina a veces `gap-4`/`sm:gap-5`).

`PageHeader` es sticky (`top-0`, blur, borde inferior suave): título + acciones en la misma fila; descripción solo desde `sm+`; stats como fila de chips debajo.

Listados: `DataTable` en card — toolbar (`px-4 py-3`, `bg-muted/20`), tabla desktop (`md+`), cards móvil. Grids Operate: mesas por zona; KDS `sm:2 / xl:3 / 2xl:4` columnas. Cobro/caja: paneles densos con montos alineados a la derecha.

Breakpoints observados vía utilidades Tailwind (`sm`, `md`, `xl`, `2xl`); no hay escala custom aparte del sidebar inset.

### Named Rules
**The Same-Row Actions Rule.** En móvil, CTA primario y acciones fuertes quedan en la fila del título; el resto va al menú `⋯` — no apilar una segunda fila de iconos.

**The Dense Floor Rule.** Pantallas de sala, cocina, caja y ventas privilegian densidad y escaneo sobre whitespace decorativo.

## Elevation & Depth

Sistema híbrido plano: profundidad por borde + tint, no por stack de sombras. Controles y tablas usan `shadow-xs`/`shadow-sm`; popovers/dialogs/toasts suben a `shadow-md`/`shadow-lg`. Hover de botón primario añade `shadow-primary/15`; tickets KDS hacen un lift leve (`-translate-y-0.5` + `shadow-md`).

Auth (login) es la excepción atmosférica: blobs aurora, border beam y world-loader — motion decorativo acotado al flujo de autenticación, no al shell Operate.

### Shadow Vocabulary
- **Rest control** (`shadow-xs` / `shadow-sm`): botones, inputs, cards, tabla.
- **Overlay** (`shadow-md` / `shadow-lg`): dropdown, dialog, sheet, toast.
- **Primary lift** (`hover:shadow-md hover:shadow-primary/15`): CTA default.
- **Ticket hover** (`hover:shadow-md` + translate): tarjetas KDS.

### Named Rules
**The Flat Floor Rule.** En Operate, las superficies en reposo son planas; la sombra responde a overlay o a hover intencional, no a “cards flotantes” por defecto.

## Shapes

Base `--radius: 0.625rem` (10px). Controles y nav items: `rounded-md` (~8px). Cards genéricas: `rounded-xl`. Shell de tabla: `rounded-lg`. Tickets cocina: `rounded-2xl`. Pills/stat badges/entity filters: `rounded-full`. Checkboxes: ~5px con borde 2px brand.

Bordes habituales `border` o `border-border/60`; selección de mesa/unión refuerza con `ring-2` burdeos. No hay geometría neobrutalista ni radius 0.

## Components

### Buttons
- **Shape:** `rounded-md`, altura default `h-9` (36px); `sm` 32px, `lg` 40px, `icon` 36×36.
- **Primary (`default`):** fondo primary, texto blanco, `shadow-sm`; hover `primary/95` + sombra tintada; `active:scale-[0.985]`; focus ring `ring-2 ring-ring/30` + offset.
- **Outline / Secondary / Ghost / Link:** outline con borde input; secondary stone; ghost solo accent hover; link subraya primary.
- **Export:** variante soft emerald (descargas/exportaciones), no confundir con success de flujo de caja.
- **Destructive:** rojo sólido.

### Chips / Stat badges / Pill filters
- **StatBadge:** pill `rounded-full`, ring inset, variantes default/primary/success/warning/danger/info/muted; valor en `tabular-nums`.
- **PillFilters:** altura touch ≥36–40px, `rounded-full`; selección llena el acento (brand o entity hash); dot de color siempre visible cuando `colored`.
- **Entity accents:** 8 tonos hasheados por id (brand, teal, amber, sky, violet, lime, orange, cyan) para zonas/categorías — distinguen entidades, no estados.

### Cards / Containers
- **Card:** `rounded-xl`, borde, `shadow-sm`, padding interno `px-6` / `py-6`, stack `gap-6`.
- **DataTable shell:** `rounded-lg`, `border-border/60`, `shadow-xs`; thead `bg-brand-50/75` + texto brand; filas `text-sm`.
- **KDS ticket:** `rounded-2xl`, barra lateral de urgencia 6px, header con meta 11px, líneas en sub-cards `rounded-xl`.

### Inputs / Fields
- **Style:** `h-9`, `rounded-md`, borde input, fondo `bg-card/70` + blur leve, `shadow-xs`.
- **Focus:** borde ring + `ring-2 ring-ring/25`; hover sube opacidad del card fill.
- **Invalid:** borde/ ring destructive.
- **Checkbox:** borde 2px brand, checked primary fill, `rounded-[5px]`, size-5.

### Navigation
- Sidebar blanca (dark: burgundy-ink), items `text-sm` `rounded-md` `h-8`; activo = `sidebar-accent` (brand-50) + texto accent-foreground.
- Logo + plan badge + user menu en header/footer del sidebar.
- Tooltips de chrome en primary fill (inverso al body).

### Signature: PageHeader
Sticky blur header; título brand; actions same-row; stats opcionales. Es el patrón obligatorio de listados (ver convención de proyecto).

### Signature: Operate surfaces
- **Sala:** `MesaFloorCard` / unión — estados emerald (libre) / amber (ocupada) / ring burdeos (selección/unión).
- **Cocina:** grid de `CocinaTicketCard` con urgencia por minutos (&lt;5 emerald, &lt;12 amber, else rose).
- **Caja / ventas / FEL:** tablas densas, montos primary/`tabular-nums`, paneles `border-primary/20 bg-primary/5` para resúmenes.

## Do's and Don'ts

### Do:
- **Do** usar tokens `brand-*` / `primary` (o `{colors.*}`) para identidad; el hex canónico de marca es `#660033`.
- **Do** montar listados con `PageHeader` + `DataTable` + padding `p-4 sm:p-6` / `gap-5`.
- **Do** expresar estado de servicio con emerald/amber/rose y cifras `tabular-nums`.
- **Do** mantener CTAs táctiles densos (`h-8`–`h-10`) y menú `⋯` en móvil para acciones secundarias.
- **Do** respetar dark mode: superficies teñidas `358` (hue brand), primary claro = `brand-400`.

### Don't:
- **Don't** introducir una segunda fuente display ni títulos negros en lugar de `text-brand-600` en páginas de app.
- **Don't** usar el burdeos como relleno masivo de pantallas Operate; es acento + voz, no wallpaper.
- **Don't** aplicar la atmósfera aurora/border-beam del login al shell de sala/caja/cocina.
- **Don't** inventar un mundo visual nuevo (otro primary, cream editorial, neobrutalismo): documentar y extender lo que ya envía `resources/css/app.css`.
- **Don't** sustituir chips de estado semántico por color de marca, ni al revés.
