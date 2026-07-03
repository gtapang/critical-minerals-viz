# Critical Minerals Interlinks — Pax-Silica

Interactive network visualization of the global critical minerals supply chain, mapping companies, countries, minerals, and deposits and their connections (ownership, joint ventures, offtake agreements, supply chains, regulatory relationships).

**Live site:** https://gtapang.github.io/critical-minerals-viz/

## Framing

Pax-Silica: the silicon-centered geopolitical order. Semiconductors, batteries, renewable energy infrastructure all depend on a finite set of critical minerals. Control over extraction, processing, and supply chains equals leverage in this order, analogous to oil in Pax Americana.

Key question: which companies sit at the nodes, and how are they connected — by ownership, joint ventures, offtake agreements, shared supply sources, geopolitical alignment?

## Data

46 nodes across 4 types:

- **26 companies** — extraction, processing, end-use (MP Materials, Glencore, CATL, TSMC, Tianqi, Lynas, etc.)
- **8 countries** — China, US, EU, Australia, DRC, Indonesia, Chile, Philippines
- **9 minerals** — Rare Earth Elements, Lithium, Cobalt, Nickel, Manganese, Graphite, Gallium, Germanium, Copper
- **3 deposits** — Greenbushes, Mountain Pass, Bayan Obo

107 links across 8 types:

| Link type | Count | Description |
|----------|-------|-------------|
| supply | 30 | Material flows along supply chain |
| headquartered | 27 | Company based in country |
| produces | 26 | Company produces this mineral |
| regulates | 14 | Country regulates company/sector |
| ownership | 5 | Equity stake, cross-holding |
| offtake | 2 | Offtake agreement, supply contract |
| jv | 2 | Joint venture |
| competes | 1 | Competitive relationship |

### Key interlinks

- MP Materials (US mine) to Shenghe Resources (China processing) — offtake
- Albemarle and Tianqi joint venture at Greenbushes (Australia) — world's largest hard-rock lithium source
- Tianqi ~24% stake in SQM (Chile) — cross-ownership across the lithium triangle
- Glencore (DRC) through Chinese intermediaries to CATL/BYD — cobalt supply chain
- Vale Indonesia + Tsingshan joint venture — Indonesian nickel HPAL plants
- China regulates domestic rare earth, lithium, graphite sectors via quotas and export controls

## Features

- **Force-directed graph** — D3.js v7, nodes sized by connection count
- **Hover highlight** — node + neighbors highlighted, rest dimmed
- **Click detail panel** — full node info + list of all connections with type badges
- **Drag** — reposition nodes, simulation re-heats
- **Zoom/pan** — mouse wheel, pinch-zoom on mobile
- **Filter buttons** — toggle node types (companies, countries, minerals, deposits) and link types independently
- **Search** — find nodes by name, highlights matches, fades rest
- **Legend** — color key for node types and link styles
- **Responsive** — mobile bottom sheet panel, smaller labels, touch support

## Tech

- HTML5, CSS3, vanilla JavaScript — no build tools, no backend
- D3.js v7 via CDN
- Static JSON data file
- Deployed on GitHub Pages

## File structure

```
critical-minerals-viz/
  index.html         — HTML shell
  css/style.css      — dark theme, responsive layout
  js/app.js          — D3.js graph logic (render, interactivity, filters, search)
  data/minerals.json — structured nodes + links data
```

## Source

Data compiled from notes at `M/Inbox/critical-minerals-pax-silica.md`. Ownership percentages, offtake terms need verification against corporate filings — some entries flagged as unverified where uncertain.

## License

MIT