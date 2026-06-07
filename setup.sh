#!/bin/bash
# CleanRun IMMS Setup Script

echo "=== CleanRun IMMS Setup ==="

# Create virtual environment and install deps
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create PostgreSQL database (run as postgres superuser or update .env credentials)
# psql -U postgres -c "CREATE DATABASE cleanrun_db;"

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (manager)
echo "Creating superuser..."
python manage.py createsuperuser

echo ""
echo "=== Setup Complete ==="
echo "Run: python manage.py runserver"
echo "Admin: http://localhost:8000/admin/"
echo "API:   http://localhost:8000/api/"
