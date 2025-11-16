<script lang="ts">
    import '../app.css';
    import favicon from '$lib/assets/favicon.svg';
    import Navbar from '$lib/components/Navbar.svelte';
    import Container from '$lib/components/Container.svelte';

    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link
        rel="preload"
        as="font"
        href="/fonts/InterVariable.woff2"
        type="font/woff2"
        crossorigin="anonymous" />
    <link
        rel="preload"
        as="font"
        href="/fonts/JetBrainsMonoSemiBold.woff2"
        type="font/woff2"
        crossorigin="anonymous" />
</svelte:head>


<Navbar>
    <a href="/">Home</a>
    <a href="/photos">Photos</a>
    <a href="/links">Links</a>
    <a href="/speedtest">Speedtest</a>
    <a href="/route">Traceroute</a>
    <a href="/sensors">Sensor size comparison</a>
</Navbar>

<Container>
    {@render children?.()}
</Container>

<style>
    :global(body) {
        background-color: var(--color-zinc-900);
    }
</style>