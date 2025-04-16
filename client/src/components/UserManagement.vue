<script setup>
import { ref, onMounted } from 'vue';

const users = ref([]);
const roles = ref([]);
const loading = ref(true);
const error = ref(null);
const successMessage = ref('');

// User being edited
const editingUserId = ref(null);
const selectedRoleId = ref(null);


onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles()]);
  loading.value = false;
});

async function fetchUsers() {
  try {
    const response = await fetch(`/api/posts/admin/users`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      users.value = await response.json();
    } else {
      throw new Error('Failed to fetch users');
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    error.value = err.message;
  }
}

async function fetchRoles() {
  try {
    const response = await fetch(`/api/auth/roles`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      roles.value = await response.json();
    } else {
      throw new Error('Failed to fetch roles');
    }
  } catch (err) {
    console.error('Error fetching roles:', err);
    error.value = err.message;
  }
}

function startEditRole(user) {
  editingUserId.value = user.id;
  // Find role id from role name
  const roleObj = roles.value.find(r => r.name === user.role);
  selectedRoleId.value = roleObj ? roleObj.id : null;
}

function cancelEditRole() {
  editingUserId.value = null;
  selectedRoleId.value = null;
}

async function updateUserRole(userId) {
  if (!selectedRoleId.value) {
    error.value = 'Please select a role';
    return;
  }
  
  try {
    const response = await fetch(`/api/auth/user/${userId}/role`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roleId: selectedRoleId.value })
    });
    
    if (response.ok) {
      successMessage.value = 'User role updated successfully';
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
      
      await fetchUsers();
      editingUserId.value = null;
    } else {
      const data = await response.json();
      throw new Error(data.message || 'Failed to update user role');
    }
  } catch (err) {
    console.error('Error updating user role:', err);
    error.value = err.message;
  }
}
</script>

<template>
  <div class="user-management">
    <h3>User Management</h3>
    
    <div v-if="loading" class="loading">
      Loading users...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
      <button @click="fetchUsers" class="link-button secondary small">Retry</button>
    </div>
    
    <div v-else-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <div v-if="users.length === 0" class="no-users">
      No users found.
    </div>
    
    <div v-else class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>
              <div v-if="editingUserId === user.id" class="role-selector">
                <select v-model="selectedRoleId">
                  <option v-for="role in roles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
              </div>
              <div v-else class="role-badge" :class="user.role">
                {{ user.role }}
              </div>
            </td>
            <td>{{ new Date(user.created_at).toLocaleDateString() }}</td>
            <td class="actions">
              <div v-if="editingUserId === user.id">
                <button @click="updateUserRole(user.id)" class="action-button save">Save</button>
                <button @click="cancelEditRole" class="action-button cancel">Cancel</button>
              </div>
              <div v-else>
                <button @click="startEditRole(user)" class="action-button edit">Change Role</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.user-management {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background-color: #f1f1f1;
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

.role-selector select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.action-button {
  margin: 0 5px;
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.action-button.edit {
  background-color: #4CAF50;
  color: white;
}

.action-button.save {
  background-color: #2196F3;
  color: white;
}

.action-button.cancel {
  background-color: #f44336;
  color: white;
}

.error-message {
  color: #f44336;
  margin: 10px 0;
}

.success-message {
  color: #4CAF50;
  margin: 10px 0;
}

.loading, .no-users {
  margin: 20px 0;
  text-align: center;
  color: #666;
}

.link-button.small {
  padding: 3px 8px;
  font-size: 0.85rem;
  margin-left: 10px;
}
</style>