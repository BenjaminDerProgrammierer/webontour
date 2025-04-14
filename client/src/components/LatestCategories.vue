<!-- A list of all categories - for use on the home page. -->
<script setup>
import { ref, onMounted } from 'vue';
const categories = ref([]);
let myError = ref(null);

onMounted(async () => {
  try {
    const response = await fetch(`/api/posts/categories/all`);
    const categoriesData = await response.json();
    categoriesData.sort((a, b) => a.created_at.localeCompare(b.created_at));
    categories.value = categoriesData.map(category => ({
      id: category.id,
      name: category.name,
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    myError.value = error;
  }
});
</script>

<template>
  <p v-if="!categories.length">No categories available.</p>
  <ul v-if="categories.length">
    <li v-for="category in categories" :key="category.id">
      <router-link :to="{ name: 'blog', query: { category: category.name } }">
        {{ category.name }}
      </router-link>
    </li>
  </ul>
</template>

<style scoped>
ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

ul li {
  font-size: 18px;
  display: flex;
  align-items: center;
}

ul li::before {
  content: '';
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-right: 0.5em;
  background: url('/assets/icons/IcSharpLocationOn.svg') no-repeat center;
  background-size: contain;
  filter: brightness(0) invert(1);
}

ul li a {
  text-decoration: none;
  color: #ddffdd;
  font-family: var(--body-font-family);
  transition: color 0.1s ease;

  &:hover {
    color: var(--color-primary);
  }
}
</style>