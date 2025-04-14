# summerproject-2025

HTML/CSS Summer Project 2025 #html #css #modern-web-design

## Usage

- Clone the repository
- Navigate to the `server` directory and follow the server README instructions.
- Navigate to the `client` directory and follow the client README instructions.

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

### Source directories

- `server` contains the backend code for the Express.js server.
- `client` contains the frontend code for the Vue.js application.

## Quick Links

- [Figma File](https://www.figma.com/design/hmDD1XXnwGYYxYCjo0U45Q/Summer-Project-2025)
- [Projektantrag](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/Projektantrag/) (GitHub Pages, lives at `docs/Projektantrag.md`)
- [Angabe](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/1JHG-MEDTWT_Sommerprojekt_2425.pdf)
- [Website home on webontour.eu](https://webontour.eu/)

## todos

### todo: review

- [X] Review home page
- [ ] Review blog page
- [ ] Review post page
- [ ] Review about page
- [ ] Add signup and login

- [ ] Review admin page
- [ ] Review setup page

### Do now

- structure admin panel
  - CRUD admin interface for posts and users
  - Classic CRUD admin interface for the whole database
  - user roles and permissions, user management
- Post CRUD, editor for role 'writer', 'admin'
- Posts can do more:
  - attachments
  - markdown support for posts
    - callout, emoji preview
- about page
- footer content: social links, legal documents, quicklinks
- responsive design
- blog view pagination
- dates
- comments
  - unread comments for admin
- post printing
- Dark mode
- arrow on home back up, not moving all the tiome
- More links
- login for users

#### some ai prompts

##### CRUD admin interface for posts

```plaintext
Implement a CRUD admin interface for the posts. Display all posts in a styled table with columns for every field, and Actions. Each row should include "Show", "Edit", and "Delete" buttons. Add a "+ New Post" button above the table. Fetch data from the REST API. Include pages or components for creating, editing, showing, and listing posts. Use Tailwind CSS for styling similar to RedwoodJS scaffolded UIs.
```

### Do later

- world clock
- weather
- category view - world map layout

## Pages

- home
  - RecentPosts
    - PostCard
  - Logo
  - LatestCategories
- blog
- post
- admin
- setup
- about
- sitemap
