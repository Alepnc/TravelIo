---
name: TravelIo
description: The departures board of your own airport. Dall'idea all'itinerario, in un'unica app.
colors:
  delay-amber: "#ffb000"
  delay-amber-hover: "#ffc840"
  delay-amber-wash: "#fff6dc"
  amber-ink: "#8a5a00"
  cancel-red: "#c4161c"
  cancel-red-on-board: "#ff6b6b"
  flap-black: "#0e0f11"
  flap-cell: "#191b1f"
  steel-frame: "#2a2d31"
  board-white: "#f2f2f0"
  board-dim: "#9a9ea5"
  ink-soft: "#383b41"
  muted: "#5a5e66"
  steel: "#a7aaaf"
  rule-line: "#d2d5d8"
  concourse: "#eceeef"
  work-surface: "#ffffff"
typography:
  board-display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 5.4vw, 3.6rem)"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0"
    fontVariation: "'wdth' 70"
  board-row:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0"
    fontVariation: "'wdth' 70"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 78"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 80"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  ui-label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.01em"
  col-label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 85"
rounded:
  cell: "2px"
  ui: "4px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  section: "80px"
  container: "76rem"
components:
  button-action:
    backgroundColor: "{colors.delay-amber}"
    textColor: "{colors.flap-black}"
    rounded: "{rounded.ui}"
    padding: "0 18px"
    height: "44px"
    typography: "{typography.ui-label}"
  button-action-hover:
    backgroundColor: "{colors.delay-amber-hover}"
  button-board:
    backgroundColor: "{colors.flap-black}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.ui}"
    padding: "0 18px"
    height: "44px"
    typography: "{typography.ui-label}"
  button-board-hover:
    backgroundColor: "{colors.steel-frame}"
  button-outline:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.flap-black}"
    rounded: "{rounded.ui}"
    padding: "0 18px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.cancel-red}"
    rounded: "{rounded.ui}"
    padding: "0 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.work-surface}"
    textColor: "{colors.flap-black}"
    rounded: "{rounded.ui}"
    padding: "0 12px"
    height: "44px"
  flap-cell:
    backgroundColor: "{colors.flap-cell}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.cell}"
    typography: "{typography.board-row}"
    width: "0.74em"
    height: "1.08em"
  board-panel:
    backgroundColor: "{colors.flap-black}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.ui}"
    padding: "8px 20px"
  month-tab:
    backgroundColor: "{colors.flap-cell}"
    textColor: "{colors.board-dim}"
    rounded: "{rounded.cell}"
    padding: "6px 10px"
  month-tab-active:
    backgroundColor: "{colors.delay-amber}"
    textColor: "{colors.flap-black}"
  time-chip:
    backgroundColor: "{colors.flap-black}"
    textColor: "{colors.board-white}"
    rounded: "{rounded.cell}"
    padding: "2px 6px"
  time-chip-active:
    backgroundColor: "{colors.delay-amber}"
    textColor: "{colors.flap-black}"
---

# Design System: TravelIo

## Overview

**Creative North Star: "The Departures Board"**

TravelIo is the Solari split-flap board of your own airport. Where you can go, when and for how much is posted on black boards in white condensed capitals, one character per cell; the trip you chose stays on the board as your own row, with a status, a timetable (the itinerary) and a ledger (the budget). The board is the place to read and choose; the concourse around it, a light cool steel with white work surfaces, is where you type, edit and plan.

Density is that of an instrument, not a brochure. Information sits in rows and ruled columns read along one left axis, figures are tabular, and the only motion with character is the per-character flap cascade when a board's text changes. Colour is almost absent: black, steel and white carry everything, so the two signal colours can mean exactly one thing each. Delay amber says "act here, this is selected"; cancel red says "over budget, error, cancelled". The world refuses the booking-portal arrangement (photo hero, centred search pill, grid of equal destination cards) and the dark chat-first "AI planner".

