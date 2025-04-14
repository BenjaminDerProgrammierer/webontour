# summerproject-2025

HTML/CSS Summer Project 2025 #html #css #modern-web-design

## Usage

- Clone the repository
- Install dependencies for the backend and frontend with `npm install` in both `server` and `client` directories.
- Create the PostgreSQL database. In `server/db`, copy `.env.example` to `.env`, update the data and use `docker compose up -d`  to start the database in a Docker container. Create the schema with `npm run init-db` in the `server` directory. This runs `server/db/init-db.js` to create the database schema based on the `init.sql` file.
- Start the backend server with `npm start` in the `server` directory. This runs `server/src/main.js`.
- Start the frontend server with `npm run serve` in the `client` directory. This runs vite.

## Changelog

### Project Sprint 1

- Project proposal (Projektantrag) and project description (Angabe) are available in the `docs` directory.

### Project Sprint 2

- I decided to use Vue.js for the frontend. Then I built the home page with HTML/CSS and mock posts.

### Project Sprint 3a

- I noticed that I need a backend for the project, so I decided to use Express.js for the backend.
- I built a REST API with Express.js and PostgreSQL for the backend. AI helped me a lot with that. I also used AI to build the frontend for the database (for now). I'll redo the frontend later myself.

## Directory Structure

### GitHub pages / docs related

#### .github/workflows/gh-pages-docs.yml

GitHub Actions workflow for deploying the documentation to GitHub Pages. It builds the documentation and deploys it on GitHub Pages.

#### build-docs.sh

Shell script to build the documentation. It uses `pandoc` to convert Markdown files to HTML for GitHub Pages.

#### docs/

This directory contains the documentation files for the project.

### .gitignore, LICENCE, README.md

Standard files for a GitHub repository. `.gitignore` specifies files and directories that should be ignored by Git, `LICENCE` contains the project's license information, and `README.md` provides an overview of the project.

### source directories

- `server` contains the backend code for the Express.js server.
- `client` contains the frontend code for the Vue.js application.

## Quick Links

- [Figma File](https://www.figma.com/design/hmDD1XXnwGYYxYCjo0U45Q/Summer-Project-2025)
- [Projektantrag](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/Projektantrag/) (GitHub Pages, lives at `docs/Projektantrag.md`)
- [Angabe](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/1JHG-MEDTWT_Sommerprojekt_2425.pdf)
- [Website home on webontour.eu](https://webontour.eu/)

## todos

### Do later

- structure admin panel
  - CRUD admin interface for posts
  - CRUD admin interface for users
  - unread comments for admin
- Posts can do more:
  - attachments
  - markdown support for posts
    - callout, emoji preview
- about page
- social links, legal documents
- quicklinks
- responsive
- blog view pagination
- category view - world map layout
- dates
- user roles and permissions, user management
- comments
- post printing
- Dark mode
- arrow on home back up, not moving all the tiome

```plaintext
Implement a CRUD admin interface for the posts. Display all posts in a styled table with columns for every field, and Actions. Each row should include "Show", "Edit", and "Delete" buttons. Add a "+ New Post" button above the table. Fetch data from the REST API. Include pages or components for creating, editing, showing, and listing posts. Use Tailwind CSS for styling similar to RedwoodJS scaffolded UIs.
```

### Do after later

- world clock, weather

### Do _NOW_

- links around

## Pages:

- Home
  - RecentPosts
    - PostCard
  - Logo
  - LatestCategories
