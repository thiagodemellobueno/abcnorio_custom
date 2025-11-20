// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  integrations: [ react(), partytown(), icon(), ]
});


