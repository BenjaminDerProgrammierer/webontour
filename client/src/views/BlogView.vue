<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Logo from '../components/Logo.vue';
import ErrorBox from '../components/ErrorBox.vue';

// Define interfaces for our data structures
interface Attachment {
  id: number;
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
}

interface TagObject {
  id: string | number;
  name: string;
}

type TagType = string | TagObject;

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  attachments: Attachment[];
  category_id?: number;
  category_name?: string;
  tags?: TagType[];
}

const posts = ref<Post[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const selectedTag = ref<string>('');
const selectedCategory = ref<string>('');
const tags = ref<TagType[]>([]);
const categories = ref<string[]>([]);
const route = useRoute();
const router = useRouter();


onMounted(async () => {
  await fetchPosts();
  extractTags();
  extractCategories();

  // Check for tag or category in URL params on initial load
  if (route.query.tag && typeof route.query.tag === 'string') {
    selectedTag.value = route.query.tag;
  }
  if (route.query.category && typeof route.query.category === 'string') {
    selectedCategory.value = route.query.category;
  }
});

// Watch for changes in route query parameters
watch(() => route.query.tag, (newTagValue) => {
  selectedTag.value = typeof newTagValue === 'string' ? newTagValue : '';
}, { immediate: true });

watch(() => route.query.category, (newCategoryValue) => {
  selectedCategory.value = typeof newCategoryValue === 'string' ? newCategoryValue : '';
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

function updateUrlParams(): void {
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
    let url = `/api/posts`;
    const params = new URLSearchParams();

    if (route.query.category) {
      params.append('category', typeof route.query.category === 'string' ? route.query.category : '');
    }
    if (route.query.tag) {
      params.append('tag', typeof route.query.tag === 'string' ? route.query.tag : '');
    }
    if (route.query.author) {
      params.append('author', typeof route.query.author === 'string' ? route.query.author : '');
    }
    
    // Add pagination if needed in the future
    if (route.query.limit) {
      params.append('limit', typeof route.query.limit === 'string' ? route.query.limit : '');
    }
    if (route.query.offset) {
      params.append('offset', typeof route.query.offset === 'string' ? route.query.offset : '');
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
  } catch (err: any) {
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
  const tagSet = new Set<TagType>();
  posts.value.forEach(post => {
    post.tags?.forEach(tag => {
      if (tag !== null) tagSet.add(tag);
    });
  });
  tags.value = Array.from(tagSet).sort() as TagType[];
}

function extractCategories() {
  // Extract unique categories from all posts
  const categorySet = new Set<string>();
  posts.value.forEach(post => {
    if (post.category_name && post.category_name !== null) {
      categorySet.add(post.category_name);
    }
  });
  categories.value = Array.from(categorySet).sort() as string[];
}

function filterByTag(tag: string) {
  selectedTag.value = tag === selectedTag.value ? '' : tag;
}

function filterByCategory(category: string) {
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-AT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function truncateContent(content: string, maxLength = 150): string {
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

    <ErrorBox v-else-if="error" :title="'Error'" :message="error" />

    <template v-else>
      <div class="filters-container">
        <!-- Categories filter -->
        <div v-if="categories.length > 0" class="categories-filter">
          <h2>Filter by Category</h2>
          <div class="categories-list">
            <button v-for="category in categories" :key="category" @click="filterByCategory(category)"
              :class="['filter-btn', { active: selectedCategory === category }]">
              {{ category }}
            </button>
          </div>
          <button v-if="selectedCategory" @click="selectedCategory = ''" class="filter-btn clear">
            Clear Category
          </button>
        </div>

        <!-- Tags filter -->
        <div v-if="tags.length > 0" class="tags-filter">
          <h2>Filter by Tag</h2>
          <div class="tags-list">
            <button v-for="tag in tags" :key="typeof tag === 'object' && 'id' in tag ? tag.id : tag" 
              @click="filterByTag(typeof tag === 'object' && 'name' in tag ? tag.name : String(tag))"
              :class="['tag-filter-btn', { active: selectedTag === (typeof tag === 'object' && 'name' in tag ? tag.name : tag) }, 'filter-btn']">
              {{ typeof tag === 'object' && 'name' in tag ? tag.name : tag }}
            </button>
          </div>
          <button v-if="selectedTag" @click="selectedTag = ''" class="tag-filter-btn filter-btn clear">
            Clear Tag
          </button>
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
          <div
            v-if="post.attachments && post.attachments.some(a => a !== null && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i))"
            class="post-image">
            <img
              :src="`/uploads/${post.attachments.find(a => a !== null && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i))?.filename}`"
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
              <span v-if="post.category_name" class="category-pill" @click="filterByCategory(post.category_name)">
                {{ post.category_name }}
              </span>

              <span v-if="post.tags && post.tags.filter(t => t !== null).length > 0"
                v-for="tag in post.tags.filter(t => t !== null)" :key="typeof tag === 'object' && 'id' in tag ? tag.id : tag" class="tag-pill" 
                @click="filterByTag(typeof tag === 'object' && 'name' in tag ? tag.name : String(tag))">
                {{ typeof tag === 'object' && 'name' in tag ? tag.name : tag }}
              </span>
            </div>

            <p class="post-excerpt">{{ truncateContent(post.content) }}</p>

            <router-link :to="`/post/${post.id}`" class="link-button primary">Read More</router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.blog-view {
  margin: 0 auto;
  padding: 30px;

  background: rgb(255, 255, 255)
    radial-gradient(
      1124px 720px at 0% 0%,
      rgb(222, 231, 248) 0%,
      rgba(222, 231, 248, 0) 100%
    )
    no-repeat padding-box fixed;

  min-height: 100vh;
  height: auto;
}

h1 {
  font-family: var(--heading-font-family);
  font-size: 2.5rem;
  margin-bottom: 30px;
  text-align: center;
}

.loading,
.no-posts {
  text-align: center;
  padding: 50px;
  border-radius: 10px;
  margin: 0 auto;
  max-width: 600px;
  background-color: #efefff;
  font-size: 1.3rem;

  &.no-posts {
    margin: 20px auto;
    background-color: #f8f8f8;
  }
}

img {
  max-width: 100%;
}

.filters-container {
  display: grid;
  grid-template-columns: 1fr 1fr;

}

.categories-filter,
.tags-filter {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: start;
  gap: 10px;

  h2 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    text-align: center;
  }
}

.categories-list,
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 5px;
  justify-content: center;
}

.filter-btn {
  background-color: #1e00c5;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  font-family: var(--body-font-family);
  margin-right: 5px;

  &:hover {
    background-color: #13007d;
  }

  &.tag-filter-btn {
    background-color: #00811e;

    &:hover {
      background-color: #005313;
    }
  }

  &.clear {
    background-color: #e74c3c;
    color: white;

    &:hover {
      background-color: #c0392b;
    }
  }
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.post-card {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  }
}


.post-image {
  height: 250px;
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
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 10px;
  font-family: var(--body-font-family);
}

.post-categorization {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.category-pill,
.tag-pill {
  background-color: var(--color-primary);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-primary-hover);
  }

  &.tag-pill {
    background-color: var(--color-accent);
    color: white;

    &:hover {
      background-color: var(--color-accent-hover);
    }
  }
}

.post-excerpt {
  margin-bottom: 20px;
  line-height: 1.5;
  font-family: var(--body-font-family);
}


@media (max-width: 800px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
