"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Task } from "@/lib/tasks/types";

interface TaskItemProps {
  task: Task;
}

type ContentPart = 
  | { type: "text"; content: string }
  | { type: "url"; content: string; url: string }
  | { type: "markdown"; content: string; url: string }
  | { type: "wikilink"; content: string; slug: string };

/**
 * Recursively renders a task item with collapsible children
 * Auto-links URLs, markdown links, and wiki links in task content
 */
export function TaskItem({ task }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = task.children.length > 0;

  /**
   * Converts plain URLs, markdown links, and wiki links [[Name]] to clickable links
   */
  const renderContent = (content: string) => {
    // Match: wiki links [[Name]], URLs (http/https), and markdown links [text](url)
    const combinedRegex = /\[\[([^\]]+)\]\]|(https?:\/\/[^\s\)]+)|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Handle wiki link [[Name]]
      if (match[1]) {
        parts.push({
          type: "wikilink",
          content: match[1],
          slug: match[1].toLowerCase().replace(/\s+/g, "-"),
        });
      }
      // Handle plain URL
      else if (match[2]) {
        parts.push({
          type: "url",
          content: match[2],
          url: match[2],
        });
      }
      // Handle markdown link [text](url)
      else if (match[3] && match[4]) {
        parts.push({
          type: "markdown",
          content: match[3],
          url: match[4],
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    // If no links found, return original content
    if (parts.length === 0) {
      return <span>{content}</span>;
    }

    return (
      <>
        {parts.map((part, index) => {
          if (part.type === "text") {
            return <span key={index}>{part.content}</span>;
          }
          if (part.type === "wikilink") {
            return (
              <Link
                key={index}
                href={`/projects/${part.slug}`}
                className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
              >
                {part.content}
              </Link>
            );
          }
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              {part.content}
            </a>
          );
        })}
      </>
    );
  };

  return (
    <div className="select-none">
      <div className="flex items-start gap-2 py-1.5 group">
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}

        {/* Note content */}
        <div className="flex-1 text-sm leading-relaxed">
          {renderContent(task.content)}
        </div>
      </div>

      {/* Nested children */}
      {hasChildren && isExpanded && (
        <div className="ml-6 border-l border-border pl-4">
          {task.children.map((child) => (
            <TaskItem key={child.id} task={child} />
          ))}
        </div>
      )}
    </div>
  );
}
