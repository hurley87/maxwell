import { Task } from "./types";

/**
 * Parses markdown bullet list format into a nested Task structure
 * 
 * Expected format:
 * - Note text
 *     - Nested note (4 spaces = 1 level)
 * 
 * @param markdown - Raw markdown string with bullet lists
 * @returns Array of root-level Task objects with nested children
 */
export function parseTaskMarkdown(markdown: string): Task[] {
  const lines = markdown.split("\n");
  const tasks: Task[] = [];
  const stack: Array<{ task: Task; depth: number }> = [];

  let taskIdCounter = 0;

  for (const line of lines) {
    // Match bullet pattern: leading whitespace, "- ", then content
    const bulletMatch = line.match(/^(\s*)- (.+)$/);
    
    if (!bulletMatch) {
      continue; // Skip non-bullet lines
    }

    const [, indent, content] = bulletMatch;
    const depth = Math.floor(indent.length / 4); // 4 spaces = 1 level

    const task: Task = {
      id: `task-${taskIdCounter++}`,
      content: content.trim(),
      children: [],
      depth,
    };

    // Find the correct parent in the stack
    while (
      stack.length > 0 &&
      stack[stack.length - 1].depth >= depth
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Root level task
      tasks.push(task);
    } else {
      // Nested task - add to parent's children
      stack[stack.length - 1].task.children.push(task);
    }

    // Push current task onto stack for potential children
    stack.push({ task, depth });
  }

  return tasks;
}
