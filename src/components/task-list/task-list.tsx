import { Task } from "@/lib/tasks/types";
import { TaskItem } from "./task-item";

interface TaskListProps {
  tasks: Task[];
}

/**
 * Container component for rendering a list of tasks
 */
export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No notes for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