**Key Characteristics:**
- Black flap boards in a steel frame, set on a light steel concourse.
- One variable typeface, Archivo, stretched: condensed capitals on the board and in headlines, normal width for UI and reading.
- Two signal colours with one meaning each; no green, no third accent.
- Rows and rules instead of cards; one left axis on every page.
- Squared 4px corners, 2px on flap cells; flat surfaces, depth from the steel frame.
- Phosphor icons only; the flap cascade is the signature motion and is instant under reduced motion.

## Colors

A near-monochrome steel-and-black palette with two signal colours that are never decorative.

### Primary
- **Delay Amber** (#ffb000): the colour of a "delayed" lamp on a real board, and the only thing on screen to act on. Used for the primary action (Cerca, Crea viaggio, Assistente), the current selection (active month cell, active itinerary day, active timetable chip, active nav underline as an inset 3px bar) and the active state of a status that needs the user (Pianificazione, In corso, a live price on the board). Also the focus ring halo and text selection.
- **Delay Amber Hover** (#ffc840): hover step of amber buttons only.
- **Amber Wash** (#fff6dc): soft background for an amber-toned badge on the concourse.
- **Amber Ink** (#8a5a00): amber as text on light ground, where #ffb000 would fail contrast; caret colour in fields.

### Secondary
- **Cancel Red** (#c4161c): the "soppresso" lamp. Over budget, errors, destructive actions, cancelled. Never decoration, never a category.
- **Cancel Red on Board** (#ff6b6b): the same signal lifted for legibility on flap black, where #c4161c falls below AA. Used only for red flap characters (over-budget figures, the "Partenza soppressa" 404).

### Neutral
- **Flap Black** (#0e0f11): board panels, nav strip, ink text on the concourse, the board-style secondary button.
- **Flap Cell** (#191b1f): the individual character cell and unselected board tabs.
- **Steel Frame** (#2a2d31): the 5px frame around every board, row rules on the board, hover row tint on the board.
- **Board White** (#f2f2f0): characters and text on the board.
- **Board Dim** (#9a9ea5): column labels, secondary text and idle arrows on the board.
- **Ink Soft** (#383b41) and **Muted** (#5a5e66): secondary and tertiary text on the concourse.
- **Steel** (#a7aaaf): "previsto" bars in the budget, scrollbar thumb, mid-steel day tone.
- **Rule Line** (#d2d5d8): hairline rules between rows on the concourse.
- **Concourse** (#eceeef): page ground.
- **Work Surface** (#ffffff): fields, sheets, the active itinerary row, outline buttons.

### Named Rules
**The One Signal Rule.** Delay Amber is only for the primary action, the current selection and the active state. If an amber element cannot be clicked and does not mark "this one, now", it is wrong.

**The Soppresso Rule.** Cancel Red is only for over budget, errors and cancelled. Budget escalates calm, then amber "attenzione", then red "sforato"; nothing else turns red.

**The No Green Rule.** No green appears in the world. Success and "real price" are said in words and in board white or amber, never with a green lamp.

**The Steel Days Rule.** Itinerary day colours (map pins, day dots in "Tutti i giorni") use the steel scale only: #0e0f11, #5a5e66, #9a9ea5, #383b41, #7d8188, #c4c7cb, #2a2d31, #a7aaaf. Amber stays for the active day, red for alarms.

## Typography

**Display Font:** Archivo Variable, width axis condensed (with ui-sans-serif, system-ui)
**Body Font:** Archivo Variable, normal width (same fallback)

**Character:** One family doing two jobs through its width axis. Condensed heavy capitals sit in flap cells and in headlines like painted board lettering; at normal width the same face is a calm, legible UI sans for forms, prose and controls.

### Hierarchy
- **Board Display** (650, condensed wdth 70, clamp(1.6rem, 5.4vw, 3.6rem), uppercase in cells): the page's board header, e.g. "PARTENZE DA NAPOLI", the trip name on its board, the 404 "PARTENZA SOPPRESSA". Always set with FlapText or FlapStatic, never as loose text.
- **Board Row** (650, condensed wdth 70, 1.15rem mobile, 1.35rem desktop, uppercase in cells): destination names, airport codes, prices and statuses inside board rows; ledger figures run 1.25 to 1.875rem.
- **Headline** (700, wdth 78 to 80, 1.875rem mobile to 2.75rem desktop, line-height 1.05): section and page titles on the concourse, sentence case.
- **Title** (700, wdth 80 to 82, 1.25 to 1.5rem): sheet titles, panel titles, day titles in the itinerary.
- **Body** (400, normal width, 1rem; lead text 1.125rem; max about 34rem or max-w-prose): concourse prose and descriptions.
- **UI Label** (600, normal width, 0.875rem, 0.01em): buttons, field labels, nav links.
- **Column Label** (600, wdth 85, 0.6875rem, 0.12em, uppercase): column headers of board tables and ruled lists only.

Times, prices and dates use tabular figures everywhere.

### Named Rules
**The One Face Rule.** Archivo variable is the only typeface. Condensed width for flaps and headlines, normal width for UI and body. No second family, no system display face, no monospace.

**The Cell Spacing Rule.** Inside flap cells letter-spacing is 0: the cell gap (0.08em) is the spacing. The hinge line across the middle of a cell is hidden below 18px via the small-flap modifier, because at that size it would cut through the letters.

**The Column Header Rule.** Tracked caps are only for table column headers. No eyebrow or kicker label above a heading; the heading speaks for itself.

## Layout

Every page is left-aligned on a single axis: a 76rem container with 16px side padding (24px from 640px), and everything, board header, search row, section titles, rows, starts on that edge. Nothing is centred as a composition.

Information is laid out as rows in ruled columns. Board rows use a CSS grid that collapses on mobile to name, price and arrow, with country and code dropping under the name; desktop adds code, ideal period and status columns. Row padding is 10 to 12px vertical, column gaps 16px (24px from 1024px). Section titles sit on a 1px ink rule (2px for budget and itinerary panels) with 16px above the title.

Vertical rhythm on the concourse: 48px between blocks inside a board section, 64 to 96px between major sections. The home board section runs full-bleed black with a 6px steel top edge; trip detail pages put a board header above a concourse body. On phones the primary use case drives a tab bar, a bottom draft bar and bottom sheets; on desktop sheets dock to the right at 420px and the itinerary splits list and map.

## Elevation & Depth

The world is flat. Depth comes from material, not lift: black boards framed in steel sit on the light concourse, and white work surfaces sit on the concourse with a hairline. Shadows are reserved for things that genuinely float above the page.

### Shadow Vocabulary
- **Board frame** (`border: 1px solid #3a3d42; box-shadow: 0 0 0 5px #2a2d31`): the steel frame with its air gap around every dark board. Structural, not elevation.
- **Float** (`box-shadow: 0 1px 0 rgb(14 15 17 / 0.08), 0 20px 44px -18px rgb(14 15 17 / 0.42)`): sheets, popovers, menus, toasts, the floating assistant button.
- **Active bar** (`box-shadow: inset 0 -3px 0 #ffb000`, or `inset 0 3px 0` on day tabs): the amber bar under the active nav item or tab.

### Named Rules
**The Framed Board Rule.** A dark board is always wrapped in the steel board-panel frame. A black block without its frame is not a board.

**The Flat Concourse Rule.** Nothing on the concourse casts a shadow at rest. Only floating layers get the Float shadow.

## Shapes

Squared, engineered corners. 4px is the corner for everything: buttons, fields, boards, sheets, empty states, images in rows. Flap cells and cell-like chips (month cells, timetable time chips, map pin numbers) use 2px, like the metal flaps themselves. No pills: status labels are rectangles like board lettering. Full circles appear only for tiny functional dots (unread notification, day dots, the sheet grab handle). Empty states are dashed 1px outlines that collapse a section to its contour with a single fill action.

## Components

### Buttons
Squared, heavy-handed, pressed rather than lifted.
- **Shape:** squared corners (4px); heights 36, 44 and 52px.
- **Action (amber):** Delay Amber with flap-black text, 600 weight. One per view region: Cerca, Crea viaggio, Assistente. Hover lightens to #ffc840.
- **Board (black):** flap black with board-white text for strong non-primary actions; hover to steel frame.
- **Outline:** white with a 25% ink border, hover to full ink border. **Ghost:** text only, 6% ink wash on hover. **Danger:** white with cancel-red text and 30% red border.
- **States:** every button scales to 0.97 on press (160ms ease-out); disabled at 45% opacity. Focus is the global ring: 2px ink outline, 2px offset, 4px amber halo.

### Chips and tabs
- **Month tabs:** a row of flap cells on a black strip, 1px gaps. Unselected cells are flap-cell with board-dim text; the selected month is the only amber cell.
- **Day tabs (itinerary):** black strip of cells; the active day carries the amber bar and board-white text.

### Cards / Containers
There are no stacked cards. Content lives in rows separated by rules; a white work surface (1px rule-line border, 4px corners) is used at most once deep. **Never a card inside a card.**

### Inputs / Fields
- **Style:** white surface, 1px border at 20% ink, 4px corners, 44px tall, 12px horizontal padding; 16px minimum font size on mobile.
- **Focus:** border goes to full ink with a 3px amber ring.
- **Error:** border and message in cancel red; message announced as an alert.
- Labels sit above fields in UI Label, never as tracked caps (except the board search row, where field names are its column headers).

### Navigation
Black nav strip 56px tall with a steel bottom rule, the TRAVELIO flap wordmark at the left, UI Label links in board white; the active link carries the amber inset bar. The amber "Crea viaggio" is the strip's only amber element. Mobile uses a bottom tab bar.

### Board (signature)
The departures board: a framed black panel holding a header row of column labels in board-dim and a list of linked rows. Each row's name, code and price are FlapText cells; prices that were really measured show in amber cells, unmeasured ones say "Da rilevare" in board-dim. Rows tint to steel frame on hover and the trailing arrow slides 2px and turns amber.

### Flap text (signature)
Every character sits in its own cell (0.74em by 1.08em, flap-cell ground, 2px corners) with a 1px dark hinge across the middle. Text is upper-cased, accents stripped, and with a fixed length it truncates with a final "." or pads with empty cells, so longer words in other languages never overflow. When text changes, each cell rolls 2 to 5 random characters (55ms per step, 22ms stagger left to right, each roll a 110ms drop from rotateX(-70deg)) before settling. Under reduced motion text appears at once. Screen readers get the plain text; the cells are aria-hidden.

### Status
Trip status (In pianificazione, Confermato, In corso, Completato) is flap text on the trip's board row: amber for statuses that need the user, board white for confirmed, board dim for completed.

## Do's and Don'ts

### Do:
- **Do** put every dark board in the steel board-panel frame (1px #3a3d42 border plus a 5px #2a2d31 frame).
- **Do** set board text with FlapText or FlapStatic, letter-spacing 0 in the cells, and add the small-flap modifier below 18px so the hinge disappears.
- **Do** reserve Delay Amber (#ffb000) for the primary action, the current selection and the active state.
- **Do** reserve Cancel Red (#c4161c, #ff6b6b on the board) for over budget, errors and cancelled.
- **Do** colour itinerary days with the steel scale only.
- **Do** lay content out as rows and ruled columns, left-aligned on the single container axis.
- **Do** use Phosphor icons imported from "@phosphor-icons/react/dist/ssr".
- **Do** use 4px corners everywhere and 2px on flap cells.

### Don't:
- **Don't** use green anywhere, for success, live data or "direct flight".
- **Don't** put eyebrow or kicker labels above headings; tracked caps (column label) are only for table column headers.
- **Don't** nest a card inside a card, or turn a list into a grid of equal cards.
- **Don't** centre a page or a hero; there is one left axis.
- **Don't** use emoji as icons.
- **Don't** introduce a second typeface; Archivo variable is the only one.
- **Don't** use amber for decoration, illustration or a category colour.
- **Don't** use pills, large radii or drop shadows on concourse surfaces.
