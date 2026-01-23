import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { parseTaskMarkdown } from "@/lib/tasks/parse-tasks";
import { Task } from "@/lib/tasks/types";
import { TaskList } from "@/components/task-list/task-list";
import { ArrowLeft } from "lucide-react";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Finds a project file by slug (case-insensitive match)
 */
function findProjectFile(slug: string): { filePath: string; projectName: string } | null {
  const projectsDir = join(process.cwd(), "notes", "projects");
  
  try {
    const files = readdirSync(projectsDir);
    
    // Try exact match first (case-insensitive)
    for (const file of files) {
      if (file.endsWith(".md")) {
        const fileName = file.replace(".md", "");
        if (fileName.toLowerCase() === slug.toLowerCase()) {
          return {
            filePath: join(projectsDir, file),
            projectName: fileName,
          };
        }
      }
    }
    
    // Try matching with dashes converted to spaces
    const slugWithSpaces = slug.replace(/-/g, " ");
    for (const file of files) {
      if (file.endsWith(".md")) {
        const fileName = file.replace(".md", "");
        if (fileName.toLowerCase() === slugWithSpaces.toLowerCase()) {
          return {
            filePath: join(projectsDir, file),
            projectName: fileName,
          };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  
  const projectFile = findProjectFile(slug);
  
  if (!projectFile) {
    notFound();
  }
  
  let tasks: Task[] = [];
  let hasError = false;
  
  try {
    const markdown = readFileSync(projectFile.filePath, "utf-8");
    tasks = parseTaskMarkdown(markdown);
  } catch {
    hasError = true;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily Notes
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            {projectFile.projectName}
          </h1>
        </div>
        
        {hasError ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Error reading project file.
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No content in this project file yet.
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
