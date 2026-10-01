# Dockhand Docker Management Setup

[Dockhand](https://dockhand.pro/) is a modern, lightweight, self-hosted Docker and Docker Compose management dashboard (a fast alternative to Portainer).

## Features
- **Container Lifecycle**: Start, stop, restart, inspect, and remove containers (`trophy_db`, `trophy_backend`, `trophy_storefront`, `trophy_admin`, `trophy_gateway`).
- **Compose Stacks**: Manage and deploy Docker Compose stacks with visual or YAML editors and GitOps.
- **Live Logs & Terminal**: Stream container logs in real time and open an in-browser shell/terminal.
- **Monitoring**: Live CPU, memory, and network statistics.
- **Security & Privacy**: Self-hosted, runs locally without cloud dependencies.

---

## Prerequisites
Ensure Docker is installed and running:
- **macOS**: Open **Docker Desktop** (`open -a Docker`).

---

## How to Run Dockhand

### Option 1: Standalone via pnpm script (Recommended)
Run Dockhand independently of whether the Trophy app stack is running:
```bash
# Start Dockhand
pnpm dockhand

# Stop Dockhand
pnpm dockhand:down
```

### Option 2: Run with Main Stack via Compose Profile
Dockhand is integrated into `docker-compose.yml` under the `dockhand` and `tools` profiles:
```bash
# Start Trophy stack + Dockhand
docker compose --profile dockhand up -d

# Or with all tools
docker compose --profile tools up -d
```

### Option 3: Direct Docker Run
```bash
docker run -d \
  --name trophy_dockhand \
  --restart unless-stopped \
  -p 3001:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dockhand_data:/app/data \
  fnsys/dockhand:latest
```

---

## Accessing Dockhand
1. Open your browser and navigate to:
   **[http://localhost:3001](http://localhost:3001)**
   *(Default port is `3001` to avoid conflicting with storefront on port 3000. Configure `DOCKHAND_PORT` in `.env` if desired).*
2. On first visit:
   - Navigate to **Settings > Authentication** to setup your admin account and secure the dashboard.
3. You will immediately see:
   - Local Docker environment with all existing containers (`trophy_db`, `trophy_backend`, etc.).
   - Resource metrics (CPU, RAM).
   - Container logs and interactive terminal.
