Tournament Platform
A full-stack web application for managing esports tournaments. Features include user authentication (with email activation), tournament creation, bracket generation (single elimination), and match history tracking.

🛠 Tech Stack
Backend

Framework: Django 6.0.1 & Django REST Framework

Authentication: Djoser (JWT-based auth with email activation & password reset)

Database: PostgreSQL (Running in Docker)

Frontend

Framework: React 18 (via Vite)

Routing: React Router DOM v6

Styling: CSS Modules / Custom CSS

🚀 Getting Started
Prerequisites

Docker Desktop (For the Database)

Python 3.10+ (For the Backend)

Node.js 18+ (For the Frontend)

1. Environment Setup

Create a .env file in backend directory with the following variables:

Ini, TOML
# .env
DEBUG=True
DJANGO_SECRET_KEY=your-secret-key-here
# Database settings must match your docker-compose.yml
DB_PASSWORD=postgres
POSTGRES_DB=tournament_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
2. Start the Database

Since the database runs in Docker, start it first:

Bash
docker-compose up -d
This spins up the PostgreSQL container on port 5432.

3. Backend Setup (Django)

Open a terminal in the backend folder (or root, depending on where manage.py is).

Bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Apply Migrations (Connects to the Docker DB)
python manage.py migrate

# 5. Seed Demo Data (Optional but Recommended)
# Creates users, tournaments, and match history
python manage.py seed_data

# 6. Create Admin User
python manage.py createsuperuser

# 7. Run the Server
python manage.py runserver
The Backend API will be available at http://localhost:8000.

4. Frontend Setup (React)

Open a new terminal in the frontend folder.

Bash
# 1. Install dependencies
npm install

# 2. Start the Development Server
npm run dev
The Frontend will be available at http://localhost:5173.

🔑 Key Features
1. Authentication System

Registration: Users sign up and receive an activation email (printed to the backend console).

Login: JWT (Access & Refresh tokens).

Password Reset: Secure flow via email link (handled by Djoser).

2. Tournaments

Open: Users can join upcoming tournaments.

Ongoing: Brackets are automatically generated when the tournament starts.

Finished: View historical data, brackets, and scores.

3. Bracket System

Single Elimination: Standard tree structure.

Match Logic: Handles advancing winners to the next round automatically.
