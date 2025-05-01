<script setup>
import RecentPosts from '../components/RecentPosts.vue';
import Logo from '../components/Logo.vue';
import LatestCategories from '../components/LatestCategories.vue';
import { ref, onMounted } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';

let apiError = ref(null);

onMounted(async () => {
    try {
        const response = await fetch(`/api/health`);
        const data = await response.json();
        if (!data.status === "UP") {
            throw new Error("Server reported down state")
        }
    } catch (error) {
        console.error('Error connecting to server:', error);
        apiError.value = error;
    }
});
</script>

<template>
    <Logo />
    <section id="hero">
        <div class="magicpattern"></div>
        <h1>Welcome to WEBonTour</h1>
        <p>Here you can follow our journeys around the globe. From Austria to Australia, here you can read our stories!</p>
        <div class="buttons">
            <router-link to="/blog" class="link-button primary">View Blog Posts</router-link>
            <router-link to="/about" class="link-button secondary bordered">More about us</router-link>
        </div>
        <div id="down-arrow">
            <img :src="`assets/icons/MaterialSymbolsArrowDownward.svg`" alt="Down">
        </div>
    </section>

    <section id="recent">
        <h2 v-if="!apiError">Recent Posts</h2>

        <ErrorBox v-if="apiError" title="Error" message="Unable to connect to the backend server. Is it on?" />

        <div v-if="!apiError">
            <RecentPosts />

            <div class="sidebar">
                <h3>Latest Destinations</h3>
                <LatestCategories />
                <router-link to="/blog" class="link-button primary">View All Blog Posts</router-link>
            </div>
        </div>
    </section>

    <footer>
        <div class="footer-item">
            <h3>Social Media</h3>
            <div class="social-media">
                <a href="#"><img :src="`assets/icons/fa6-brands/square-facebook.svg`" alt="Facebook"></a>
                <a href="#"><img :src="`assets/icons/fa6-brands/x-twitter.svg`" alt="Twitter / X"></a>
                <a href="#"><img :src="`assets/icons/fa6-brands/instagram.svg`" alt="Instagram"></a>
            </div>
        </div>
        <div class="footer-item">
            <h3>Contact Us</h3>
            <p>For inquiries, email us at <a href="mailto:info@webontour.eu">info@webontour.eu</a></p>
            <p>This is v0-alpha-0.0.1</p>
        </div>
        <div class="footer-item">
            <h3>Quick Links</h3>
            <ul class="footer-links">
                <li><router-link to="/admin">Admin Dashboard</router-link></li>
                <li><a href="/legal?srcMd=%2Fcontent%2Fterms.md">Terms of Service</a></li>
                <li><a href="/legal?srcMd=%2Fcontent%2Fprivacy.md">Privacy Policy</a></li>
            </ul>
        </div>
    </footer>
</template>

<style scoped>
section {
    width: 100vw;
}

/* Hero section */
section#hero {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    background-color: #d9d9d9;
    padding: 5%;
    height: calc(100vh - 50px);
    background-image: url('/assets/images/magicpattern.png');
    background-size: cover;
    background-position: center;
    background-blend-mode: overlay;

    h1 {
        font-size: 48px;
        font-family: var(--heading-font-family);
        font-weight: 700;
        margin-bottom: 20px;
        text-align: center;
    }

    p {
        font-size: 24px;
        font-family: var(--body-font-family);
        margin-bottom: 15px;
        text-align: center;
        max-width: 600px;
    }

    .buttons {
        display: flex;
        gap: 20px;
        margin-top: 20px;
    }
}

/* Recent section */
section#recent {
    width: 100%;
    padding: 75px 10%;
    background-color: var(--color-accent);

    &>div {
        display: grid;
        grid-template-columns: 2fr 1fr;
    }

    /* with API connection error */
    &:has(.error)>div {
        display: block;
    }

    h2 {
        font-size: 36px;
        font-family: var(--heading-font-family);
        color: white;
        margin-bottom: 20px;
        font-weight: 500;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: white;
        margin-left: 20px;
        padding: 0 20px;

        h3 {
            text-align: center;
            font-size: 25px;
            font-family: var(--heading-font-family);
        }

        .link-button {
            display: inline-block;
            width: fit-content;
            margin: 0 auto;
        }
    }
}

/* Footer */
footer {
    background-color: #1e1e1e;
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-around;
    align-items: center;
}

footer .footer-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: center;
    margin-bottom: 10px;
}

footer .footer-item h3 {
    font-size: 24px;
    font-family: var(--heading-font-family);
}

footer .footer-item a {
    color: white;
    font-family: var(--body-font-family);
    transition: color 0.1s ease;
}

footer .footer-item a:hover {
    color: var(--color-primary);
}

footer .footer-item p {
    font-family: var(--body-font-family);
}

footer .footer-item .social-media {
    display: flex;
    gap: 20px;
}

footer .footer-item .social-media img {
    /* #ffffff https://codepen.io/sosuke/pen/Pjoqqp */
    filter: invert(99%) sepia(49%) saturate(2%) hue-rotate(114deg) brightness(113%) contrast(100%);
    transition: filter 0.3s ease;
}

footer .footer-item .social-media img:hover {
    /* primary color #1dd31d */
    filter: invert(74%) sepia(74%) saturate(3794%) hue-rotate(74deg) brightness(97%) contrast(101%);
}

footer .footer-item ul.footer-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    list-style: none;
}

footer .footer-item ul.footer-links a {
    text-decoration: none;
    color: white;
    font-family: var(--body-font-family);
    transition: color 0.1s ease;
}

footer .footer-item ul.footer-links a:hover {
    color: var(--color-primary);
}

/* Down arrow */
#down-arrow {
    position: absolute;
    bottom: 20px;
    left: 0;
    width: 100vw;
    display: flex;
    justify-content: center;
}

#down-arrow img {
    background-color: transparent;
    filter: invert(50%) sepia(0%) saturate(25%) hue-rotate(144deg) brightness(93%) contrast(82%);
    width: 64px;
    height: 64px;
    border: 2px solid black;
    border-radius: 50%;
    animation: bounce 1s infinite;
}

@keyframes bounce {
    0% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-10px);
    }

    100% {
        transform: translateY(0);
    }
}

/* Responsive design */
@media screen and (max-width: 1200px) {
    section#recent {
        &>div {
            display: block;
        }

        .sidebar {
            margin-left: 0;
            width: 100%;
            padding: 0;

            h3 {
                margin-top: 20px;
                text-align: center;
            }

            ul {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                flex-direction: row;
                align-items: center;
                justify-content: space-evenly;
            }

            ul li {
                margin: 5px 0;
            }

            ul * {
                text-align: center;
            }
        }

    }
}

@media screen and (max-width: 798px) {
    .flip-container {
        width: 100%;
    }

    footer {
        flex-direction: column;
        align-items: center;
    }

    section#recent {
        &:has(.error) {
            padding: 0;

            .error {
                width: 100%;
                max-width: 100%;
                padding: 20px 10px;
                border-radius: 0;
                margin: 0;
                border-top: 1px solid #e74c3c;
            }
        }
    }

}
</style>
