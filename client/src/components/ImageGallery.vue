<script setup>
import { ref } from 'vue';

const images = ref([
    '20180804_024529.jpg',
    '20220731_174021.jpg',
    '2022-08-13_0151.jpg',
    '2023-07-17_0047.jpg',
    '2023-07-18_eva_0010.jpg',
    '2023-07-22_eva_0039.jpg',
    '2023-07-23_grcam_0122.jpg',
    '2023-07-26_grcam_0082-1.jpg',
    '2023-07-30_werner_0005.jpg',
    '2023-08-06_grcam_0003.jpg',
    '2023-08-08_eva_0025.jpg',
]);
</script>

<template>
    <div class="image-gallery">
        <img v-for="(image, index) in images" :key="index" :src="`/assets/images/slides/${image}`"
            :alt="(index + 1)" />
    </div>
</template>

<style>
.image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    padding: 10px;
    border: 2px solid #bbb;
    border-radius: 10px;
    background-color: #ccc;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        border-radius: 10px;
        filter: grayscale(0.8);
        transition: filter 0.3s ease;

        &:hover {
            filter: grayscale(0);
        }
    }
}

@media (max-width: 800px) {
    .image-gallery {
        grid-template-columns: 1fr;
        gap: 5px;
        padding: 5px;

        img {
            filter: none;
        }
    }
}
</style>
