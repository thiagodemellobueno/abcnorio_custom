
       ░▒▓██████▓▒░░▒▓███████▓▒░ ░▒▓██████▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░░░░░░
     ░▒▓████████▓▒░▒▓███████▓▒░░▒▓█▓▒░░░░░░░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░░░░░░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░ ░▒▓██████▓▒░
     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
     ░▒▓███████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░░▒▓█▓▒░░▒▓██████▓▒░  
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░
     ░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓██████▓▒░

# [ASTRO](https://docs.astro.build/) Frontend for Headless for wordpress rest API

Frontend for a headless wordpress site using astro collections fed through the rest api.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |


## Content Collections 
Collections are loaded at build time from the WP REST API via custom Astro loaders defined in src/content.config.ts. There is no file-based content — everything comes from WordPress.

### wpLoader
Incremental, block-aware. Fetches all items, uses modified_gmt as a change signal, and only re-fetches block data for changed entries. Used for content types that render full page layouts.
- pages, collectives, events

### wpSimpleLoader
Full reload on every build, no blocks. Used for listing/taxonomy data.
wpChildPagesLoader — variant of wpLoader that resolves a parent page slug first, then incrementally loads its child pages with blocks.
- newsm, event_types, 

### wpChildPagesLoader
Variant of wpLoader that resolves a parent page slug first, then incrementally loads its child pages with blocks.
- about_pages, programming pages

If a fetch fails at build time, loaders warn and retain the existing store rather than failing the build.

## CSS 
The site styles use SCSS, we chose separation of concerns over locality in this situation.
It also allows specific chunks of styling information to be output to other parts of our application, we use it to build the wp admin css via,  `npm run build:wp-admin-styles`

## SSR for Events and Search 

### Search

`src/pages/search/api.ts` is a runtime API endpoint. On each request it proxies the query to the WP custom search endpoint (`DEV_SEARCH_API` / `STAGING_SEARCH_API`), selects the correct CMS host based on the request's `Host` header, and returns JSON.

`SearchField.astro` submits via a plain `GET /search?q=…` form (works without JS), and progressively enhances with a vanilla JS fetch against `/search/api` to render results in-place without a page reload. Results are rendered by `SearchResults.astro` / `Listing.astro`.

### Event Listings and Filters

`src/pages/events/listing.astro` is an SSR partial — an htmx target only. It handles date filters (`upcoming` / `past` / `all`), taxonomy filters, and pagination server-side, fetching filtered events from the WP REST API on each request.

Non-htmx requests are redirected to `/events`. On htmx requests, it sets `HX-Push-Url` so the browser URL reflects the active filters without a full navigation.

## Form Submission

Forms use [Astro Actions](https://docs.astro.build/en/guides/actions/) (`src/actions/index.ts`). Each action uses `accept: 'form'` with Zod schema validation. Three forms are defined:

| Action | Page | Fields |
| :--- | :--- | :--- |
| `submitVolunteerForm` | `/forms/volunteer` | name, email, message |
| `submitContactForm` | `/forms/contact` | name, email, subject, message |
| `submitExhibitProposalForm` | `/forms/submitExhibit` | name, email, exhibitTitle, exhibitDescription |

Progressive enhancement: forms submit and return success/error state without JS via standard POST. With JS, Astro handles the action response client-side.