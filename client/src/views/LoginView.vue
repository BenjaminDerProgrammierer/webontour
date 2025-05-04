<script setup>
// TODO: Signup, Login and Setup functionality
import { ref, onMounted } from 'vue';
import router from '../router';

const isLogin = ref(router.currentRoute.value.path === '/login');
const user = ref('');
const email = ref('');
const password = ref('');
const loginError = ref('');
const signupKey = ref('');
const signupError = ref('');
const needsSetup = ref(false);

onMounted(async () => {
  await checkSetupStatus();
});

// Check if the app needs setup
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
      
    //   if (needsSetup.value) {
    //     router.replace('/setup');
    //   }
    } else {
      error.value = 'Could not check setup status';
    }
  } catch (err) {
    console.error('Error checking setup status:', err);
    error.value = 'Failed to connect to the server';
  }
}

// Try to login the user
async function login(event) {
  event.preventDefault();
  const username = event.target.username.value;
  const password = event.target.password.value;
  
  try {
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      router.push('/admin');
    } else {
      const data = await response.json();
      loginError.value = data.message || 'Login failed';
    }
  } catch (err) {
    console.error('Login error:', err);
    loginError.value = 'Login failed. Please try again.';
  }
}

function signup(event) {
    event.preventDefault();
    signupError.value = "Signup is not available yet";
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
    <div class="login-container">
        <div class="form-container">
            <div v-if="isLogin" class="login-form">
                <h2>Login</h2>
                <form @submit="login">
                    <div>
                        <label for="username">User name:</label>
                        <input type="text" id="username" name="username" required v-model="user">
                    </div>
                    <div>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required v-model="password">
                    </div>
                    <div v-if="loginError" class="error-message">{{ loginError }}</div>
                    <button type="submit">Login</button>
                </form>
                <p class="next-notice">Don't have an account? <span @click="router.push('/signup'); isLogin = false">Sign up</span></p>
            </div>

            <div v-else-if="needsSetup" class="setup-form">
                <h2>Setup</h2>
                <p>Welcome to your new blog! You need to create an admin user to get started.</p>
                <form @submit.prevent="handleSetup">
                    <div>
                        <label for="username">User name:</label>
                        <input type="text" id="username" name="username" v-model="user" required>
                    </div>
                    <div>
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" v-model="email" required>
                    </div>
                    <div>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" v-model="password" required>
                    </div>
                    <button type="submit">Create Admin</button>
                </form>
            </div>

            <div v-else class="signup-form">
                <h2>Sign Up</h2>
                <form @submit="signup">
                    <div>
                        <label for="key">Sign Up key:</label>
                        <input type="text" id="key" name="key" v-model="signupKey" required>
                    </div>
                    <div>
                        <label for="username">User name:</label>
                        <input type="text" id="username" name="username" v-model="user" required>
                    </div>
                    <div>
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email" v-model="email" required>
                    </div>
                    <div>
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" v-model="password" required>
                    </div>
                    <div v-if="signupError" class="error-message">{{ signupError }}</div>
                    <button type="submit">Sign Up</button>
                </form>
                <p class="next-notice">Already have an account? <span @click="router.push('/login'); isLogin = true">Login</span></p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background-color: #f0f0f0;
    z-index: 0;

    &::before {
        content: '';
        position: absolute;
        background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
        width: 500px;
        height: 500px;
        border-radius: 50%;
        z-index: 1;
        animation: steam 5s linear infinite;
        filter: blur(500px) opacity(0.4);
    }

}

.form-container {
    background-color: white;
    padding: 5px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    width: 300px;
    z-index: 1;
    overflow: hidden;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        left: -50%;
        top: -50%;
        background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
        width: 200%;
        height: 200%;
        z-index: -5;
        animation: steam 5s linear infinite;
    }
}

.login-form,
.signup-form,
.setup-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #000;
    border-radius: 10px;
    padding: 20px;
    color: #f0f0f0;

    h2 {
        font-family: var(--heading-font-family);
        color: var(--color-secondary);
        margin-bottom: 5px;
    }

    form {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        width: 100%;

        div {
            margin-bottom: 15px;

            label {
                display: block;
                margin-bottom: 5px;
            }

            input {
                width: 100%;
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #ccc;
            }
        }

        button {
            padding: 10px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;

            &:hover {
                background-color: #0056b3;
            }
        }
    }

    .next-notice {
        margin-top: 15px;

        span {
            color: #007bff;
            cursor: pointer;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    .error-message {
        color: red;
        text-align: center;
        font-size: 0.9rem;
    }
}

@keyframes steam {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>