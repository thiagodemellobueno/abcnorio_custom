import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { REST_PATH } from './util/paths.js';
import { fetchAllWpItems, fetchWpJson } from './util/wp-fetch.js';
import { fetchPostBlocks } from './lib/blocks.js';

/**
 * Build an incremental loader for a WP REST collection that includes block data.
 *
 * On each build:
 * - Fetches all items from the API.
 * - Uses modified_gmt as a change signal: if unchanged, skips the block re-fetch.
 * - Removes entries that no longer exist in WP.
 *
 * Entry id = item.slug (or item.id as fallback).
 */
function wpLoader(fetchItems: () => Promise<any[]>): Loader {
  return {
    name: 'wp-loader',
    load: async ({ store, generateDigest, logger }) => {
      let items: any[];
      try {
        items = await fetchItems();
      } catch (err: any) {
        logger.warn(`wp-loader: fetch failed — ${err.message}. Retaining existing store.`);
        return;
      }

      const seenIds = new Set<string>();

      await Promise.all(
        items.map(async (item: any) => {
          const id = String(item.slug || item.id);
          seenIds.add(id);
          const digest = generateDigest(String(item.modified_gmt || item.modified || item.id));
          if (store.get(id)?.digest === digest) return;
          const blocks = await fetchPostBlocks(item.id);
          store.set({ id, data: { ...item, blocks }, digest });
        })
      );

      // Remove entries deleted from WP.
      for (const key of store.keys()) {
        if (!seenIds.has(key)) store.delete(key);
      }
    },
  };
}

/**
 * Simple loader for listing/taxonomy data that doesn't need blocks.
 * Clears and reloads the full collection on every build.
 */
function wpSimpleLoader(fetchItems: () => Promise<any[]>): Loader {
  return {
    name: 'wp-simple-loader',
    load: async ({ store, logger }) => {
      let items: any[];
      try {
        items = await fetchItems();
      } catch (err: any) {
        logger.warn(`wp-simple-loader: fetch failed — ${err.message}. Retaining existing store.`);
        return;
      }
      store.clear();
      for (const item of items) {
        store.set({ id: String(item.slug || item.id), data: item });
      }
    },
  };
}

/**
 * Loader for all pages tagged with any collective_association term.
 * Fetches terms first to get their IDs, then queries pages in a single request.
 */
function wpCollectiveSubpagesLoader(): Loader {
  return {
    name: 'wp-collective-subpages',
    load: async ({ store, generateDigest, logger }) => {
      let terms: any[];
      try {
        terms = await fetchAllWpItems(`${REST_PATH}collective-associations`);
      } catch (err: any) {
        logger.warn(`wp-collective-subpages: terms fetch failed — ${err.message}. Retaining existing store.`);
        return;
      }

      if (!terms.length) return;

      const termIds = terms.map((t: any) => t.id).join(',');

      let items: any[];
      try {
        items = await fetchAllWpItems(`${REST_PATH}pages?collective-associations=${termIds}`);
      } catch (err: any) {
        logger.warn(`wp-collective-subpages: pages fetch failed — ${err.message}. Retaining existing store.`);
        return;
      }

      const seenIds = new Set<string>();

      await Promise.all(
        items.map(async (item: any) => {
          const id = String(item.slug || item.id);
          seenIds.add(id);
          const digest = generateDigest(String(item.modified_gmt || item.modified || item.id));
          if (store.get(id)?.digest === digest) return;
          const blocks = await fetchPostBlocks(item.id);
          store.set({ id, data: { ...item, blocks }, digest });
        })
      );

      for (const key of store.keys()) {
        if (!seenIds.has(key)) store.delete(key);
      }
    },
  };
}

/**
 * Loader for child pages of a given parent slug.
 * Resolves the parent page id, then fetches and incrementally updates children.
 */
function wpChildPagesLoader(parentSlug: string): Loader {
  return {
    name: `wp-child-pages-${parentSlug}`,
    load: async ({ store, generateDigest, logger }) => {
      let parentId: number | undefined;
      try {
        const parents = await fetchWpJson(`${REST_PATH}pages?slug=${parentSlug}`);
        parentId = parents?.[0]?.id;
        if (!parentId) {
          logger.warn(`wp-child-pages-${parentSlug}: parent page not found`);
          return;
        }
      } catch (err: any) {
        logger.warn(`wp-child-pages-${parentSlug}: parent fetch failed — ${err.message}`);
        return;
      }

      let items: any[];
      try {
        items = await fetchAllWpItems(`${REST_PATH}pages?parent=${parentId}`);
      } catch (err: any) {
        logger.warn(`wp-child-pages-${parentSlug}: children fetch failed — ${err.message}`);
        return;
      }

      const seenIds = new Set<string>();

      await Promise.all(
        items.map(async (item: any) => {
          const id = String(item.slug);
          seenIds.add(id);
          const digest = generateDigest(String(item.modified_gmt || item.modified || item.id));
          if (store.get(id)?.digest === digest) return;
          const blocks = await fetchPostBlocks(item.id);
          store.set({ id, data: { ...item, blocks }, digest });
        })
      );

      for (const key of store.keys()) {
        if (!seenIds.has(key)) store.delete(key);
      }
    },
  };
}

export const collections = {
  // All top-level WP pages (parent=0) with blocks.
  // Covers: [slug].astro, about/index.astro, programming/index.astro, facilities/index.astro.
  pages: defineCollection({
    loader: wpLoader(() => fetchAllWpItems(`${REST_PATH}pages?parent=0`)),
  }),

  // Collectives custom post type with blocks.
  collectives: defineCollection({
    loader: wpLoader(() => fetchAllWpItems(`${REST_PATH}collectives`)),
  }),

  // Events custom post type with embedded featured media and blocks.
  events: defineCollection({
    loader: wpLoader(() => fetchAllWpItems(`${REST_PATH}events`)),
  }),

  // Child pages of /about/ with blocks.
  about_pages: defineCollection({
    loader: wpChildPagesLoader('about'),
  }),

  // Child pages of /programming/ with blocks.
  programming_pages: defineCollection({
    loader: wpChildPagesLoader('programming'),
  }),

  // News items — listing only, no blocks.
  news: defineCollection({
    loader: wpSimpleLoader(() => fetchAllWpItems(`${REST_PATH}news_items`)),
  }),

  // Event taxonomy terms — used to resolve type labels on event pages.
  event_types: defineCollection({
    loader: wpSimpleLoader(() => fetchAllWpItems(`${REST_PATH}event-types`)),
  }),

  // Subpages for collectives — pages tagged with any collective_association term.
  collective_subpages: defineCollection({
    loader: wpCollectiveSubpagesLoader(),
  }),
};
