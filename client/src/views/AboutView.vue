<script setup>
import Logo from '../components/Logo.vue';
</script>

<template>
    <Logo />
    <div class="unimplemented">
        <h1>About</h1>
        <p>The <code>About.vue</code> page not implemented yet.</p>
    </div>
</template>

<style>
.unimplemented {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 2em;
    font-family: var(--heading-font-family);
    color: var(--color-secondary);
    padding: 0% 10%;

    h2 {
        font-size: 2rem;
        font-family: var(--heading-font-family);
        color: var(--color-secondary);
        text-align: center;
    }

    p {
        font-size: 1.5rem;
        font-family: var(--body-font-family);
        color: var(--color-secondary);
        text-align: center;
    }

    code {
        font-size: 1em;
        font-family: 'Courier New', Courier, monospace;
        color: var(--color-primary);
    }
}
</style>