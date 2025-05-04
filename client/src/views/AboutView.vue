<script setup>
import Logo from '../components/Logo.vue';
import ImageGallery from '../components/ImageGallery.vue';
</script>

<template>
    <Logo />
    <div class="about">
        <h1>About us</h1>
        <!-- TODO -->
        <p>Hier kommst später etwas mehr inhalt hin.</p>
        <ImageGallery />
    </div>
</template>

<style>
.about {
    margin-top: 5%;
    font-size: 2rem;
    font-family: var(--heading-font-family);
    color: var(--color-secondary);
    padding: 0% 10%;

    h1 {
        font-size: 3rem;
        font-family: var(--heading-font-family);
        color: var(--color-secondary);
        text-align: center;
    }
}

@media (max-width: 800px) {
    .about {
        font-size: 1.5rem;
        padding: 0% 5%;
    }

    h1 {
        font-size: 2rem;
    }
    
}
</style>