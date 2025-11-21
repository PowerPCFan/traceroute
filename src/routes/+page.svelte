<script lang="ts">
    import { onMount } from "svelte";
    import type { ProbeResult } from "$lib/api-types";
    import L, { LatLng } from "leaflet";
    import Loader from "$lib/components/Loader.svelte";
    import { slide } from "svelte/transition";

    let traceData: ProbeResult[] | undefined = $state(undefined);
    let map: L.Map | undefined = $state(undefined);
    let loading = $state(true);
    let error = $state(false);

    onMount(async () => {
        const req = await fetch("/api");
        const json: ProbeResult[] = await req.json();
        traceData = json;
        loading = false;
        addTraceroutes(traceData);
    });

    function mapLoad() {
        map = L.map("map").setView([42.35, -71.05], 3);
        L.tileLayer("https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(map);

        if (traceData) {
            addTraceroutes(traceData);
        }
    }

    function addTraceroutes(trace: ProbeResult[]) {
         console.log("Processing trace data");
            let lastData: ProbeResult | undefined = {
                delay: 0,
                domain: "Origin Server",
                index: 0,
                ip: "Unknown",
                domainAnalysis: {
                    cityOrAirport: "",
                    coordinates: [42.3584, -71.0598]  // boston, ma coordinates (dont wanna leak my house)
                }
            };
            for (let data of trace) {
                if (!data.domainAnalysis) {
                    continue;
                }
                if (!lastData || !lastData.domainAnalysis) {
                    lastData = data;
                    continue;
                }

                console.log(lastData);
                const oldPoint = new LatLng(lastData.domainAnalysis.coordinates[0], lastData.domainAnalysis.coordinates[1]);
                const newPoint = new LatLng(data.domainAnalysis.coordinates[0], data.domainAnalysis.coordinates[1]);

                const polyline: L.Polyline = new L.Polyline([oldPoint, newPoint], {
                    color: "rgb(0, 123, 255)",
                    weight: 3,
                    opacity: 0.8,
                    smoothFactor: 1
                });

                L.marker([lastData.domainAnalysis.coordinates[0], lastData.domainAnalysis.coordinates[1]]).addTo(map!).bindPopup(`Hop #${lastData.index}: ${lastData.domain} (${lastData.ip}) ${lastData.delay}ms`);

                lastData = data;
                
                polyline.addTo(map!);
            }

            L.marker([lastData.domainAnalysis!.coordinates[0], lastData.domainAnalysis!.coordinates[1]]).addTo(map!).bindPopup(`Hop #${lastData.index}: ${lastData.domain} (${lastData.ip}) ${lastData.delay}ms`);
    }
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="" onload={_ => mapLoad()}></script>
</svelte:head>

<h1>Traceroute</h1>
<p>Does a traceroute to your IP and parses locations from domains found on the route (e.g sto03 -&gt; Stockholm). Click the pins to see a popup with information.</p>
<p class="italic">Note: The locations shown on the map may be inaccurate.</p>

{#if loading}
    <div style="display: flex; align-items: center" transition:slide>
        <Loader></Loader>
        <p>Tracing route, this might take some time...</p>
    </div>
{/if}

{#if error}
    <p style="color: red;">An unknown error occurred.</p>
{/if}

<div id="map" class:should-show={!loading && !error}></div>

<style>
    /* i hate this translate thing but its the only thing that works decently */

    #map {
        aspect-ratio: 16 / 9;
        opacity: 0; transition: opacity 0.2s ease-in-out;
        /* transform: translateX(-100vw); */
    }

    #map.should-show {
        opacity: 1;
        /* transform: translateX(0); */
    }
</style>
