<script lang="ts">
    import Container from '$lib/components/Container.svelte';

    let { children } = $props();
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>

    <style>
        code > span {
            padding-left: 5px;
        }

        pre {
            background-color: #121212;
            border-radius: 1rem;
            padding: 2px;
        }

        * {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: white;
        }

        h1, h2, h3, p, a {
            filter: drop-shadow(0px 2px 12px rgba(0, 0, 0, 0.103));
        }

        h1 {
            font-size: 3em;
            font-weight: 650;
            line-height: 46px;
            margin-bottom: 12px;
        }

        h2 {
            font-size: 2em;
            font-weight: 600;
            line-height: 30px;
            margin-bottom: 6px;
            margin-top: 6px;
        }

        h3 {
            font-size: 1.2em;
            font-weight: 550;

        }

        h1, h2 {
            font-family: "JetBrains-mono", monospace;
            text-transform: lowercase;
            background-color: #121212;
            height: fit-content;
            width: fit-content;

        }

        a {
            border-bottom: 0px solid white;
            padding-bottom: 2px;
        }

        p {
            font-size: 1.1em;
        }

        a:hover {
            animation-duration: 2s;
            border-bottom-width: 2px;
            padding-bottom: 0px;
        }

        body {
            overflow-x: hidden;
        }

        body {
            background-color: #121212;
        }

        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }

        .leaflet-control-zoom-in span, .leaflet-control-zoom-out span, .leaflet-popup-content  {
            color: black;
        }
    </style>
</svelte:head>

<Container>
    {@render children?.()}
</Container>
