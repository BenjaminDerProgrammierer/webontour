<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UserManagement from '../components/UserManagement.vue';
import AdminCrud from '../components/AdminCrud.vue';
import Logo from '../components/Logo.vue';

const router = useRouter();
const posts = ref([]);
const isAuthenticated = ref(false);
const loading = ref(true);
const error = ref(null);
const currentUser = ref(null);

// Form data for new/edit post
const formMode = ref('create'); // 'create' or 'edit'
const currentPostId = ref(null);
const title = ref('');
const content = ref('');
const attachments = ref([]);
const selectedFiles = ref([]);
const attachmentsToRemove = ref([]);
const selectedTags = ref([]);
const availableTags = ref([]);
const availableCategories = ref([]);
const selectedCategoryId = ref(null);
const newTag = ref('');
const newCategory = ref('');
const showNewCategoryInput = ref(false);

// UI state
const activeTab = ref('posts'); // 'posts', 'users' or 'crud'


onMounted(async () => {
  await checkAuthStatus();
  if (isAuthenticated.value) {
    await Promise.all([fetchPosts(), fetchTags(), fetchCategories()]);
  } else {
    // Redirect to login if not authenticated
    router.replace('/login');
  }
});

async function checkAuthStatus() {
  try {
    // First check if setup is needed
    const setupResponse = await fetch(`/api/setup/status`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (setupResponse.ok) {
      const setupData = await setupResponse.json();
      if (setupData.needsSetup) {
        // Redirect to setup page if no users exist
        router.replace('/setup');
        return;
      }
    }

    // Continue with normal auth check
    const response = await fetch(`/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      currentUser.value = userData;
      isAuthenticated.value = true;
    } else {
      isAuthenticated.value = false;
    }
  } catch (err) {
    console.error('Auth check error:', err);
    isAuthenticated.value = false;
  } finally {
    loading.value = false;
  }
}

async function logout() {
  try {
    await fetch(`/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    isAuthenticated.value = false;
    currentUser.value = null;
    router.replace('/login');
  } catch (err) {
    console.error('Logout error:', err);
  }
}

async function fetchPosts() {
  try {
    const response = await fetch(`/api/posts`, {
      credentials: 'include'
    });

    if (response.ok) {
      posts.value = await response.json();
    } else {
      throw new Error('Failed to fetch posts');
    }
  } catch (err) {
    console.error('Error fetching posts:', err);
  }
}

async function fetchTags() {
  try {
    const response = await fetch(`/api/posts/tags`, {
      credentials: 'include'
    });

    if (response.ok) {
      availableTags.value = await response.json();
    } else {
      throw new Error('Failed to fetch tags');
    }
  } catch (err) {
    console.error('Error fetching tags:', err);
  }
}

async function fetchCategories() {
  try {
    const response = await fetch(`/api/posts/categories`, {
      credentials: 'include'
    });

    if (response.ok) {
      availableCategories.value = await response.json();
    } else {
      throw new Error('Failed to fetch categories');
    }
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

function handleFileChange(event) {
  selectedFiles.value = Array.from(event.target.files);
}

function resetForm() {
  formMode.value = 'create';
  currentPostId.value = null;
  title.value = '';
  content.value = '';
  selectedFiles.value = [];
  attachments.value = [];
  attachmentsToRemove.value = [];
  selectedTags.value = [];
  selectedCategoryId.value = null;
  newTag.value = '';
}

function editPost(post) {
  formMode.value = 'edit';
  currentPostId.value = post.id;
  title.value = post.title;
  content.value = post.content;
  selectedCategoryId.value = post.category_id;

  attachments.value = Array.isArray(post.attachments) ? post.attachments : [];
  attachmentsToRemove.value = [];

  if (post.tags && Array.isArray(post.tags)) {
    selectedTags.value = post.tags.filter(tag => tag !== null);
  } else {
    selectedTags.value = [];
  }

  // Scroll to form
  document.getElementById('post-form').scrollIntoView({ behavior: 'smooth' });
}

function toggleAttachmentRemoval(attachment) {
  const index = attachmentsToRemove.value.indexOf(attachment);
  if (index === -1) {
    attachmentsToRemove.value.push(attachment);
  } else {
    attachmentsToRemove.value.splice(index, 1);
  }
}

function addTag() {
  if (newTag.value && !selectedTags.value.includes(newTag.value)) {
    selectedTags.value.push(newTag.value);
    newTag.value = '';
  }
}

function removeTag(tag) {
  const index = selectedTags.value.indexOf(tag);
  if (index !== -1) {
    selectedTags.value.splice(index, 1);
  }
}

async function submitPost(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append('title', title.value);
  formData.append('content', content.value);

  // Append category ID if selected
  if (selectedCategoryId.value) {
    formData.append('category_id', selectedCategoryId.value);
  }

  // Append files
  for (const file of selectedFiles.value) {
    formData.append('attachments', file);
  }

  // Append tags
  for (const tag of selectedTags.value) {
    formData.append('tags', tag);
  }

  // For edit mode, include attachments to remove
  if (formMode.value === 'edit' && attachmentsToRemove.value.length > 0) {
    for (const attachment of attachmentsToRemove.value) {
      formData.append('removeAttachments', attachment);
    }
  }

  try {
    let response;

    if (formMode.value === 'create') {
      response = await fetch(`/api/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
    } else {
      response = await fetch(`/api/posts/${currentPostId.value}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || `Failed to submit post: ${response.statusText}`);
    }

    await Promise.all([fetchPosts(), fetchTags()]);
    resetForm();
  } catch (err) {
    console.error('Error submitting post:', err);
    error.value = err.message;
  }
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) {
    return;
  }

  try {
    const response = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || `Failed to delete post: ${response.statusText}`);
    }

    await fetchPosts();
  } catch (err) {
    console.error('Error deleting post:', err);
    error.value = err.message;
  }
}

// Check if the user has at least one of the required roles
function hasAnyRole(requiredRoles) {
  if (!currentUser.value) return false;
  return requiredRoles.includes(currentUser.value.role);
}

// For convenience, specific role checks
const isAdmin = () => currentUser.value?.role === 'admin';
const isModerator = () => ['admin', 'moderator'].includes(currentUser.value?.role);

async function createCategory() {
  if (!newCategory.value.trim()) {
    return;
  }

  try {
    const response = await fetch(`/api/posts/categories`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newCategory.value.trim(), description: '' })
    });

    if (response.ok) {
      const createdCategory = await response.json();
      availableCategories.value.push(createdCategory);
      selectedCategoryId.value = createdCategory.id;
      newCategory.value = '';
      showNewCategoryInput.value = false;
    } else {
      const data = await response.json();
      throw new Error(data.message || 'Failed to create category');
    }
  } catch (err) {
    console.error('Error creating category:', err);
    error.value = err.message;
  }
}

