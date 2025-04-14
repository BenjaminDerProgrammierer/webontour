# Summerproject 2025 Server

## Usage

### Installation

- Run `npm install` to install dependencies
- Configure your environment variables (See [Environment Variables](#environment-variables)) in the `db/.env` file. Use the `db/.env.example` file as a reference.
- Initialize the database with `npm run init-db`
- Start the server with `npm start` or `npm run dev` for development mode (hot reloading)

### Environment Variables

- `DB_USER`: database user (Default: `admin`)
- `DB_PASSWORD`: database password (Default: `your_secure_password_here`)
- `DB_HOST`: database host (Default: `localhost`)
- `DB_NAME`: database name (Default: `summerproject`)
- `DB_PORT`: database port (Default: `5432`)
