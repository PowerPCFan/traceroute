<script lang="ts">
    import { formatMinutes } from "$lib";
    let { metricValue, type="km", metricUnit, imperialUnit }: { metricValue: number, type?: "km" | "m/km", metricUnit: string, imperialUnit: string} = $props();
    import { usingImperial } from "$lib/store";

    function kilometersToMiles(): number {
        return Math.round(metricValue / 1.621371192*100)/100;
    }

    function minPerKmToMinPerMile(): number {
        return Math.round(metricValue / 0.621371192*100)/100;
    }
</script>

<span>
    {#if $usingImperial}
        {#if type === "km"}
            {kilometersToMiles()} 
        {:else if type == "m/km"}
            {formatMinutes(minPerKmToMinPerMile())}
        {/if}
        {imperialUnit}
    {:else}
        {#if type==="m/km"}
            {formatMinutes(metricValue)}
        {:else}
            {metricValue}
        {/if}
        {metricUnit}

    {/if}
</span>