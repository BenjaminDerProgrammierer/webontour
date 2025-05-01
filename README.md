# summerproject-2025

HTML/CSS Summer Project 2025 #html #css #modern-web-design

## Usage

- Clone the repository
- Run `[sudo] sudo docker compose -f docker-compose.dev.yml up` to start the development server.
- Use `[sudo] sudo docker compose up -d` instead to start the server in detached mode.

## Changelog

### Project Sprint 1

- Project proposal (Projektantrag) and project description (Angabe) are available in the `docs` directory.

### Project Sprint 2

- I decided to use Vue.js for the frontend. Then I built the home page with HTML/CSS and mock posts.

### Project Sprint 3a

- I noticed that I need a backend for the project, so I decided to use Express.js for the backend.
- I built a REST API with Express.js and PostgreSQL for the backend. AI helped me a lot with that. I also used AI to build the frontend for the database (for now). I'll redo the frontend later myself.
- I made the `BlogView` and `PostView` pages.

### Project Sprint 3b

- I dockerized the whole application (3 hrs 12 mins).
- I added a CI/CD pipeline (3 hrs 29 mins).
  - Github Actions builds the frontend and backend and pushes the images to Docker Hub.
  - Docker Hub triggers a webhook to the server.
  - The server pulls the new images and restarts the containers. (`updater` container)
  - The server is available behind a reverse proxy (nginx) with SSL.
  - Cookies work now (20 mins)

## Quick Links

- [Figma File](https://www.figma.com/design/hmDD1XXnwGYYxYCjo0U45Q/Summer-Project-2025)
- [Projektantrag](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/Projektantrag/) (GitHub Pages, lives at `docs/Projektantrag.md`)
- [Angabe](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/1JHG-MEDTWT_Sommerprojekt_2425.pdf)
- [Website home on webontour.eu](https://webontour.eu/)

## Pages

- home
  - RecentPosts
    - PostCard
  - Logo
  - LatestCategories
  - ErrorBox
- blog
  - Logo
  - ErrorBox
- post
  - MarkdownRenderer
  - ErrorBox
- admin
- setup
- about
- sitemap

## todos

### review

- [X] Review home page
- [X] Review blog page
- [X] Review post page
- [ ] Review about page
- [ ] Add signup and login

#### Less important

- [ ] Review admin page
- [ ] Review setup page

### ToDos to do now

- structure admin panel
  - CRUD admin interface for posts and users
  - Classic CRUD admin interface for the whole database
  - user roles and permissions, user management
- Post CRUD, editor for role 'writer', 'admin'
- about page
- footer content: social links, legal documents, quicklinks
- responsive design
- dates
- comments
  - unread comments page for admin
- post printing
- Dark mode
- arrow on home back up, not moving all the tiome
- More links
- login for users

### ToDos to do later

- world clock
- weather
- category view - world map layout
- Redis session storage

## CRUD admin interface for posts prompt

```plaintext
Implement a CRUD admin interface for the posts. Display all posts in a styled table with columns for every field, and Actions. Each row should include "Show", "Edit", and "Delete" buttons. Add a "+ New Post" button above the table. Fetch data from the REST API. Include pages or components for creating, editing, showing, and listing posts. Use Tailwind CSS for styling similar to RedwoodJS scaffolded UIs.
```

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `VITE_API_URL` | The base URL for the API. This is used to make requests to the backend server. |
| `DB_USER` | database user (Default: `admin`) |
| `DB_PASSWORD` | database password (Default: `your_secure_password_here`) |
| `DB_HOST` | database host (Default: `localhost`) |
| `DB_NAME` | database name (Default: `summerproject`) |
| `DB_PORT` | database port (Default: `5432`) |
| `WEBHOOK_SECRET` | secret for the webhook |
| `DOCKER_SOCKET_PATH` | path to the Docker socket (Default: `/var/run/docker.sock`) |
