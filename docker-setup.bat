@echo off
echo B2B-LAW Docker Setup
echo ====================
echo.
echo Before running, copy .env.example to .env and edit JWT_SECRET:
echo   copy .env.example .env
echo.
echo To start all services:
echo   docker compose up -d
echo.
echo To view logs:
echo   docker compose logs -f
echo.
echo To stop:
echo   docker compose down
echo.
echo Services:
echo   Frontend: http://localhost:80
echo   Backend:  http://localhost:8080/api
echo   Database: localhost:5432 (user: b2b_law, password: b2b_law_pass, db: b2b_law_db)
echo.
echo To run migrations manually:
echo   docker compose exec backend npx tsx src/db/migrate.ts
echo.
pause
