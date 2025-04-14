<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Logo from '../components/Logo.vue';

const posts = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedTag = ref('');
const selectedCategory = ref('');
const tags = ref([]);
const categories = ref([]);
const route = useRoute();
const router = useRouter(); // Properly import router

const API_URL = `/api`;
const UPLOADS_URL = `/uploads`;

onMounted(async () => {
  await fetchPosts();
  extractTags();
  extractCategories();
  
  // Check for tag or category in URL params on initial load
  if (route.query.tag) {
    selectedTag.value = route.query.tag;
  }
  if (route.query.category) {
    selectedCategory.value = route.query.category;
  }
});

// Watch for changes in route query parameters
watch(() => route.query.tag, (newTagValue) => {
  selectedTag.value = newTagValue || '';
}, { immediate: true });

watch(() => route.query.category, (newCategoryValue) => {
  selectedCategory.value = newCategoryValue || '';
}, { immediate: true });

// Also watch selectedTag and selectedCategory to update the URL
watch(() => selectedTag.value, (newTag) => {
  if (newTag !== route.query.tag) {
    updateUrlParams();
  }
});

watch(() => selectedCategory.value, (newCategory) => {
  if (newCategory !== route.query.category) {
    updateUrlParams();
  }
});

function updateUrlParams() {
  // Use the imported router instance directly instead of trying to extract it from route
  const query = { ...route.query };
  
  if (selectedTag.value) {
    query.tag = selectedTag.value;
  } else {
    delete query.tag;
  }
  
  if (selectedCategory.value) {
    query.category = selectedCategory.value;
  } else {
    delete query.category;
  }
  
  router.replace({ query });
}

async function fetchPosts() {
  try {
    // Add query parameters for filtering if needed
    let url = `${API_URL}/posts`;
    const params = new URLSearchParams();
    
    if (route.query.category) {
      params.append('category', route.query.category);
    }
    if (route.query.tag) {
      params.append('tag', route.query.tag);
    }
    
    // Append query parameters if they exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    
    if (response.ok) {
      posts.value = await response.json();
    } else {
      throw new Error('Failed to fetch posts');
    }
  } catch (err) {
    console.error('Error fetching posts:', err);
    // Provide a friendly error message when the backend is down
    if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
      error.value = "Unable to connect to the server. The backend service might be down. Please try again later.";
    } else {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
}

function extractTags() {
  // Extract unique tags from all posts
  const tagSet = new Set();
  posts.value.forEach(post => {
    post.tags?.forEach(tag => {
      if (tag !== null) tagSet.add(tag);
    });
  });
  tags.value = Array.from(tagSet).sort();
}

function extractCategories() {
  // Extract unique categories from all posts
  const categorySet = new Set();
  posts.value.forEach(post => {
    if (post.category_name && post.category_name !== null) {
      categorySet.add(post.category_name);
    }
  });
  categories.value = Array.from(categorySet).sort();
}

function filterByTag(tag) {
  selectedTag.value = tag === selectedTag.value ? '' : tag;
}

function filterByCategory(category) {
  selectedCategory.value = category === selectedCategory.value ? '' : category;
}

const filteredPosts = computed(() => {
  let filtered = posts.value;
  
  // Filter by tag if selected
  if (selectedTag.value) {
    filtered = filtered.filter(post => 
      post.tags?.includes(selectedTag.value)
    );
  }
  
  // Filter by category if selected
  if (selectedCategory.value) {
    filtered = filtered.filter(post => 
      post.category_name === selectedCategory.value
    );
  }
  
  return filtered;
});

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function truncateContent(content, maxLength = 150) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}
</script>

