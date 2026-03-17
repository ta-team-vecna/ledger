using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ledger.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameRefreshTokenExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RefreshTokenExpiryDate",
                table: "Users",
                newName: "RefreshTokenExpiryTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RefreshTokenExpiryTime",
                table: "Users",
                newName: "RefreshTokenExpiryDate");
        }
    }
}
