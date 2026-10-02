import { Issue, ApiInterface, IssueStatus, IssuePriority } from './types';
import { calculateSeverity } from '../utils/severity';

// Bounding boxes for neighborhoods
// Kurla: ~19.065, 72.880
// Dadar: ~19.019, 72.842
// Bandra: ~19.054, 72.833
// Powai: ~19.119, 72.905
// Andheri West (empty): ~19.136, 72.827

const seedData: Issue[] = Array.from({ length: 30 }).map((_, i) => {
  const isKurla = i % 4 === 0;
  const isDadar = i % 4 === 1;
  const isBandra = i % 4 === 2;
  
  let lat = 19.119 + (Math.random() - 0.5) * 0.02;
  let lng = 72.905 + (Math.random() - 0.5) * 0.02;
  
  if (isKurla) { lat = 19.065 + (Math.random() - 0.5) * 0.02; lng = 72.880 + (Math.random() - 0.5) * 0.02; }
  else if (isDadar) { lat = 19.019 + (Math.random() - 0.5) * 0.02; lng = 72.842 + (Math.random() - 0.5) * 0.02; }
  else if (isBandra) { lat = 19.054 + (Math.random() - 0.5) * 0.02; lng = 72.833 + (Math.random() - 0.5) * 0.02; }
  
  const categories = ['pothole', 'streetlight', 'water leak', 'garbage', 'drainage', 'other'];
  const category = categories[i % categories.length];
  const statuses: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const status = statuses[i % statuses.length];
  
  const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  
  const history = [{ status: 'Reported' as IssueStatus, changed_by: 'citizen2', changed_at: createdDate.toISOString() }];
  if (status !== 'Reported') {
    history.push({ status: 'Assigned', changed_by: 'admin', changed_at: new Date(createdDate.getTime() + 86400000).toISOString() });
  }
  if (status === 'In Progress' || status === 'Resolved') {
    history.push({ status: 'In Progress', changed_by: 'worker1', changed_at: new Date(createdDate.getTime() + 2 * 86400000).toISOString() });
  }
  if (status === 'Resolved') {
    history.push({ status: 'Resolved', changed_by: 'worker1', changed_at: new Date(createdDate.getTime() + 3 * 86400000).toISOString() });
  }

  const priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical', null];
  const description = `This is a sample description for a ${category} issue reported recently.`;
  const { suggested_priority, suggested_reason } = calculateSeverity(category, description);

  let duplicate_of: string | undefined = undefined;
  let duplicate_distance_m: number | undefined = undefined;
  let duplicate_status: 'pending' | 'confirmed' | 'dismissed' | undefined = undefined;

  if (i === 2) {
    duplicate_of = 'ISSUE-1000';
    duplicate_distance_m = 45;
    duplicate_status = 'pending';
  }

  return {
    id: `ISSUE-${1000 + i}`,
    user_id: i % 2 === 0 ? 'citizen1' : 'citizen2',
    category,
    description,
    lat,
    lng,
    status,
    priority: priorities[i % priorities.length],
    suggested_priority,
    suggested_reason,
    duplicate_of,
    duplicate_distance_m,
    duplicate_status,
    report_count: 1,
    created_at: createdDate.toISOString(),
    history
  };
});

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

class MockApi implements ApiInterface {
  private get data(): Issue[] {
    const stored = localStorage.getItem('issues');
    if (!stored) {
      localStorage.setItem('issues', JSON.stringify(seedData));
      return seedData;
    }
    return JSON.parse(stored);
  }

  private set data(issues: Issue[]) {
    localStorage.setItem('issues', JSON.stringify(issues));
  }

  async getIssues(filters?: { status?: IssueStatus; category?: string }) {
    let results = this.data;
    // Hide confirmed duplicates from map
    results = results.filter(i => i.duplicate_status !== 'confirmed');
    if (filters?.status) results = results.filter(i => i.status === filters.status);
    if (filters?.category) results = results.filter(i => i.category === filters.category);
    return results;
  }

  async getIssue(id: string) {
    return this.data.find(i => i.id === id) || null;
  }

