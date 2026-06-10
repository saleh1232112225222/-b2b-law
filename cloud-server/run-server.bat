@echo off
set DATABASE_URL=postgresql://postgres:1390@localhost:5432/b2b_law
set JWT_SECRET=my-secret-key
set PORT=8080
cd /d G:\b2b\cloud-server
node dist/index.js > server-output.log 2>&1
