<template>
  <div class="setup-view">
    <div class="loading-container">
      <p>Checking system status...</p>
    </div>
    
    <div class="error-container">
      <h2>Error</h2>
      <p>{{ error }}</p>
      <button @click="checkSetupStatus" class="link-button primary">Retry</button>
    </div>
    
    <div class="setup-container">
      <div class="success-message">
        <h2>Setup Complete!</h2>
        <p>Admin account has been created successfully.</p>
        <p>Redirecting to admin panel...</p>
      </div>
      
      <div class="setup-form-container">
        <h1>WEBonTour Blog Setup</h1>
        <p>Welcome to your new blog! You need to create an admin user to get started.</p>
        
        <form @submit="handleSetup" class="setup-form">
          <div class="form-group">
            <label for="username">Username:</label>
            <input 
              type="text" 
              id="username" 
              required
              placeholder="admin"
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              required
              placeholder="your@email.com"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input 
              type="password" 
              id="password" 
              required
              placeholder="Minimum 8 characters"
            >
          </div>
          
          <div class="form-group">
            <label for="confirm-password">Confirm Password:</label>
            <input 
              type="password" 
              id="confirm-password" 
              required
              placeholder="Re-enter your password"
            >
          </div>
          
          <div class="error-message">
            {{ setupError }}
          </div>
          
          <div class="form-actions">
            <button type="submit" class="link-button primary">Complete Setup</button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="already-setup">
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
