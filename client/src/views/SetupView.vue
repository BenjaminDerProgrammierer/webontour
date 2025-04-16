<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(true);
const error = ref(null);
const needsSetup = ref(false);

const username = ref('admin');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const setupError = ref(null);
const setupSuccess = ref(false);

onMounted(async () => {
  await checkSetupStatus();
});

async function checkSetupStatus() {
  try {
    const response = await fetch(`/api/setup/status`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      needsSetup.value = data.needsSetup;
      
      if (!needsSetup.value) {
        // Setup is already completed, redirect to login
        router.replace('/admin');
      }
    } else {
      error.value = 'Could not check setup status';
    }
  } catch (err) {
    console.error('Error checking setup status:', err);
    error.value = 'Failed to connect to the server';
  } finally {
    loading.value = false;
  }
}

async function handleSetup(event) {
  event.preventDefault();
  setupError.value = null;
  
  // Basic validation
  if (!username.value || !email.value || !password.value) {
    setupError.value = 'All fields are required';
    return;
  }
  
  if (password.value !== confirmPassword.value) {
    setupError.value = 'Passwords do not match';
    return;
  }
  
  if (password.value.length < 8) {
    setupError.value = 'Password must be at least 8 characters long';
    return;
  }
  
  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    setupError.value = 'Please enter a valid email address';
    return;
  }
  
  try {
    const response = await fetch(`/api/setup/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    });
    
    if (response.ok) {
      setupSuccess.value = true;
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } else {
      const data = await response.json();
      setupError.value = data.message || 'Failed to create admin user';
    }
  } catch (err) {
    console.error('Error during setup:', err);
    setupError.value = 'Connection error';
  }
}
</script>

<template>
  <div class="setup-view">
    <div v-if="loading" class="loading-container">
      <p>Checking system status...</p>
    </div>
    
    <div v-else-if="error" class="error-container">
      <h2>Error</h2>
      <p>{{ error }}</p>
      <button @click="checkSetupStatus" class="link-button primary">Retry</button>
    </div>
    
    <div v-else-if="needsSetup" class="setup-container">
      <div v-if="setupSuccess" class="success-message">
        <h2>Setup Complete!</h2>
        <p>Admin account has been created successfully.</p>
        <p>Redirecting to admin panel...</p>
      </div>
      
      <div v-else class="setup-form-container">
        <h1>WEBonTour Blog Setup</h1>
        <p>Welcome to your new blog! You need to create an admin user to get started.</p>
        
        <form @submit="handleSetup" class="setup-form">
          <div class="form-group">
            <label for="username">Username:</label>
            <input 
              type="text" 
              id="username" 
              v-model="username" 
              required
              placeholder="admin"
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              required
              placeholder="your@email.com"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              required
              placeholder="Minimum 8 characters"
            >
          </div>
          
          <div class="form-group">
            <label for="confirm-password">Confirm Password:</label>
            <input 
              type="password" 
              id="confirm-password" 
              v-model="confirmPassword" 
              required
              placeholder="Re-enter your password"
            >
          </div>
          
          <div v-if="setupError" class="error-message">
            {{ setupError }}
          </div>
          
          <div class="form-actions">
            <button type="submit" class="link-button primary">Complete Setup</button>
          </div>
        </form>
      </div>
    </div>
    
    <div v-else class="already-setup">
      <h2>System is already set up</h2>
      <p>The blog has already been configured.</p>
      <router-link to="/admin" class="link-button primary">Go to Admin Panel</router-link>
    </div>
  </div>
</template>

<style>
.setup-view {
  max-width: 600px;
  margin: 40px auto;
  padding: 30px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.setup-view h1 {
  font-family: var(--heading-font-family);
  margin-bottom: 20px;
  text-align: center;
  color: var(--color-accent);
}

.setup-form-container p {
  margin-bottom: 20px;
  text-align: center;
  font-family: var(--body-font-family);
  color: #555;
}

.setup-form {
  margin-top: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-family: var(--heading-font-family);
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: var(--body-font-family);
  font-size: 1rem;
}

.form-group input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(10, 0, 52, 0.1);
}

.error-message {
  background-color: #fee;
  color: #c00;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-family: var(--body-font-family);
}

.form-actions {
  display: flex;
  justify-content: center;
}

.form-actions button {
  padding: 12px 30px;
  font-size: 1.1rem;
}

.success-message {
  text-align: center;
  padding: 20px;
}

.success-message h2 {
  color: var(--color-primary);
  margin-bottom: 15px;
}

.loading-container, .error-container, .already-setup {
  text-align: center;
  padding: 30px 0;
}

.error-container h2 {
  color: #c00;
  margin-bottom: 15px;
}

.error-container button {
  margin-top: 15px;
}
</style>
