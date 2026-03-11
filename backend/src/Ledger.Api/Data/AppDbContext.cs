using Ledger.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Data;

public sealed class AppDbContext : DbContext {
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<Equipment> Equipment => Set<Equipment>();
    public DbSet<EquipmentRequest> EquipmentRequests => Set<EquipmentRequest>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);
        
        // TODO: implement entities using fluid api
    }
}