<template>
  <Logo />
  <div class="blog-view">
    <h1>Blog Posts</h1>
    
    <div v-if="loading" class="loading">
      Loading posts...
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="posts-container">
      <!-- Filters section -->
      <div class="filters-container">
        <!-- Categories filter -->
        <div v-if="categories.length > 0" class="categories-filter">
          <h2>Filter by Category</h2>
          <div class="categories-list">
            <button 
              v-for="category in categories" 
              :key="category" 
              @click="filterByCategory(category)" 
              :class="['filter-btn', { active: selectedCategory === category }]">
              {{ category }}
            </button>
            <button v-if="selectedCategory" @click="selectedCategory = ''" class="filter-btn clear">
              Clear Category
            </button>
          </div>
        </div>
        
        <!-- Tags filter -->
        <div v-if="tags.length > 0" class="tags-filter">
          <h2>Filter by Tag</h2>
          <div class="tags-list">
            <button 
              v-for="tag in tags" 
              :key="tag" 
              @click="filterByTag(tag)" 
              :class="['tag-filter-btn', { active: selectedTag === tag }]">
              {{ tag }}
            </button>
            <button v-if="selectedTag" @click="selectedTag = ''" class="tag-filter-btn clear">
              Clear Tag
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="filteredPosts.length === 0" class="no-posts">
        <p>
          <template v-if="selectedCategory && selectedTag">
            No posts with category "{{ selectedCategory }}" and tag "{{ selectedTag }}".
          </template>
          <template v-else-if="selectedCategory">
            No posts with category "{{ selectedCategory }}".
          </template>
          <template v-else-if="selectedTag">
            No posts with tag "{{ selectedTag }}".
          </template>
          <template v-else>
            No posts available yet.
          </template>
        </p>
      </div>
      
      <div v-else class="posts-grid">
        <div v-for="post in filteredPosts" :key="post.id" class="post-card">
          <div v-if="post.attachments && post.attachments.some(a => a !== null && a.match(/\.(jpeg|jpg|gif|png|webp)$/i))" class="post-image">
            <img :src="`${UPLOADS_URL}/${post.attachments.find(a => a !== null && a.match(/\.(jpeg|jpg|gif|png|webp)$/i))}`" 
                 :alt="post.title">
          </div>
          <div v-else class="post-image placeholder">
            <span class="material-symbols-outlined">article</span>
          </div>
          
          <div class="post-details">
            <h2>{{ post.title }}</h2>
            
            <div class="post-meta">
              <span class="author">By {{ post.author }}</span>
              <span class="date">{{ formatDate(post.created_at) }}</span>
            </div>
            
            <div class="post-categorization">
              <div v-if="post.category_name" class="post-category">
                <span class="category-pill" @click="filterByCategory(post.category_name)">
                  {{ post.category_name }}
                </span>
              </div>
              
              <div v-if="post.tags && post.tags.filter(t => t !== null).length > 0" class="post-tags">
                <span 
                  v-for="tag in post.tags.filter(t => t !== null)" 
                  :key="tag" 
                  class="tag-pill"
                  @click="filterByTag(tag)">
                  {{ tag }}
                </span>
              </div>
            </div>
            
            <p class="post-excerpt">{{ truncateContent(post.content) }}</p>
            
            <router-link :to="`/post/${post.id}`" class="link-button primary">Read More</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.blog-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.blog-view h1 {
  font-family: var(--heading-font-family);
  font-size: 2.5rem;
  margin-bottom: 30px;
  text-align: center;
}

.loading, .error {
  text-align: center;
  padding: 50px 0;
}

.error {
  background-color: #fff0f0;
  border-radius: 10px;
  padding: 20px;
  margin: 0 auto;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.retry-button {
  margin-top: 10px;
}

.no-posts {
  text-align: center;
  padding: 50px 20px;
  background-color: #f8f8f8;
  border-radius: 10px;
}

.filters-container {
  margin-bottom: 30px;
}

.categories-filter {
  margin-bottom: 20px;
}

.categories-filter h2, .tags-filter h2 {
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.categories-list, .tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-btn, .tag-filter-btn {
  background-color: #f1f1f1;
  color: #333;
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  font-family: var(--body-font-family);
  outline: none;
}

.filter-btn:hover, .tag-filter-btn:hover {
  background-color: #e1e1e1;
}

.filter-btn.active, .tag-filter-btn.active {
  background-color: var(--color-accent);
  color: white;
}

.filter-btn.clear, .tag-filter-btn.clear {
  background-color: #e74c3c;
  color: white;
}

.filter-btn.clear:hover, .tag-filter-btn.clear:hover {
  background-color: #c0392b;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
}

.post-card {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.post-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
}

.post-image {
  height: 200px;
  overflow: hidden;
}

.post-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.post-card:hover .post-image img {
  transform: scale(1.05);
}

.post-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f1f1;
}

.post-image.placeholder .material-symbols-outlined {
  font-size: 48px;
  color: #aaa;
}

.post-details {
  padding: 20px;
}

.post-details h2 {
  font-family: var(--heading-font-family);
  font-size: 1.4rem;
  margin-bottom: 10px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 15px;
  font-family: var(--body-font-family);
}

.post-categorization {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.post-category {
  margin-right: 10px;
}

.category-pill {
  background-color: var(--color-primary);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.category-pill:hover {
  background-color: var(--color-secondary);
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  background-color: var(--color-accent);
  color: white;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tag-pill:hover {
  background-color: #4720cc;
}

.post-excerpt {
  color: #444;
  margin-bottom: 20px;
  line-height: 1.5;
  font-family: var(--body-font-family);
}

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
