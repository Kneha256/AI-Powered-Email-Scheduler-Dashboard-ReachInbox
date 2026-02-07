import { parse } from 'csv-parse/sync';

export function parseEmailsFromCSV(fileContent: string): string[] {
  const emails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  try {
    // Try parsing as CSV
    const records = parse(fileContent, {
      skip_empty_lines: true,
      trim: true
    });

    // Extract emails from all columns
    for (const record of records) {
      for (const value of record) {
        if (typeof value === 'string' && emailRegex.test(value.trim())) {
          emails.push(value.trim());
        }
      }
    }
  } catch (error) {
    // If CSV parsing fails, try line by line
    const lines = fileContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (emailRegex.test(trimmed)) {
        emails.push(trimmed);
      }
    }
  }

  // Remove duplicates
  return [...new Set(emails)];
}
