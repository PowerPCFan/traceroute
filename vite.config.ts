import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    server: {
        host: true
    },
    preview: {
        allowedHosts: [
            "gallery.frii.site",
            "ctih1.frii.site"
        ]
    }
});
