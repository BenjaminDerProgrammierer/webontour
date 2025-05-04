import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue')
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('./views/BlogView.vue')
    },
    {
      path: '/post/:id',
      name: 'post',
      component: () => import('./views/PostView.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('./views/AdminView.vue')
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('./views/SetupView.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('./views/AboutView.vue')
    },
    {
      path: '/sites',
      name: 'sitemap',
      component: () => import('./views/SiteMapView.vue')
    },
    {
      path: '/document',
      name: 'document',
      component: () => import('./views/DocumentView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue')
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('./views/LoginView.vue')
    }
  ]
});

export default router;
