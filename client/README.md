# Summerproject 2025 Server

## Usage

### Quick Start

- Clone the repository
- Navigate to the `client` directory
- Follow the [Installation instructions](#installation) instructions below.
- Run `npm run dev` to start the development server
- Open your browser and navigate to `http://localhost:5173` to view the application

### Installation

- Run `npm install` to install dependencies
- Configure your environment variables (See [Environment Variables](#environment-variables)) in the `.env` file. Use the `.env.example` file as a reference.

### Starting the Development Server

- Run `npm run dev` to start the development server

### Production Build

- Run `npm run build` to build the project for production
- Run `npm run serve` to preview the production build
- The production build will be created in the `dist` folder

### Environment Variables

- `VITE_API_PROXY`: URL of the API server (default: `http://localhost:3000`)