function toggleNewCategoryInput() {
  showNewCategoryInput.value = !showNewCategoryInput.value;
  if (showNewCategoryInput.value) {
    // Focus the input after it's shown
    setTimeout(() => {
      document.getElementById('new-category-input').focus();
    }, 0);
  }
}
</script>

<template>
  <Logo />

  <div class="admin-container">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="isAuthenticated" class="admin-dashboard">
      <div class="admin-header">
        <h2>Welcome to the Admin Dashboard</h2>
        <div class="user-info">
          <span class="username">{{ currentUser?.username }}</span>
          <span class="role-badge" :class="currentUser?.role">{{ currentUser?.role }}</span>
          <button @click="logout" class="link-button secondary">Logout</button>
        </div>
      </div>

      <div class="tabs">
        <button @click="activeTab = 'posts'" :class="{ active: activeTab === 'posts' }" class="tab-button">
          Manage Posts
        </button>

        <button v-if="isAdmin()" @click="activeTab = 'users'" :class="{ active: activeTab === 'users' }"
          class="tab-button">
          Manage Users
        </button>
        <button v-if="isAdmin()" @click="activeTab = 'crud'" :class="{ active: activeTab === 'crud' }"
          class="tab-button">
          Advanced CRUD
        </button>
      </div>

      <div v-if="activeTab === 'posts'" class="tab-content posts-tab">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <form id="post-form" @submit="submitPost" class="create-post-form">
          <h3>{{ formMode === 'create' ? 'Create New Post' : 'Edit Post' }}</h3>

          <div class="form-group">
            <label for="title">Title:</label>
            <input type="text" id="title" v-model="title" required>
          </div>

          <div class="form-group">
            <label for="content">Content:</label>
            <textarea id="content" v-model="content" rows="10" required></textarea>
            <small>Supports Markdown formatting</small>
          </div>

          <div class="form-group">
            <label for="category">Category:</label>
            <div class="category-selector">
              <select id="category" v-model="selectedCategoryId">
                <option :value="null">-- Select Category --</option>
                <option v-for="category in availableCategories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <button type="button" @click="toggleNewCategoryInput" class="link-button secondary small">
                {{ showNewCategoryInput ? 'Cancel' : 'New Category' }}
              </button>
            </div>

            <div v-if="showNewCategoryInput" class="new-category-input">
              <input type="text" id="new-category-input" v-model="newCategory" placeholder="Enter new category name"
                @keyup.enter="createCategory">
              <button type="button" @click="createCategory" class="link-button primary small">Add</button>
            </div>
          </div>

          <!-- File Upload -->
          <div class="form-group">
            <label for="files">Attachments:</label>
            <input type="file" id="files" multiple @change="handleFileChange">
            <small>Select multiple files if needed (5MB limit per file)</small>
          </div>

          <!-- Current Attachments (Edit Mode) -->
          <div v-if="formMode === 'edit' && attachments.length > 0" class="current-attachments">
            <h4>Current Attachments</h4>
            <div class="attachment-list">
              <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item"
                :class="{ 'marked-remove': attachmentsToRemove.includes(attachment) }">
                <span class="filename">{{ attachment.filename }}</span>
                <button type="button" @click="toggleAttachmentRemoval(attachment)" class="toggle-remove">
                  {{ attachmentsToRemove.includes(attachment) ? 'Keep' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-group">
            <label for="tags">Tags:</label>
            <div class="tag-selector">
              <div class="selected-tags">
                <span v-for="tag in selectedTags" :key="tag" class="tag">
                  {{ tag }}
                  <button type="button" @click="removeTag(tag)" class="remove-tag">&times;</button>
                </span>
              </div>
              <div class="add-tag">
                <input type="text" v-model="newTag" placeholder="Add a tag" @keyup.enter.prevent="addTag">
                <button type="button" @click="addTag" class="link-button primary small">Add</button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="link-button primary">
              {{ formMode === 'create' ? 'Create Post' : 'Update Post' }}
            </button>
            <button type="button" @click="resetForm" class="link-button secondary">Cancel</button>
          </div>
        </form>

        <div class="post-lists">
          <div class="posts-list">
            <h3>Your Posts</h3>

            <div v-if="posts.length === 0" class="no-posts">
              No posts yet. Create one using the form above.
            </div>

            <div v-else class="post-cards">
              <div v-for="post in posts.filter(p => p.author === currentUser?.username)" :key="post.id"
                class="post-card">
                <h4 class="post-title">{{ post.title }}</h4>
                <div class="post-meta">
                  <p class="post-date">{{ new Date(post.created_at).toLocaleDateString() }}</p>
                  <p class="post-category" v-if="post.category_name">{{ post.category_name }}</p>
                </div>
                <div class="post-tags">
                  <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
                </div>
                <div class="post-actions">
                  <a :href="`/post/${post.id}`" target="_blank" class="link-button small">View</a>
                  <button @click="editPost(post)" class="link-button primary small">Edit</button>
                  <button @click="deletePost(post.id)" class="link-button danger small">Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div class="posts-list" v-if="isAdmin()">
            <h3>Other's Posts</h3>

            <div v-if="posts.length === 0" class="no-posts">
              No posts from other users yet.
            </div>

            <div v-else class="post-cards">
              <div v-for="post in posts.filter(p => p.author !== currentUser?.username)" :key="post.id"
                class="post-card">
                <h4 class="post-title">{{ post.title }}</h4>
                <div class="post-meta">
                  <p class="post-date">{{ new Date(post.created_at).toLocaleDateString() }}</p>
                  <p class="post-category" v-if="post.category_name">{{ post.category_name }}</p>
                </div>
                <div class="post-tags">
                  <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
                </div>
                <div class="post-actions">
                  <a :href="`/post/${post.id}`" target="_blank" class="link-button small">View</a>
                  <button @click="editPost(post)" class="link-button primary small">Edit</button>
                  <button @click="deletePost(post.id)" class="link-button danger small">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'users'" class="tab-content users-tab">
        <UserManagement />
      </div>

      <div v-else-if="activeTab === 'crud'" class="tab-content crud-tab">
        <AdminCrud />
      </div>
    </div>

    <div v-else-if="!loading" class="not-authenticated">
      <h2>Not Authenticated</h2>
      <p>Please log in to access the admin dashboard.</p>
      <router-link to="/login" class="link-button primary">Go to Login</router-link>
    </div>
  </div>
</template>

<style scoped>
.post-lists {
  display: grid;
  gap: 20px;
  grid-template-rows: 1fr 1fr;
  height: 100%;
  &>* {
    height: 100%;
  }
}

.admin-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.loading,
.not-authenticated {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  text-align: center;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.admin-header h2 {
  margin: 0;
  color: #2c3e50;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-weight: bold;
}

.role-badge {
  background-color: #eee;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  text-transform: uppercase;
}

.role-badge.admin {
  background-color: #2c3e50;
  color: white;
}

.role-badge.moderator {
  background-color: #3498db;
  color: white;
}

.role-badge.writer {
  background-color: #27ae60;
  color: white;
}

.role-badge.user {
  background-color: #95a5a6;
  color: white;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-button {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-button.active {
  background-color: #2c3e50;
  color: white;
  border-color: #2c3e50;
}

.tab-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.posts-tab {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 1000px) {
  .posts-tab {
    grid-template-columns: 1fr 1fr;
  }
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  grid-column: 1 / -1;
}

.create-post-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.create-post-form h3 {
  margin-top: 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group small {
  color: #6c757d;
  font-size: 12px;
}

.category-selector {
  display: flex;
  gap: 10px;
}

.category-selector select {
  flex: 1;
}

.new-category-input {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.new-category-input input {
  flex: 1;
}

.current-attachments {
  margin: 15px 0;
}

.current-attachments h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background-color: #f1f1f1;
  border-radius: 4px;
}

.attachment-item.marked-remove {
  background-color: #f8d7da;
  text-decoration: line-through;
}

.toggle-remove {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
}

.tag-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background-color: #e9ecef;
  padding: 3px 8px;
  border-radius: 15px;
  font-size: 12px;
}

.remove-tag {
  background: none;
  border: none;
  color: #495057;
  margin-left: 5px;
  cursor: pointer;
  font-size: 14px;
}

.add-tag {
  display: flex;
  gap: 10px;
}

.add-tag input {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.posts-list {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.posts-list h3 {
  margin-top: 0;
  color: #2c3e50;
}

.no-posts {
  text-align: center;
  padding: 20px;
  color: #6c757d;
}

.post-cards {
  display: grid;
  gap: 15px;
  max-height: 100%;
  overflow-y: auto;
  padding-right: 10px;
}

.post-card {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.post-title {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  color: #6c757d;
  font-size: 12px;
  margin-bottom: 10px;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.post-tag {
  background-color: #e9ecef;
  padding: 3px 8px;
  border-radius: 15px;
  font-size: 12px;
}

.post-actions {
  display: flex;
  gap: 5px;
  justify-content: flex-end;
}

.link-button.small {
  font-size: 12px;
  padding: 5px 10px;
}

.link-button.danger {
  background-color: #dc3545;
  color: white;
}

.link-button.danger:hover {
  background-color: #c82333;
}
</style>
