namespace Ledger.Api.Email;

public sealed class NotificationBackgroundService : BackgroundService {
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationBackgroundService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    public NotificationBackgroundService(IServiceScopeFactory scopeFactory,
        ILogger<NotificationBackgroundService> logger) {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        _logger.LogInformation("Notification background service started (interval: {Interval})", Interval);

        while (!stoppingToken.IsCancellationRequested) {
            try {
                using var scope = _scopeFactory.CreateScope();
                var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

                await notifications.SendPickupRemindersAsync(stoppingToken);
                await notifications.SendReturnRemindersAsync(stoppingToken);
                await notifications.SendOverdueNoticesAsync(stoppingToken);
                await notifications.SendApprovalBatchDigestAsync(stoppingToken);
                await notifications.SendInventoryRiskDigestAsync(stoppingToken);
            } catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) {
                break;
            } catch (Exception ex) {
                _logger.LogError(ex, "Error in notification background service");
            }

            await Task.Delay(Interval, stoppingToken);
        }

        _logger.LogInformation("Notification background service stopped");
    }
}
