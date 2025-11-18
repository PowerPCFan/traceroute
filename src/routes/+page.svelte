<script lang="ts">
    import { onMount } from "svelte";
    import type { ProbeResult } from "$lib/api-types";
    import L, { LatLng } from "leaflet";
    import Loader from "$lib/components/Loader.svelte";
    import { slide } from "svelte/transition";

    let traceData: ProbeResult[] | undefined = $state();
    let map: L.Map | undefined = undefined;
    let loading = $state(true);

    onMount(async () => {
        const req = await fetch("/api");
        const json: ProbeResult[] = await req.json();
        traceData = json;
        loading = false;
        addTraceroutes(traceData);
    });

    function mapLoad() {
        map = L.map("map").setView([62.25, 25.57], 3);
        L.tileLayer("https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(map);

        if(traceData) {
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
                    coordinates: [42.4667, -70.9493]  // not my actual coordinates obviously lol
                }
            };
            for(let data of trace) {
                if(!data.domainAnalysis) {
                    continue;
                }
                if(!lastData || !lastData.domainAnalysis) {
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
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="" onload={_ => mapLoad()}></script>
</svelte:head>

<h1>Traceroute Checker</h1>
<p>Does a traceroute to your IP and parses locations from domains found on the route (e.g sto03 -&gt; Stockholm). Click the pins to see a popup with information.</p>
<p class="italic">Note: The locations shown on the map may be inaccurate.</p>

{#if loading}
    <div class="flex items-center" transition:slide>
        <Loader></Loader>
        <p>Tracing route, this might take a few seconds</p>
    </div>
{/if}

<div class:opacity-0={loading} class="aspect-video" id="map"></div>
