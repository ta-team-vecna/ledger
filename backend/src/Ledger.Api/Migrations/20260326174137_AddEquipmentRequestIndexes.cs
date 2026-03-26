using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ledger.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentRequestIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_EquipmentRequests_RequestedToUtc",
                table: "EquipmentRequests",
                column: "RequestedToUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentRequests_Status",
                table: "EquipmentRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentRequests_Status_RequestedToUtc",
                table: "EquipmentRequests",
                columns: new[] { "Status", "RequestedToUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EquipmentRequests_RequestedToUtc",
                table: "EquipmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentRequests_Status",
                table: "EquipmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentRequests_Status_RequestedToUtc",
                table: "EquipmentRequests");
        }
    }
}
