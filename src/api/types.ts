export type IssueStatus = 'Reported' | 'Assigned' | 'In Progress' | 'Resolved';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical' | null;

export interface IssueHistory {
  status: IssueStatus;
  changed_by: string;
  changed_at: string;
}

export interface Issue {
  id: string;
  user_id: string;
  category: string;
  description: string;
  photo_url?: string;
  lat: number;
  lng: number;
  status: IssueStatus;
  priority: IssuePriority;
  suggested_priority?: IssuePriority;
  suggested_reason?: string;
  department_id?: string;
  duplicate_of?: string;
  duplicate_distance_m?: number;
  duplicate_status?: 'pending' | 'confirmed' | 'dismissed';
  report_count: number;
  created_at: string;

  history: IssueHistory[];
  ai_verified?: boolean;
  ai_confidence?: number;
  ai_detection_count?: number;
  ai_annotated_url?: string;
  resolved_photo_url?: string;
  assigned_worker?: string;
  assigned_department?: string;
}


export interface ResolutionStats {
  open: number;
  resolved: number;
  avgResolutionTimeDays: number;
  flaggedDuplicates: number;
  perCategory: { category: string; avgTimeDays: number }[];
}

export interface ApiInterface {
  getIssues(filters?: { status?: IssueStatus; category?: string }): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | null>;
  createIssue(data: Omit<Issue, 'id' | 'status' | 'priority' | 'report_count' | 'created_at' | 'history'>): Promise<Issue>;
  getMyIssues(userId: string): Promise<Issue[]>;
  updateIssue(id: string, updates: Partial<Issue>, changedBy: string): Promise<Issue>;
  resolveDuplicate(id: string, duplicateOfId: string, action: 'confirm' | 'dismiss', changedBy: string): Promise<void>;
  getResolutionStats(): Promise<ResolutionStats>;
}
