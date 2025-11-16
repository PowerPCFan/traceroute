<script lang="ts">
    import { onMount } from "svelte";
    import type { ProbeResult } from "./api/traceroute/types";
    import L, { LatLng } from "leaflet";
    import Loader from "$lib/components/Loader.svelte";
    import { slide } from "svelte/transition";

    let traceData: ProbeResult[] | undefined = $state();
    let map: L.Map | undefined = undefined;
    let loading = $state(true);

    onMount(async () => {
        const req = await fetch("/api/traceroute");
        const json: ProbeResult[] = await req.json();
        traceData = json;
        loading = false;
        addTraceroutes(traceData);
    })

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
                domain: "Local cell tower",
                index: 0,
                ip: "192.168.32.1",
                domainAnalysis: {
                    cityOrAirport: "",
                    coordinates: [62.4102635, 25.9500597]
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
                    color: "rgb(0,123,255)",
                    weight: 3,
                    opacity: 0.8,
                    smoothFactor: 1
                });

                L.marker([lastData.domainAnalysis.coordinates[0], lastData.domainAnalysis.coordinates[1]]).addTo(map!).bindPopup(`Hop #${lastData.index}: ${lastData.domain} (${lastData.ip}) ${lastData.delay}ms`);

                lastData = data;
                
                polyline.addTo(map!);
            }
            
            // Adding the last point's marker
            // @ts-ignore
            L.marker([lastData.domainAnalysis.coordinates[0], lastData.domainAnalysis.coordinates[1]]).addTo(map!).bindPopup(`Hop #${lastData.index}: ${lastData.domain} (${lastData.ip}) ${lastData.delay}ms`);
    }
</script>

<svelte:head>
     <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
     integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
     crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
     integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
     crossorigin="" onload={_ => mapLoad()}></script>
     
     <style>

        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }

        .leaflet-control-zoom-in span, .leaflet-control-zoom-out span, .leaflet-popup-content  {
            color: black;
        }
     </style>
</svelte:head>
<h1>Traceroute checker</h1>
<p>Does a traceroute to your IP. Parses locations from domains found on the route (e.g sto03 -&gt; Stockholm). Note: click the popups to see the domains on the route</p>
<p>NOTE: this data is most likely inaccurate</p>
{#if loading}
    <div class="flex items-center" transition:slide>
        <Loader></Loader>
        <p>Tracing route, this might take a few seconds</p>
    </div>
{/if}
<div class:opacity-0={loading} class="aspect-video" id="map"></div>