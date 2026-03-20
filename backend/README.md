# Ledger

Instructions to develop parallel to frontend or on the backend:

1. Install .NET 10
2. Install Postgresql from their official site
3. Use default user `postgres` with password `compsci`
4. Install EFCore with `dotnet tool install --global dotnet-ef`
5. Go to `src/Ledger.Api` in your terminal
6. Build the project with `dotnet build`
7. Run migrations on databse with `dotnet ef database update`
8. Run backend server with `dotnet run`
9. Work on the frontend, API exposed at `localhost:3001`, HTTPS at `localhost:3002`

API documentation is provided at `http://localhost:3001/swagger/index.html`.

For undocumented API response/requests look in the `Dto` folder of `Ledger.Api`, or ping `@glomdom`.