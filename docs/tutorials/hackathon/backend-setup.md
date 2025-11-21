---
title: Backend API Setup
---

<Info>
Set up the Superhero API repository for backend plugin development. This is only needed if you're building backend plugins that process blockchain transactions or contribute to the popular feed.
</Info>

## Clone Backend Repository

Clone the Superhero API repository:

```bash
git clone https://github.com/superhero-com/superhero-api.git
cd superhero-api
```

<Tip>
You'll also need the Superhero UI repository for frontend plugin development. Clone it with:
```bash
git clone https://github.com/superhero-com/superhero.git
```
</Tip>

## Install Dependencies

```bash
npm install
```

## Environment Configuration

Create `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```bash
# Database Configuration
DB_TYPE=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_DATABASE=superhero_api
DB_SYNC=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Network Configuration
AE_NETWORK_ID=ae_uat  # or ae_mainnet for mainnet

# Application Configuration
APP_PORT=3000
```

## Start Required Services

### Option 1: Docker Compose (Recommended)

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d postgres redis
```

### Option 2: Local Services

Ensure PostgreSQL and Redis are running locally:

- **PostgreSQL**: Version 16 or later
- **Redis**: Latest version

## Run Database Migrations

```bash
npm run migration:run
```

## Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Verify Setup

Check that the API is running:

```bash
curl http://localhost:3000/health
```

## Project Structure

Backend plugins are located in:

```
src/plugins/<your-plugin-id>/
├── <plugin-id>.plugin.ts          # Main plugin class (extends BasePlugin)
├── <plugin-id>-sync.service.ts     # Transaction sync service
├── <plugin-id>-popular-ranking.service.ts  # Popular feed contributor (optional)
├── entities/
│   └── <entity>.entity.ts         # Database entities
└── <plugin-id>.module.ts          # NestJS module
```

## Next Steps

- **[API Plugin Development](./api-plugin-development.md)** - Build your backend plugin
- **[Feed Plugins](./feed-plugins.md)** - Understand frontend-backend integration
- **[Hints & Tips](./hints.md)** - Troubleshooting and best practices

<Tip>
Make sure your database and Redis are running before starting the development server. Check logs if you encounter connection errors.
</Tip>

