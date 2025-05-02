<!-- A grid of Posts to showcase recent activity - For use on the Home page. -->
<script setup>
import PostCard from './PostCard.vue';
import { ref, onMounted } from 'vue';

const posts = ref([]);
const loading = ref(true);
const error = ref(null);


onMounted(async () => {
    await fetchRecentPosts();
});

async function fetchRecentPosts() {
    try {
        const response = await fetch(`/api/posts`);

        if (response.ok) {
            const allPosts = await response.json();
            // Get only the 5 most recent posts
            posts.value = allPosts.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            ).slice(0, 6);
        } else {
            throw new Error('Failed to fetch posts');
        }
    } catch (err) {
        console.error('Error fetching recent posts:', err);

        error.value = err.message + `/api/posts`;

    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div id="recent-post-list">
        <div v-if="loading" class="loading">
            Loading posts...
        </div>

        <div v-else-if="error" class="error">
            <h2>Error</h2>
            <p>{{ error }}</p>
        </div>

        <div v-else-if="posts.length === 0" class="no-posts">
            <p>No posts available yet.</p>
        </div>

        <template v-else>
            <PostCard v-for="post in posts" :key="post.id" :post="post" />
        </template>
    </div>
</template>

<style scoped>
#recent-post-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.loading,
.error,
.no-posts {
    text-align: center;
    padding: 20px;
    width: 80%;
    margin: 0 auto;
    border-radius: 10px;
}

.no-posts {
    background-color: #f8f8f8;
}

.error {
    background-color: #c05050;
}

@media (min-width: 800px) {
    #recent-post-list {
        flex-direction: row;
        flex-wrap: wrap;
    }
}
</style>
