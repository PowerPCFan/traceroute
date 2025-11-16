<script lang="ts">
    import type { Snippet } from "svelte";

    let { children }: {children: Snippet} = $props();
</script>

<nav class="bg-[#00000022] h-12 items-center flex space-x-2 pr-2 pl-2 [&>a]:text-xl [&>a]:font-semibold">
    {@render children?.()}
</nav>
