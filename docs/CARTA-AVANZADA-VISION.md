# Carta avanzada — visión de producto

## Problema que resolvemos

Hoy la carta es un CRUD de productos. El restaurante necesita:

1. **Catálogo operativo** (qué se vende, a qué precio, a qué estación llega).
2. **Cartas publicables** (menú del día, parrillas de la noche, carta de terraza) con diseño, QR y PDF.

Separar ambos evita mezclar “inventario de platos” con “presentación al cliente”.

---

## Arquitectura en 2 capas

```
┌─────────────────────────────────────────────┐
│  CAPA 1 · Catálogo (registro)               │
│  Productos · Categorías · Áreas (estación)  │
│  Tabla densa + imagen + precio + activo     │
└──────────────────┬──────────────────────────┘
                   │ arrastra / asigna
┌──────────────────▼──────────────────────────┐
│  CAPA 2 · Cartas publicadas (diseño)        │
│  Fondo · layout · páginas · horario · QR    │
│  PDF con marca de agua (logo del tenant)    │
└─────────────────────────────────────────────┘
```

### Capa 1 — Catálogo (esta entrega / base)

| Concepto | Rol |
|----------|-----|
| **Categoría** | Agrupación comercial (Entradas, Bebidas…) |
| **Área** | Estación de producción (Cocina, Bar, Postres). Combobox creatable tipo raza VetSaaS. Alimenta KDS futuro. |
| **Producto** | Ítem vendible + precio + imagen + área + categoría |

Vista principal: **tabla de registros** (no cards). Las cards quedan para el diseñador de carta.

### Capa 2 — Cartas publicadas (siguiente fase)

Una **Carta** es un documento de presentación:

- Nombre (`Menú del día`, `Parrillas noche`)
- Ventana horaria / días (opcional)
- Fondo (color, imagen o plantilla)
- Páginas con secciones arrastrables
- Productos del catálogo (referencia, no copia del precio salvo snapshot al publicar)
- QR público (`/m/{slug-tenant}/{slug-carta}`)
- Export PDF multipágina + watermark con logo de Configuración › General

**Motion / UX del builder (ui-ux-pro-max):**

- Drag & drop con **alternativa teclado** (↑↓) — WCAG 2.2
- Entrada al builder: **shared element / Flip** (miniatura → canvas)
- Reordenar: **magnification** suave en el ítem activo
- Cambio de página / fondo: **crossfade** 280–400ms
- Drop zones: **blur** leve del resto del canvas
- Respetar `prefers-reduced-motion`

---

## Flujos clave

1. Registrar productos (tabla) → asignar área al vuelo → subir foto.
2. **Armar carta** → canvas → arrastrar productos → fondo → previsualizar.
3. Publicar → QR + link público.
4. Descargar PDF (si hay ≥1 página) con marca de agua.

---

## Modelo de datos (objetivo)

```
cat_areas          id, nombre, orden, activa
cat_categorias     (existente)
cat_productos      + area_id?, imagen_path?, imagen_url accessor

men_cartas         id, nombre, slug, fondo_*, vigente_desde/hasta, publicada, …
men_carta_paginas  id, carta_id, orden, titulo
men_carta_bloques  id, pagina_id, tipo(section|producto|texto), producto_id?, layout_json
```

---

## Roadmap

| Fase | Entrega |
|------|---------|
| **A (ahora)** | Áreas creatables, imagen de producto, vista tabla, CTA “Armar carta” |
| **B** | CRUD cartas + canvas DnD + fondos |
| **C** | QR público + PDF + watermark logo |
| **D** | Horarios por carta + deep link mesero |

---

## Principios de diseño

- Una acción primaria por pantalla (registrar ≠ diseñar).
- El área es del **producto** (dónde se prepara), no de la carta.
- El precio vive en el catálogo; la carta puede congelar snapshot al publicar.
- Motion ornamental, no obligatorio para completar la tarea.
