/**
 * Helpers for getStaticPaths in Astro page files.
 *
 * getStaticPaths() must be a static export directly in each .astro file —
 * Astro does not allow it to be imported. 
 * This file contains helpersto avoid a lot of duplication.
 *
 *   export async function getStaticPaths() {
 *     return collectionPaths('about_pages', process.env.SCOPE, 'about');
 *   }
 *
 * Three patterns:
 *
 * 1. collectionPaths         — simple: map collection entries to { params, props }
 * 2. withChildPagesPaths     — collection entries + live child-page fetch per entry
 *                              (programming [slug]/index and [slug]/[pageSlug])
 * 3. collectiveIndexPaths    — collectives collection + subpages joined via taxonomy terms
 * 4. collectiveSubpagePaths  — subpages collection + taxonomy term lookup for parent slug
 */

import { getCollection } from 'astro:content';
import { fetchAllWpItems } from './wp-fetch.js';
import { REST_PATH } from './paths.js';

function scopeAllowed(scope: string | undefined, scopeKey: string): boolean {
  const s = scope || 'full';
  return s === 'full' || s === scopeKey;
}

/**
 * Simple collection mapping.
 * Use for: about/[slug], events/[slug], and any flat collection route.
 */
export async function collectionPaths(
  collectionName: string,
  scope: string | undefined,
  scopeKey: string,
  filter?: (entry: any) => boolean,
) {
  if (!scopeAllowed(scope, scopeKey)) return [];
  const entries = await getCollection(collectionName as any);
  return entries
    .filter((entry: any) => entry.id && (!filter || filter(entry)))
    .map((entry: any) => ({
      params: { slug: entry.id },
      props: { post: entry.data },
    }));
}

/**
 * Collection + child page fetch, for index pages.
 * Returns { params: { slug }, props: { post, subpages } }.
 * subpages are raw WP REST objects (listing fields only, no blocks).
 * Use for: programming/[slug]/index.astro
 */
export async function withChildPagesIndexPaths(
  collectionName: string,
  scope: string | undefined,
  scopeKey: string,
) {
  if (!scopeAllowed(scope, scopeKey)) return [];
  const entries = await getCollection(collectionName as any);
  return Promise.all(
    entries.map(async (entry: any) => {
      let subpages: any[] = [];
      try {
        subpages = await fetchAllWpItems(
          `${REST_PATH}pages?parent=${entry.data.id}&_fields=id,slug,title,link`,
        );
      } catch (_) {}
      return {
        params: { slug: entry.id },
        props: { post: entry.data, subpages },
      };
    }),
  );
}

/**
 * Collection + child page fetch, for child page routes.
 * Returns { params: { slug, pageSlug }, props: { post } }.
 * post is a raw WP REST object (not a collection entry).
 * Use for: programming/[slug]/[pageSlug].astro
 */
export async function withChildPagesLeafPaths(
  collectionName: string,
  scope: string | undefined,
  scopeKey: string,
) {
  if (!scopeAllowed(scope, scopeKey)) return [];
  const entries = await getCollection(collectionName as any);
  const results = await Promise.all(
    entries.map(async (entry: any) => {
      const children = await fetchAllWpItems(
        `${REST_PATH}pages?parent=${entry.data.id}`,
      );
      return children.map((child: any) => ({
        params: { slug: entry.id, pageSlug: child.slug },
        props: { post: child },
      }));
    }),
  );
  return results.flat();
}

/**
 * Collectives index: join collectives to subpages via collective_association terms.
 * Returns { params: { slug }, props: { post, subpages } }.
 * subpages are collective_subpages collection entries.
 * Use for: collectives/[slug]/index.astro
 */
export async function collectiveIndexPaths(scope: string | undefined) {
  if (!scopeAllowed(scope, 'collectives')) return [];
  const [entries, allSubpages, terms] = await Promise.all([
    getCollection('collectives' as any),
    getCollection('collective_subpages' as any),
    fetchAllWpItems(`${REST_PATH}collective-associations`),
  ]);
  const termSlugToId = new Map(terms.map((t: any) => [t.slug, t.id]));
  return entries.map((entry: any) => {
    const termId = termSlugToId.get(entry.id);
    const subpages = termId
      ? allSubpages.filter((p: any) => p.data['collective-associations']?.includes(termId))
      : [];
    return {
      params: { slug: entry.id },
      props: { post: entry.data, subpages },
    };
  });
}

/**
 * Collective subpage leaf: map each subpage to its parent collective slug.
 * Returns { params: { slug, pageSlug }, props: { post } }.
 * Use for: collectives/[slug]/[pageSlug].astro
 */
export async function collectiveSubpagePaths(scope: string | undefined) {
  if (!scopeAllowed(scope, 'collectives')) return [];
  const [allSubpages, terms] = await Promise.all([
    getCollection('collective_subpages' as any),
    fetchAllWpItems(`${REST_PATH}collective-associations`),
  ]);
  const termIdToSlug = new Map(terms.map((t: any) => [t.id, t.slug]));
  return allSubpages
    .map((page: any) => {
      const termId = page.data['collective-associations']?.[0];
      const collectiveSlug = termIdToSlug.get(termId);
      if (!collectiveSlug) return null;
      return {
        params: { slug: collectiveSlug, pageSlug: page.id },
        props: { post: page.data },
      };
    })
    .filter(Boolean);
}
