/**
 * Task type definition for parsed markdown tasks
 */
export type Task = {
  id: string;
  content: string; // Task text (may include inline links)
  children: Task[]; // Nested sub-tasks
  depth: number; // Indentation level
};
