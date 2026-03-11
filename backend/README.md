# Ledger

Instructions to develop parallel to backend or on the backend:

1. Install .NET 10
2. Install Postgresql from their official site
3. Use default user `postgres` with password `compsci`
4. Install EFCore with `dotnet tool install --global dotnet-ef`
5. Run migrations on databse with `dotnet ef database update --project src/Ledger.Api`
6. Run backend server with `dotnet run src/Ledger.Api`
7. Work on the frontend, API exposed at `localhost:3001`, HTTPS at `localhost:3002`