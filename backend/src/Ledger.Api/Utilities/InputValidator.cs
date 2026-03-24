using System.Text.RegularExpressions;

namespace Ledger.Api.Utilities;

public static partial class InputValidator {
    // Only Latin letters, spaces, hyphens, apostrophes, dots
    public const string NamePattern = @"^[a-zA-Z\s\-'\.]+$";
    public const string NameErrorMessage = "Only Latin letters, spaces, hyphens, apostrophes, and dots are allowed.";

    // Stricter email: must have @ and a dot in the domain part
    public const string EmailPattern = @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$";
    public const string EmailErrorMessage = "Must be a valid email address (e.g. user@example.com).";

    // Max lengths
    public const int NameMaxLength = 100;
    public const int EmailMaxLength = 256;
    public const int PasswordMaxLength = 128;
    public const int PasswordMinLength = 8;
    public const int NotesMaxLength = 1000;
    public const int CommentMaxLength = 1000;

    [GeneratedRegex(@"<[^>]*>", RegexOptions.Compiled)]
    private static partial Regex HtmlTagRegex();

    /// <summary>
    /// Strips HTML tags from input to prevent stored XSS.
    /// </summary>
    public static string StripHtmlTags(string input) {
        if (string.IsNullOrEmpty(input)) return input;
        return HtmlTagRegex().Replace(input, string.Empty);
    }

    /// <summary>
    /// Sanitizes a string by trimming whitespace and stripping HTML tags.
    /// </summary>
    public static string Sanitize(string input) {
        if (string.IsNullOrEmpty(input)) return input;
        return StripHtmlTags(input.Trim());
    }
}
