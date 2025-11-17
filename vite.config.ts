import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        host: true
    },
    preview: {
        allowedHosts: [
            "traceroute.powerpcfan.xyz"
        ]
    }
});
