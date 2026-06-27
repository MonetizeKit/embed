# @monetizekit/embed

Vanilla-JS embed SDK for [MonetizeKit](https://monetizekit.app). Drop a script tag
into any site (no framework required) and MonetizeKit auto-renders widgets —
pricing tables, paywalls, customer portals, and banners — from `data-mk-widget`
attributes.

## CDN (no build step)

```html
<script src="https://app.monetizekit.app/v1/embed.js"></script>

<div
  data-mk-widget="pricing-table"
  data-mk-key="pk_live_xxx"
  data-mk-highlight="growth"
  data-mk-theme="dark"
></div>
```

## npm (bundler)

```bash
npm install @monetizekit/embed
```

```ts
import { initializeEmbeds } from "@monetizekit/embed";

// Re-scan the DOM after dynamically inserting widget elements.
const configs = initializeEmbeds();
```

The package also exports the self-initializing CDN bundle at
`@monetizekit/embed/embed.js` if you prefer to self-host it.

## License

MIT
