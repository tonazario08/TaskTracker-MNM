---
name: TaskTracker
colors:
  surface: '#fcf8f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f3'
  surface-container: '#f0eded'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e2'
  on-surface: '#1c1b1c'
  on-surface-variant: '#44474a'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0f0'
  outline: '#75777b'
  outline-variant: '#c5c6ca'
  surface-tint: '#5b5f63'
  primary: '#0c1014'
  on-primary: '#ffffff'
  primary-container: '#212529'
  on-primary-container: '#888c91'
  inverse-primary: '#c3c7cc'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#e1e3e4'
  on-secondary-container: '#626566'
  tertiary: '#150e09'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b231d'
  on-tertiary-container: '#968981'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e3e8'
  primary-fixed-dim: '#c3c7cc'
  on-primary-fixed: '#181c20'
  on-primary-fixed-variant: '#43474c'
  secondary-fixed: '#e1e3e4'
  secondary-fixed-dim: '#c5c7c8'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#454748'
  tertiary-fixed: '#efe0d6'
  tertiary-fixed-dim: '#d2c4bb'
  on-tertiary-fixed: '#221a14'
  on-tertiary-fixed-variant: '#4f453e'
  background: '#fcf8f8'
  on-background: '#1c1b1c'
  surface-variant: '#e5e2e2'
typography:
  logo:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  h2:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  h3:
    fontFamily: Poppins
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  badge:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  container-max: 1200px
---

## Brand & Style

This design system is built on a foundation of **Minimalism** and **Corporate Modernism**. It prioritizes extreme clarity and high-velocity workflows for professionals who manage complex task loads. By utilizing a stark white and silver-gray palette, the interface recedes into the background, allowing the user's content and priorities to take center stage.

The brand personality is disciplined, editorial, and sophisticated. It avoids unnecessary ornamentation, instead using precision typography and structural alignment to create a sense of order. The emotional response should be one of "calm productivity"—a digital workspace that feels organized, breathable, and authoritative.

## Colors

The palette is restricted to a monochromatic core to maximize legibility. **#FFFFFF** is the primary surface color for main work areas, while **#F8F9FA** (Silver Gray) is used for sidebars, secondary navigation, and backgrounds to provide soft structural contrast.

Functional color is reserved exclusively for status indicators and priority badges. These exceptions follow a strict semantic logic:
- **Warm tones (Red/Orange/Yellow)** denote urgency and active attention.
- **Cool tones (Blue/Gray)** denote progress and systematic movement.
- **Green tones** denote completion and low-priority states.

The primary text and accent color share the same high-contrast value (#212529) to maintain a cohesive, ink-on-paper aesthetic.

## Typography

This design system utilizes a dual-font strategy to balance character with utility. **Poppins** is the headline face, providing a geometric, modern energy; for the brand identity, use the 800 weight with tight tracking. 

**Inter** is the workhorse for all body content and UI labels. It is chosen for its exceptional readability at small sizes and its neutral, systematic appearance. For metadata and category headers, use the "label-caps" style to create clear visual anchors within the task lists.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop views, centering content within a 1200px container to prevent eye strain on ultra-wide monitors. A 12-column system is used with 24px gutters to allow for flexible dashboard widgets and task panels.

The spacing rhythm is built on an 8px baseline. Use 16px (md) for standard internal padding and 24px (lg) for margins between major sections. For compact task lists, the "xs" (4px) and "sm" (8px) units should be used to maintain high information density without sacrificing touch/click targets.

## Elevation & Depth

This design system avoids heavy shadows, instead relying on **Tonal Layers** and **Low-Contrast Outlines**. 

- **Level 0 (Background):** #F8F9FA for the application backdrop.
- **Level 1 (Surfaces):** #FFFFFF for cards and main content areas, defined by a 1px border of #E9ECEF or a very soft 4px blur shadow (0px 2px 4px rgba(0,0,0,0.05)).
- **Level 2 (Interaction):** Floating menus or active modals use a slightly more pronounced shadow (0px 8px 16px rgba(0,0,0,0.08)) to indicate temporary depth.

The goal is a "flat-plus" appearance where depth is implied by subtle contrast rather than physical simulation.

## Shapes

The shape language is consistently rounded to soften the industrial feel of the minimalist palette. 

- **Interactive Elements:** Buttons, input fields, and checkboxes must use an **8px (0.5rem)** corner radius.
- **Containers:** Task cards, project boards, and modal windows must use a **12px (0.75rem)** corner radius.

This subtle difference in rounding helps users subconsciously distinguish between "things I click" and "things that hold content."

## Components

### Buttons
Primary buttons use the accent color (#212529) with white text. Secondary buttons use a transparent background with a #DEE2E6 border and primary text. The 8px radius is mandatory.

### Badges (Status & Priority)
Badges are small, semi-rounded elements (4px radius) used for categorization. 
- **Urgent/High/Medium/Low:** Apply the specific background, text, and border hex codes provided in the color variables.
- **Workflow Status:** Use the background and text color pairings for To Do, In Progress, In Review, and Done. These do not require borders, relying instead on the background tint.

### Inputs
Text inputs should have a #FFFFFF background, an 8px radius, and a 1px border of #DEE2E6. On focus, the border color shifts to #212529.

### Cards
Cards are the primary vehicle for tasks. They utilize a 12px radius, a white background, and a subtle 1px border of #F1F3F5. For "Kanban" style boards, cards should have a padding of 16px.

### Lists
List items should have a hover state of #F8F9FA to indicate interactivity. Use 16px horizontal padding and 12px vertical padding to maintain a breathable list view.