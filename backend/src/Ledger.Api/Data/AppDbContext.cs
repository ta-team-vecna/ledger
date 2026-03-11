using Ledger.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Data;

public sealed class AppDbContext : DbContext {
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    // public DbSet<Equipment> Equipment => Set<Equipment>();
    // public DbSet<EquipmentRequest> EquipmentRequests => Set<EquipmentRequest>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        base.OnModelCreating(modelBuilder);

        // TODO: finish implementing entities using fluid api

        modelBuilder.Entity<ApplicationUser>(entity => {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(x => x.PasswordHash)
                .IsRequired();

            entity.HasIndex(x => x.Email)
                .IsUnique();
        });
    }
}