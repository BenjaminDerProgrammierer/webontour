# summerproject-2025

HTML/CSS Summer Project 2025 #html #css #modern-web-design

## Usage

- Clone the repository
- Run `docker compose -f docker-compose.dev.yml up` to start the development server.
- Use `docker compose up -d` instead to start the production server.

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
- I added a document viewer for markdown files and legal documents (1 hr 3 mins)
- I Added better backgrounds (0 hrs 27 mins)
- I added a Slideshow (About page) (0 hrs 21 mins)
- I made the `LoginView` page (will replace the old signup/admin-embedded login pages) (1 hrs 4 mins)

### Project Sprint 4

- I optimized the API (And updated the frontend to use the now API) (2 hrs 5 mins)
- I added a Swagger UI page for the API (0 hrs 56 mins)
- I added User Management and made the new login page replace the old pages (3 hrs 17 mins
)
- I added a new admin page (0 hrs 56 mins)

## Quick Links

- [Figma File](https://www.figma.com/design/hmDD1XXnwGYYxYCjo0U45Q/Summer-Project-2025)
- [Projektantrag](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/Projektantrag/) (GitHub Pages, lives at `docs/Projektantrag.md`)
- [Angabe](https://benjaminderprogrammierer.github.io/summerproject-2025/docs/1JHG-MEDTWT_Sommerprojekt_2425.pdf)
- [Website home on webontour.eu](https://webontour.eu/)
- [GitHub](https://github.com/BenjaminDerProgrammierer/summerproject-2025)

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
  - Advanced admin CRUD (whole DB)
  - [X] user roles and permissions, user management
- Post CRUD, editor for role 'writer', 'admin'
- about page
- [X] footer content: social links, legal documents, quicklinks
- dates
- comments
  - unread comments page for admin
- post printing
- arrow on home back up, not moving all the time
- login for users
- flex-grow for any element
- Fix admin colors
- popup for image gallery
- handle no posts at hope page
- fix admin ui
- user no admin ui
- do not save plaintext passwords in the database
- attachment deletion
- tag naming on admin panel

### Tasks

- [X] ein HTML Formular inkl. komplettem, passendem CSS-Design
- [X] 1 CSS Animationen
- [X] 1 CSS Transition
- [X] 1 Einsatz von CSS Transform Parametern (scale, rotate, translate, ...)
- [X] eine HTML Tabelle inkl. komplettem, passendem CSS-Design
- [X] 1 CSS Gridsystem
- [X] die kreative Positionierung von 2 freien Elementen mittels position (absolute/relative)
- [X] Navigation mit KOMPLETT FUNKTIONIERENDEN Links (keine Umlaute!!!)
- [X] Footer mit mehrspaltigem Layout umsetzen (-> z. B. Inspiration HTL Homepage)
- [X] ansprechende CSS-Hintergründe auf ALLEN (!) Seiten
- [X] Integration einer Bildergalerie ODER Bilderslideshow
- [X] die GESAMTE Seite muss VOLLSTÄNDIG responsive umgesetzt werden (Startseite + Unterseiten)
- ALLGEMEIN - ABWECHSLUNG! - Nicht jede Unterseite sieht genau gleich aus!

### ToDos to do later

- world clock
- weather
- category view - world map layout
- Redis session storage
- Dark mode

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

## Architecture / Execution overview

### Client

- Image name: `benjaminderprogrammierer/webontour-client` (`dev` and `latest` tags)
- Container name: `webontour-client` (or `-dev` for developemnt)
- Connected with DB and Server in a network
- Depends on a healthy backend
- Build files are in `client/Dockerfile{.prod,.dev}`
- `CLIENT_PORT` is passed through to the host
- `NODE_ENV` is set, `PORT` is set to `CLIENT_PORT` and `VITE_API_URL` is set to the backend server.
- In development, the `client` directory without the node modules is mapped to the app directory of the docker container.
- Using the dev and start scripts for development and production, respectivly
- The development server is a hot reloading vite instance, we use vite to build, and nginx to serve the application (and proxy the backend)

### Server