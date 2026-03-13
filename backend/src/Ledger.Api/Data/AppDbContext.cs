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

        modelBuilder.Entity<Equipment>(entity => {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(x => x.Type)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.SerialNumber)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Condition)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.Location)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasIndex(x => x.SerialNumber)
                .IsUnique();
        });

        modelBuilder.Entity<EquipmentRequest>(entity => {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status)
                .IsRequired();

            entity.Property(x => x.RequestedAtUtc)
                .IsRequired();

            entity.Property(x => x.RequestedFromUtc)
                .IsRequired();

            entity.Property(x => x.RequestedToUtc)
                .IsRequired();

            entity.Property(x => x.AdminComment)
                .HasMaxLength(1000);

            entity.Property(x => x.ReturnConditionNotes)
                .HasMaxLength(1000);

            entity.HasOne(x => x.User)
                .WithMany(x => x.Requests)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Equipment)
                .WithMany(x => x.Requests)
                .HasForeignKey(x => x.EquipmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ReviewedByAdmin)
                .WithMany(x => x.ReviewedRequests)
                .HasForeignKey(x => x.ReviewedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}