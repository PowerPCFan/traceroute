<script lang="ts">
    import Container from '$lib/components/Container.svelte';

    let { children } = $props();
</script>

<svelte:head>
    <style>
        *, *::before, *::after {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: white;
            box-sizing: border-box;
        }

        h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-block: 0.75rem;
        }

        h2 {
            font-size: 2rem;
            font-weight: 600;
            margin-block: 0.5rem;
        }

        p {
            font-size: 1.1rem;
        }

        html {
            height: 100%;
            margin: 0;
            padding: 0;
        }

        body {
            height: auto;
            overflow-x: hidden;
            background-color: #111111;
        }

        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }

        .leaflet-control-zoom-in span,
        .leaflet-control-zoom-out span,
        .leaflet-popup-content {
            color: black;
        }
    </style>
</svelte:head>

<Container>
    {@render children?.()}
</Container>
