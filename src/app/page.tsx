import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseTaskMarkdown } from "@/lib/tasks/parse-tasks";
import { Task } from "@/lib/tasks/types";
import { TaskList } from "@/components/task-list/task-list";
import { DatePicker } from "@/components/date-picker";

/**
 * Formats a date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets all dates that have note files in the notes/daily directory
 */
function getNoteDates(): Date[] {
  const notesDir = join(process.cwd(), "notes", "daily");
  try {
    const files = readdirSync(notesDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => new Date(f.replace(".md", "") + "T00:00:00"))
      .filter((d) => !isNaN(d.getTime()));
  } catch {
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params.date
    ? new Date(params.date + "T00:00:00")
    : new Date();
  
  // Validate date - if invalid, default to today
  const date = isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
  
  const dateString = formatDate(date);

  let tasks: Task[] = [];
  let hasError = false;

  try {
    // Read markdown file from notes/daily/YYYY-MM-DD.md
    const filePath = join(process.cwd(), "notes", "daily", `${dateString}.md`);
    const markdown = readFileSync(filePath, "utf-8");
    tasks = parseTaskMarkdown(markdown);
  } catch {
    // File doesn't exist or can't be read
    hasError = true;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <DatePicker selectedDate={date} datesWithNotes={getNoteDates()} />
        </div>

        {hasError ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No notes file found for this date. Create{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                notes/daily/{dateString}.md
              </code>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div>
            <TaskList tasks={tasks} />
          </div>
        )}
      </main>
    </div>
  );
}
