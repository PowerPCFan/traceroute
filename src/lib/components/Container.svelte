<script lang="ts">
    let { children } = $props();
</script>

<div class="element">
    {@render children()}
</div>

<style>
    .element {
        width: 90%;
        background-color: #18181b;
        margin-left: auto;
        margin-right: auto;
        border-radius: 1rem;
        padding: 0.5rem;
        margin-top: 1rem;
        max-width: 42rem;
    }

    @media (min-width: 768px) {
        .element {
            width: 75%;
        }
    }

    @media (min-width: 1024px) {
        .element {
            width: 65%;
        }
    }
</style>