<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import UserManagement from '../components/UserManagement.vue';
import AdminCrud from '../components/AdminCrud.vue';

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

const API_URL = `/api`;
const UPLOADS_URL = `/uploads`;

onMounted(async () => {
  await checkAuthStatus();
  if (isAuthenticated.value) {
    await Promise.all([fetchPosts(), fetchTags(), fetchCategories()]);
  }
});

async function checkAuthStatus() {
  try {
    // First check if setup is needed
    const setupResponse = await fetch(`${API_URL}/setup/status`, {
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
    const response = await fetch(`${API_URL}/auth/me`, {
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

async function login(event) {
  event.preventDefault();
  const username = event.target.username.value;
  const password = event.target.password.value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser.value = data.user;
      isAuthenticated.value = true;
      error.value = null;
      await Promise.all([fetchPosts(), fetchTags(), fetchCategories()]);
    } else {
      const data = await response.json();
      error.value = data.message || 'Login failed';
    }
  } catch (err) {
    console.error('Login error:', err);
    error.value = 'Login failed. Please try again.';
  }
}

async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    isAuthenticated.value = false;
    currentUser.value = null;
  } catch (err) {
    console.error('Logout error:', err);
  }
}

async function fetchPosts() {
  try {
    const response = await fetch(`${API_URL}/posts`, {
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
    const response = await fetch(`${API_URL}/posts/tags/all`, {
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
    const response = await fetch(`${API_URL}/posts/categories/all`, {
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

function toggleAttachmentRemoval(filename) {
  const index = attachmentsToRemove.value.indexOf(filename);
  if (index === -1) {
    attachmentsToRemove.value.push(filename);
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
    attachmentsToRemove.value.forEach(filename => {
      formData.append('removeAttachments[]', filename);
    });
  }
  
  try {
    let response;
    
    if (formMode.value === 'create') {
      response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
    } else {
      response = await fetch(`${API_URL}/posts/${currentPostId.value}`, {
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
    const response = await fetch(`${API_URL}/posts/${id}`, {
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
    const response = await fetch(`${API_URL}/posts/categories`, {
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create category');
    }
  } catch (err) {
    console.error('Error creating category:', err);
    error.value = err.message;
  }
}

function toggleNewCategoryInput() {
  showNewCategoryInput.value = !showNewCategoryInput.value;
  if (showNewCategoryInput.value) {
    setTimeout(() => {
      document.getElementById('new-category-input').focus();
    }, 100);
  }
}

// Watch for when selectedCategoryId changes to "new"
watch(() => selectedCategoryId.value, (newValue) => {
  if (newValue === 'new') {
    // Show the new category input field
    toggleNewCategoryInput();
    // Reset the dropdown value
    selectedCategoryId.value = null;
  }
});
</script>

<template>
  <div class="admin-view">
    <h1>Admin Dashboard</h1>
    
    <div v-if="loading" class="loading">
      Loading...
    </div>
    
    <div v-else-if="!isAuthenticated" class="login-form">
      <h2>Login Required</h2>
      <p>Please log in to access the admin dashboard.</p>
      
      <form @submit="login">
        <div class="form-group">
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required>
        </div>
        
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        
        <button type="submit" class="link-button primary">Login</button>
      </form>
    </div>
    
    <div v-else class="admin-dashboard">
      <div class="admin-header">
        <h2>Welcome to the Admin Dashboard</h2>
        <div class="user-info">
          <span class="username">{{ currentUser?.username }}</span>
          <span class="role-badge" :class="currentUser?.role">{{ currentUser?.role }}</span>
          <button @click="logout" class="link-button secondary">Logout</button>
        </div>
      </div>
      
      <div class="tabs">
        <button 
          @click="activeTab = 'posts'"
          :class="{ active: activeTab === 'posts' }"
          class="tab-button"
        >
          Manage Posts
        </button>
        
        <button 
          v-if="isAdmin()"
          @click="activeTab = 'users'"
          :class="{ active: activeTab === 'users' }"
          class="tab-button"
        >
          Manage Users
        </button>
        <button 
          v-if="isAdmin()"
          @click="activeTab = 'crud'"
          :class="{ active: activeTab === 'crud' }"
          class="tab-button"
        >
          Classic DB CRUD
        </button>
      </div>
      
      <div v-if="activeTab === 'posts'">
        <!-- Post Form -->
        <div id="post-form" class="post-form">
          <h3>{{ formMode === 'create' ? 'Create New Post' : 'Edit Post' }}</h3>
          
          <form @submit="submitPost">
            <div class="form-group">
              <label for="title">Title:</label>
              <input type="text" id="title" v-model="title" required>
            </div>
            
            <div class="form-group">
              <label for="content">Content:</label>
              <textarea id="content" v-model="content" rows="10" required></textarea>
            </div>
            
            <!-- Category selection -->
            <div class="form-group">
              <label for="category">Category:</label>
              <div class="category-input-container">
                <select id="category" v-model="selectedCategoryId" class="category-select" v-if="!showNewCategoryInput">
                  <option :value="null">-- Select a category --</option>
                  <option v-for="category in availableCategories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                  <option value="new" class="new-category-option">+ Create new category</option>
                </select>
                <div v-else class="new-category-input-group">
                  <input 
                    id="new-category-input"
                    type="text" 
                    v-model="newCategory" 
                    placeholder="Enter new category name" 
                    @keyup.enter="createCategory"
                    class="new-category-input"
                  >
                  <div class="new-category-buttons">
                    <button type="button" @click="createCategory" class="new-category-button create">Create</button>
                    <button type="button" @click="toggleNewCategoryInput" class="new-category-button cancel">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="files">Attachments:</label>
              <input type="file" id="files" multiple @change="handleFileChange">
              <small>Select multiple files if needed (5MB limit per file)</small>
            </div>
            
            <!-- Current Attachments (Edit Mode) -->
            <div v-if="formMode === 'edit' && attachments.length > 0" class="current-attachments">
              <h4>Current Attachments</h4>
              <div class="attachment-list">
                <div 
                  v-for="(attachment, index) in attachments" 
                  :key="index" 
                  class="attachment-item"
                  :class="{ 'marked-remove': attachmentsToRemove.includes(attachment) }"
                >
                  <span class="filename">{{ attachment }}</span>
                  <button 
                    type="button" 
                    @click="toggleAttachmentRemoval(attachment)"
                    class="toggle-remove"
                  >
                    {{ attachmentsToRemove.includes(attachment) ? 'Keep' : 'Remove' }}
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Tags -->
            <div class="form-group">
              <label>Tags:</label>
              <div class="tag-selector">
                <div class="selected-tags">
                  <div v-for="(tag, index) in selectedTags" :key="index" class="tag-pill">
                    {{ tag }}
                    <button type="button" @click="removeTag(tag)" class="remove-tag">&times;</button>
                  </div>
                </div>
                
                <div class="tag-input">
                  <input 
                    type="text" 
                    v-model="newTag" 
                    placeholder="Enter a tag"
                    @keyup.enter.prevent="addTag"
                  >
                  <button type="button" @click="addTag" class="add-tag">Add</button>
                </div>
                
                <div v-if="availableTags.length > 0" class="available-tags">
                  <div class="available-tags-title">Available Tags:</div>
                  <div class="tags-list">
                    <div 
                      v-for="tag in availableTags" 
                      :key="tag.id" 
                      class="tag-pill small"
                      @click="newTag = tag.name; addTag()"
                    >
                      {{ tag.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="link-button primary">
                {{ formMode === 'create' ? 'Create Post' : 'Update Post' }}
              </button>
              <button type="button" @click="resetForm" class="link-button secondary">Reset</button>
            </div>
          </form>
        </div>
        
        <!-- Posts List -->
        <div class="posts-list">
          <h3>Manage Posts</h3>
          
          <div v-if="posts.length === 0" class="no-posts">
            No posts available.
          </div>
          
          <div v-else class="posts-table-container">
            <table class="posts-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="post in posts" :key="post.id">
                  <td>{{ post.title }}</td>
                  <td>{{ post.author }}</td>
                  <td>
                    <div v-if="post.category_name" class="category-badge">
                      {{ post.category_name }}
                    </div>
                    <span v-else class="no-category">No category</span>
                  </td>
                  <td>
                    <div class="post-tags">
                      <span v-for="(tag, index) in post.tags?.filter(t => t !== null)" :key="index" class="tag-pill small">
                        {{ tag }}
                      </span>
                      <span v-if="!post.tags || post.tags.filter(t => t !== null).length === 0">
                        No tags
                      </span>
                    </div>
                  </td>
                  <td>{{ new Date(post.created_at).toLocaleDateString() }}</td>
                  <td class="actions">
                    <button @click="editPost(post)" class="action-button edit">Edit</button>
                    <button @click="deletePost(post.id)" class="action-button delete">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- User Management Tab (Admin only) -->
      <div v-else-if="activeTab === 'users' && isAdmin()">
        <UserManagement />
      </div>
      <div v-else-if="activeTab === 'crud' && isAdmin()">
        <AdminCrud />
      </div>
    </div>
  </div>
</template>

<style>
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  font-family: var(--heading-font-family);
  margin-bottom: 30px;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  margin: 50px 0;
}

.login-form {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border-radius: 8px;
  background-color: #f8f8f8;
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
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

.error-message {
  color: #f44336;
  margin: 10px 0;
}

.link-button {
  display: inline-block;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  text-decoration: none;
  font-weight: bold;
  cursor: pointer;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: 600;
}

.role-badge.admin {
  background-color: #ffd700;
  color: #333;
}

.role-badge.moderator {
  background-color: #20b2aa;
  color: white;
}

.role-badge.user {
  background-color: #e0e0e0;
  color: #333;
}

.post-form {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.form-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.current-attachments {
  margin: 15px 0;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.attachment-item.marked-remove {
  text-decoration: line-through;
  opacity: 0.7;
}

.toggle-remove {
  border: none;
  background: none;
  color: #f44336;
  cursor: pointer;
  font-weight: bold;
}

.tag-selector {
  margin-top: 10px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background-color: #e1f5fe;
  color: #0277bd;
  border-radius: 16px;
}

.tag-pill.small {
  font-size: 0.8rem;
  padding: 2px 8px;
}

.remove-tag {
  border: none;
  background: none;
  color: #f44336;
  margin-left: 5px;
  cursor: pointer;
  font-weight: bold;
}

.tag-input {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.tag-input input {
  flex: 1;
}

.add-tag {
  padding: 5px 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.available-tags {
  margin-top: 10px;
}

.available-tags-title {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 5px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tags-list .tag-pill {
  cursor: pointer;
}

.posts-table-container {
  overflow-x: auto;
}

.posts-table {
  width: 100%;
  border-collapse: collapse;
}

.posts-table th,
.posts-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.posts-table th {
  background-color: #f1f1f1;
  font-weight: bold;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.action-button {
  margin-right: 5px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-button.edit {
  background-color: #2196F3;
  color: white;
}

.action-button.delete {
  background-color: #f44336;
  color: white;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ccc;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.tab-button:hover {
  background-color: #f5f5f5;
}

.tab-button.active {
  border-bottom-color: #4CAF50;
  color: #4CAF50;
}

.category-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  background-color: white;
}

.category-badge {
  display: inline-block;
  padding: 3px 8px;
  background-color: var(--color-primary);
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
}

.no-category {
  color: #999;
  font-style: italic;
  font-size: 0.9rem;
}

.category-input-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.new-category-option {
  font-weight: bold;
  color: var(--color-primary);
}

.new-category-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.new-category-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

.new-category-buttons {
  display: flex;
  gap: 10px;
}

.new-category-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.new-category-button.create {
  background-color: var(--color-primary);
  color: white;
}

.new-category-button.cancel {
  background-color: #e0e0e0;
  color: #333;
}
</style>
