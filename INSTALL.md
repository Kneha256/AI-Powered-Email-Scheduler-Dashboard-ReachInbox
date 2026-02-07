# Installation Guide

## Automated Setup (Recommended)

### Windows
```bash
# Run setup script
setup.bat

# After editing backend\.env with Google OAuth credentials, start all services
start-all.bat
```

### Mac/Linux
```bash
# Make scripts executable
chmod +x setup.sh start-all.sh

# Run setup
./setup.sh

# After editing backend/.env with Google OAuth credentials, start all services
./start-all.sh
```

## Manual Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Setup Environment Files

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and add Google OAuth credentials
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

### 3. Start Services

**Docker (MySQL + Redis):**
```bash
docker-compose up -d
```

**Backend Server (Terminal 1):**
```bash
cd backend
npm run dev
```

**Worker (Terminal 2):**
```bash
cd backend
npm run worker
```

**Frontend (Terminal 3):**
```bash
cd frontend
npm start
```

### 4. Access Application

Open browser: http://localhost:3000

## Google OAuth Setup

1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add redirect URI: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Secret to `backend/.env`

## Verify Installation

```bash
# Check Docker services
docker ps

# Check backend
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000
```

## Troubleshooting

**npm install fails:**
- Delete node_modules and package-lock.json
- Run npm install again

**Docker fails:**
- Make sure Docker Desktop is running
- Check ports 3306 and 6379 are free

**Can't login:**
- Verify Google OAuth credentials in .env
- Check redirect URI matches exactly
