import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],

    // no clue why that was on true
    // actually i think that's how it https://ctih1.frii.site is being hosted which is the upstream site
    // so that explains it

    // server: {
    //     host: true
    // },
    // preview: {
    //     allowedHosts: [
    //         "traceroute.powerpcfan.xyz"
    //     ]
    // }
});