  async createIssue(data: Omit<Issue, 'id' | 'status' | 'priority' | 'report_count' | 'created_at' | 'history'>) {
    const issues = this.data;
    
    // Duplicate check
    let duplicate_of: string | undefined = undefined;
    let duplicate_distance_m: number | undefined = undefined;
    let duplicate_status: 'pending' | 'confirmed' | 'dismissed' | undefined = undefined;
    
    for (const parent of issues) {
      if (parent.status !== 'Resolved' && !parent.duplicate_of && parent.category === data.category) {
        const dist = haversine(data.lat, data.lng, parent.lat, parent.lng);
        if (dist <= 50) {
          duplicate_of = parent.id;
          duplicate_distance_m = Math.round(dist);
          duplicate_status = 'pending';
          break; // Stop at first match
        }
      }
    }

    const { suggested_priority, suggested_reason } = calculateSeverity(data.category, data.description);

    const newIssue: Issue = {
      ...data,
      id: `ISSUE-${Date.now()}`,
      status: 'Reported',
      priority: null,
      suggested_priority,
      suggested_reason,
      duplicate_of,
      duplicate_distance_m,
      duplicate_status,
      report_count: 1,
      created_at: new Date().toISOString(),
      history: [{ status: 'Reported', changed_by: data.user_id, changed_at: new Date().toISOString() }]
    };
    
    this.data = [...issues, newIssue];
    return newIssue;
  }

  async getMyIssues(userId: string) {
    const issues = this.data;
    const myIssues = issues.filter(i => i.user_id === userId);
    return myIssues.map(issue => {
      if (issue.duplicate_status === 'confirmed' && issue.duplicate_of) {
        const parent = issues.find(p => p.id === issue.duplicate_of);
        if (parent) {
          return { ...issue, status: parent.status, history: parent.history };
        }
      }
      return issue;
    });
  }

  async updateIssue(id: string, updates: Partial<Issue>, changedBy: string) {
    const issues = this.data;
    const idx = issues.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Issue not found');
    
    if (updates.status && updates.status !== issues[idx].status) {
      issues[idx].history.push({
        status: updates.status,
        changed_by: changedBy,
        changed_at: new Date().toISOString()
      });
    }
    
    issues[idx] = { ...issues[idx], ...updates };
    this.data = issues;
    return issues[idx];
  }

  async resolveDuplicate(id: string, duplicateOfId: string, action: 'confirm' | 'dismiss', _changedBy: string) {
    const issues = this.data;
    const idx = issues.findIndex(i => i.id === id);
    const parentIdx = issues.findIndex(i => i.id === duplicateOfId);
    if (idx !== -1) {
      if (action === 'confirm') {
        issues[idx].duplicate_status = 'confirmed';
        if (parentIdx !== -1) {
          issues[parentIdx].report_count += issues[idx].report_count;
        }
      } else {
        issues[idx].duplicate_status = 'dismissed';
        issues[idx].duplicate_of = undefined;
        issues[idx].duplicate_distance_m = undefined;
      }
      this.data = issues;
    }
  }

  async getResolutionStats() {
    const issues = this.data;
    const resolved = issues.filter(i => i.status === 'Resolved');
    const open = issues.length - resolved.length;
    const flagged = issues.filter(i => i.duplicate_status === 'pending').length;
    
    const catStats: Record<string, { totalTime: number, count: number }> = {};
    let totalTimeOverall = 0;
    
    resolved.forEach(issue => {
      const reportedHist = issue.history.find(h => h.status === 'Reported');
      const resolvedHist = issue.history.find(h => h.status === 'Resolved');
      if (reportedHist && resolvedHist) {
        const ms = new Date(resolvedHist.changed_at).getTime() - new Date(reportedHist.changed_at).getTime();
        const days = ms / (1000 * 60 * 60 * 24);
        totalTimeOverall += days;
        if (!catStats[issue.category]) catStats[issue.category] = { totalTime: 0, count: 0 };
        catStats[issue.category].totalTime += days;
        catStats[issue.category].count += 1;
      }
    });

    const avgResolutionTimeDays = resolved.length ? totalTimeOverall / resolved.length : 0;
    
    const perCategory = Object.keys(catStats).map(cat => ({
      category: cat,
      avgTimeDays: catStats[cat].totalTime / catStats[cat].count
    }));

    return {
      open,
      resolved: resolved.length,
      avgResolutionTimeDays,
      flaggedDuplicates: flagged,
      perCategory
    };
  }
}

export const mockApi = new MockApi();
export { api, SupabaseApi } from './supabaseAdapter';
