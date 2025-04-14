<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MarkdownRenderer from '../components/MarkdownRenderer.vue';

const route = useRoute();
const router = useRouter();
const post = ref(null);
const loading = ref(true);
const error = ref(null);

const API_URL = `/api`;
const UPLOADS_URL = `/uploads`;

onMounted(async () => {
  await fetchPost();
});

async function fetchPost() {
  try {
    const postId = route.params.id;
    const response = await fetch(`${API_URL}/posts/${postId}`);
    
    if (response.ok) {
      post.value = await response.json();
    } else {
      throw new Error('Post not found');
    }
  } catch (err) {
    console.error('Error fetching post:', err);
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

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function filterByTag(tag) {
  router.push({
    path: '/blog', 
    query: { tag }
  });
}

function filterByCategory(category) {
  router.push({
    path: '/blog',
    query: { category }
  });
}
</script>

<template>
  <div class="post-view">
    <div v-if="loading" class="loading">
      Loading post...
    </div>
    
    <div v-else-if="error" class="error">
      <h2>Error</h2>
      <p>{{ error }}</p>
      <div class="error-actions">
        <router-link to="/blog" class="link-button secondary">
          Back to Blog
        </router-link>
      </div>
    </div>
    
    <div v-else-if="post" class="post-content">
      <h1>{{ post.title }}</h1>
      
      <div class="post-meta">
        <span class="author">By {{ post.author }}</span>
        <span class="date">{{ formatDate(post.created_at) }}</span>
      </div>
      
      <div class="post-categorization">
        <div v-if="post.category_name" class="post-category">
          <span class="category-label">Category:</span>
          <span class="category-pill" @click="filterByCategory(post.category_name)">
            {{ post.category_name }}
          </span>
        </div>
        
        <div v-if="post.tags && post.tags.filter(t => t !== null).length > 0" class="post-tags">
          <span class="tags-label">Tags:</span>
          <span v-for="tag in post.tags.filter(t => t !== null)" :key="tag" 
                class="tag-pill" @click="filterByTag(tag)">
            {{ tag }}
          </span>
        </div>
      </div>
      
      <div class="post-body">
        <MarkdownRenderer :markdown="post.content" />
      </div>
      
      <div v-if="post.attachments && post.attachments.filter(a => a !== null).length > 0" class="post-attachments">
        <h3>Attachments</h3>
        <div class="attachments-gallery">
          <div v-for="(attachment, index) in post.attachments.filter(a => a !== null)" :key="index" class="attachment">
            <a :href="`${UPLOADS_URL}/${attachment}`" target="_blank">
              <img v-if="attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i)" 
                   :src="`${UPLOADS_URL}/${attachment}`" 
                   :alt="`Attachment ${index + 1}`">
              <div v-else class="file-attachment">
                <span class="material-symbols-outlined">description</span>
                <span>{{ attachment }}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
      
      <div class="post-navigation">
        <router-link to="/blog" class="link-button secondary bordered">Back to Blog</router-link>
      </div>
    </div>
  </div>
</template>

<style>
.post-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.loading, .error {
  text-align: center;
  padding: 50px 20px;
}

.post-content h1 {
  font-family: var(--heading-font-family);
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.post-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  color: #666;
  font-family: var(--body-font-family);
  font-style: italic;
}

.post-categorization {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.post-category, .post-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-label, .tags-label {
  font-weight: bold;
  font-family: var(--body-font-family);
}

.category-pill {
  background-color: var(--color-primary);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.category-pill:hover {
  background-color: var(--color-secondary);
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tag-pill {
  background-color: var(--color-accent);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tag-pill:hover {
  background-color: var(--color-accent-hover);
}

.post-body {
  font-family: var(--body-font-family);
  font-size: 1.1rem;
  line-height: 1.7;
  margin-bottom: 40px;
}

.post-attachments {
  margin: 40px 0;
}

.post-attachments h3 {
  font-family: var(--heading-font-family);
  margin-bottom: 20px;
}

.attachments-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.attachment {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.attachment img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.attachment img:hover {
  transform: scale(1.05);
}

.file-attachment {
  height: 200px;
  background-color: #f1f1f1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  transition: background-color 0.3s ease;
}

.file-attachment:hover {
  background-color: #e1e1e1;
}

.file-attachment .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 10px;
}

.post-navigation {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}
</style>
