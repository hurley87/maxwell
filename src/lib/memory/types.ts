export type EntityKind = 'project' | 'person' | 'topic' | 'url' | 'date';

export type Entity = {
  id: string;
  name: string;
  kind: EntityKind;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  mentionCount: number;
};

export type ObservationCategory = 'task' | 'decision' | 'note' | 'link' | 'question' | 'reference';

export type Observation = {
  id: string;
  entityId: string;
  category: ObservationCategory;
  content: string;
  sourceFile: string;
  sourceLine: number;
  createdAt: string;
  completed?: boolean;
};

export type RelationType = 'references' | 'child_of' | 'related_to';

export type Relation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: RelationType;
  sourceFile: string;
  createdAt: string;
};

export type SearchResult = {
  entity: Entity;
  observations: Observation[];
  score: number;
};

export type ContextResult = {
  entities: Entity[];
  observations: Observation[];
  formattedContext: string; // Markdown-formatted for agent consumption
};
