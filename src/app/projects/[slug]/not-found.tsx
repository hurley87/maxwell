import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function ProjectNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Project Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This project file doesn&apos;t exist yet. Create a markdown file in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              notes/projects/
            </code>{" "}
            to get started.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily Notes
          </Link>
        </div>
      </main>
    </div>
  );
}
