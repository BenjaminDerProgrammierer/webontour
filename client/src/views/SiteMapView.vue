<!-- Display all sites in the router in a list -->
<script setup>
import { useRouter } from 'vue-router';
// get all routes from the router
const router = useRouter();
const allRoutes = router.getRoutes();
console.log(allRoutes);
</script>

<template>
  <div class="site-map">
    <h1>Site Map</h1>
    <ul>
      <li v-for="(route, index) in allRoutes" :key="index">
        <router-link :to="route.path">{{ route.name }}</router-link>
      </li>
    </ul>
  </div>
</template>
