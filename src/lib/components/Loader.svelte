<span class="loader"></span>

<style>
    .loader {
        display: inline-block;
        transform: translateZ(1px);
    }

    .loader:after {
        content: "";
        display: inline-block;
        width: 24px;
        height: 24px;
        margin-right: 8px;
        border-radius: 50%;
        background: #ffffff;
        animation: coin-flip 2.4s cubic-bezier(.23,.02,0,1.03) infinite;
    }

    @keyframes coin-flip {
        0% {
            transform: rotateY(0deg);
        }
        100% {
            transform: rotateY(3600deg);
        }
    }
</style>