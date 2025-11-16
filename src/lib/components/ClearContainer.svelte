<script lang="ts">
    import { twMerge } from "tailwind-merge";
    import { onMount, type Snippet } from "svelte";

    let { children, className }: {children: Snippet, className: string} = $props();

    let ball: HTMLDivElement;
    let container: HTMLDivElement;

    onMount(() => {
        container.addEventListener("mousemove", event => {
            const rect: DOMRect = container.getBoundingClientRect();
            const left = event.pageX - rect.left;
            const top = event.pageY - rect.top;


            ball.style.top = top - ball.clientHeight/2 + "px";
            ball.style.left = left - ball.clientWidth/2 + "px";
        });

        container.addEventListener("mouseleave", _ => {
            ball.style.opacity = "0%";
        });

        container.addEventListener("mouseenter", _ => {
            ball.style.opacity = "30%";
        });
    });
</script>


<div bind:this={container} class={twMerge(
        "outline-1 overflow-hidden outline-[#ffffff66] drop-shadow-2xl backdrop-blur-sm backdrop-saturate-150 backdrop-brightness-75 rounded-md",
        className
    )}>

    <div class="w-52 h-52 transition-opacity absolute rounded-[100%] blur-[125px] bg-blend-lighten -top-full bg-white" bind:this={ball}></div>
    {@render children?.()}
</div>
