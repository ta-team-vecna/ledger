namespace Ledger.Api.Domain;

public sealed class ApplicationUser {
    public Guid Id { get; set; }

    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string FullName => $"{FirstName} {LastName}";

    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public UserRole Role { get; set; } = UserRole.User;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    
    public ICollection<EquipmentRequest> Requests { get; set; } = new List<EquipmentRequest>();
    public ICollection<EquipmentRequest> ReviewedRequests { get; set; } = new List<EquipmentRequest>();
} 