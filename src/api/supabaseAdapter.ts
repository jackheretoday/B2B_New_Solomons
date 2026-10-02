import { Issue, ApiInterface, IssueStatus, IssuePriority, ResolutionStats, IssueHistory } from './types';
import { calculateSeverity } from '../utils/severity';
import { supabase, toSupabaseUserId, fromSupabaseUserId, uploadImageToStorage } from './supabaseClient';

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to encode/decode photo payloads that may contain original, annotated, and resolved images
export function parsePhotoData(rawPhotoUrl?: string): {
  originalUrl?: string;
  annotatedUrl?: string;
  resolvedUrl?: string;
} {
  if (!rawPhotoUrl) return {};
  if (rawPhotoUrl.startsWith('{') && rawPhotoUrl.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawPhotoUrl);
      return {
        originalUrl: parsed.original || parsed.originalUrl,
        annotatedUrl: parsed.annotated || parsed.annotatedUrl,
        resolvedUrl: parsed.resolved || parsed.resolvedUrl,
      };
    } catch {
      // not valid JSON
    }
  }
  return { originalUrl: rawPhotoUrl };
}

export function serializePhotoData(
  original?: string,
  annotated?: string,
  resolved?: string
): string {
  if (resolved || annotated) {
    return JSON.stringify({
      original: original || '',
      annotated: annotated || '',
      resolved: resolved || '',
    });
  }
  return original || '';
}

export class SupabaseApi implements ApiInterface {
  /**
   * Fetch issues from Supabase
   */
  async getIssues(filters?: { status?: IssueStatus; category?: string }): Promise<Issue[]> {
    try {
      let query = supabase.from('issues').select('*, issue_history(*)');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching issues from Supabase:', error);
        return [];
      }

      return (data || []).map(row => this.mapDbRowToIssue(row));
    } catch (err) {
      console.error('Failed to get issues:', err);
      return [];
    }
  }

  /**
   * Fetch single issue by ID
   */
  async getIssue(id: string): Promise<Issue | null> {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*, issue_history(*)')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return this.mapDbRowToIssue(data);
    } catch (err) {
      console.error('Failed to get issue:', err);
      return null;
    }
  }

  /**
   * Create a new issue reported by citizen
   */
  async createIssue(
    data: Omit<Issue, 'id' | 'status' | 'priority' | 'report_count' | 'created_at' | 'history'>
  ): Promise<Issue> {
    try {
      // 1. Upload photo to Supabase storage if provided
      let originalPhotoUrl = data.photo_url || '';
      if (originalPhotoUrl.startsWith('data:')) {
        originalPhotoUrl = await uploadImageToStorage(originalPhotoUrl, 'report');
      }

      let annotatedPhotoUrl = data.ai_annotated_url || '';
      if (annotatedPhotoUrl.startsWith('data:')) {
        annotatedPhotoUrl = await uploadImageToStorage(annotatedPhotoUrl, 'annotated');
      }

      const compositePhotoUrl = serializePhotoData(originalPhotoUrl, annotatedPhotoUrl);

      // 2. Check for duplicate open issues within 50m
      const { data: existingIssues } = await supabase
        .from('issues')
        .select('*')
        .neq('status', 'Resolved')
        .is('duplicate_of', null)
        .eq('category', data.category);

      let duplicate_of: string | undefined = undefined;
      let duplicate_distance_m: number | undefined = undefined;
      let duplicate_status: 'pending' | 'confirmed' | 'dismissed' | undefined = undefined;

      if (existingIssues) {
        for (const parent of existingIssues) {
          const dist = haversine(data.lat, data.lng, parent.lat, parent.lng);
          if (dist <= 50) {
            duplicate_of = parent.id;
            duplicate_distance_m = Math.round(dist);
            duplicate_status = 'pending';
            break;
          }
        }
      }

      // 3. Compute suggested priority / severity
      const { suggested_priority, suggested_reason } = calculateSeverity(
        data.category,
        data.description
      );

      const issueId = `ISSUE-${Date.now()}`;
      const dbUserId = toSupabaseUserId(data.user_id);
      const createdAt = new Date().toISOString();

      const insertPayload = {
        id: issueId,
        user_id: dbUserId,
        category: data.category,
        description: data.description,
        photo_url: compositePhotoUrl,
        lat: data.lat,
        lng: data.lng,
        status: 'Reported' as IssueStatus,
        priority: null as IssuePriority,
        suggested_priority: data.suggested_priority || suggested_priority,
        suggested_reason: data.suggested_reason || suggested_reason,
        department_id: data.department_id || (data.category === 'pothole' ? 'Roads' : null),
        duplicate_of: duplicate_of || null,
        duplicate_distance_m: duplicate_distance_m || null,
        duplicate_status: duplicate_status || null,
        report_count: 1,
        created_at: createdAt,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('issues')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting issue into Supabase:', insertError);
        throw insertError;
      }

      // 4. Insert initial history row
      await supabase.from('issue_history').insert({
        issue_id: issueId,
        status: 'Reported',
        changed_by: data.user_id,
        changed_at: createdAt,
      });

      return {
        ...this.mapDbRowToIssue(inserted),
        history: [{ status: 'Reported', changed_by: data.user_id, changed_at: createdAt }],
        ai_verified: data.ai_verified,
        ai_confidence: data.ai_confidence,
        ai_detection_count: data.ai_detection_count,
        ai_annotated_url: annotatedPhotoUrl,
      };
    } catch (err) {
      console.error('createIssue failed:', err);
      throw err;
    }
  }

  /**
   * Fetch user's submitted reports
   */
  async getMyIssues(userId: string): Promise<Issue[]> {
    try {
      const dbUserId = toSupabaseUserId(userId);

      const { data, error } = await supabase
        .from('issues')
        .select('*, issue_history(*)')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getMyIssues:', error);
        return [];
      }

      const issues = (data || []).map(row => this.mapDbRowToIssue(row));

      // Resolve duplicate parent status
      return await Promise.all(
        issues.map(async issue => {
          if (issue.duplicate_status === 'confirmed' && issue.duplicate_of) {
            const parent = await this.getIssue(issue.duplicate_of);
            if (parent) {
              return {
                ...issue,
                status: parent.status,
                history: parent.history,
                resolved_photo_url: parent.resolved_photo_url,
              };
            }
          }
          return issue;
        })
      );
    } catch (err) {
      console.error('getMyIssues failed:', err);
      return [];
    }
  }

  /**
   * Update issue (Admin assigns priority/risk score, department, updates status, uploads resolved photo)
   */
  async updateIssue(id: string, updates: Partial<Issue>, changedBy: string): Promise<Issue> {
    try {
      const existing = await this.getIssue(id);
      if (!existing) throw new Error('Issue not found');

      const dbUpdates: Record<string, any> = {};

      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.department_id !== undefined) dbUpdates.department_id = updates.department_id;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      // Handle photos: if resolved_photo_url is provided, upload if base64 and serialize
      if (updates.resolved_photo_url !== undefined) {
        let resolvedUrl = updates.resolved_photo_url;
        if (resolvedUrl && resolvedUrl.startsWith('data:')) {
          resolvedUrl = await uploadImageToStorage(resolvedUrl, 'resolved');
        }

        const existingPhotos = parsePhotoData(existing.photo_url);
        dbUpdates.photo_url = serializePhotoData(
          existingPhotos.originalUrl,
          existingPhotos.annotatedUrl,
          resolvedUrl
        );
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from('issues')
          .update(dbUpdates)
          .eq('id', id);

        if (updateError) {
          console.error('Error updating issue in Supabase:', updateError);
          throw updateError;
        }
      }

      // Record history if status changed
      if (updates.status && updates.status !== existing.status) {
        await supabase.from('issue_history').insert({
          issue_id: id,
          status: updates.status,
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
        });
      }

      const updated = await this.getIssue(id);
      return updated || existing;
    } catch (err) {
      console.error('updateIssue failed:', err);
      throw err;
    }
  }

  /**
   * Resolve duplicate confirmation or dismissal
   */
  async resolveDuplicate(
    id: string,
    duplicateOfId: string,
    action: 'confirm' | 'dismiss',
    _changedBy: string
  ): Promise<void> {
    try {
      if (action === 'confirm') {
        await supabase
          .from('issues')
          .update({ duplicate_status: 'confirmed' })
          .eq('id', id);

        // Increment parent count
        const parent = await this.getIssue(duplicateOfId);
        if (parent) {
          await supabase
            .from('issues')
            .update({ report_count: parent.report_count + 1 })
            .eq('id', duplicateOfId);
        }
      } else {
        await supabase
          .from('issues')
          .update({
            duplicate_status: 'dismissed',
            duplicate_of: null,
            duplicate_distance_m: null,
          })
          .eq('id', id);
      }
    } catch (err) {
      console.error('resolveDuplicate failed:', err);
    }
  }

  /**
   * Resolution stats calculation
   */
  async getResolutionStats(): Promise<ResolutionStats> {
    try {
      const { data: allIssues } = await supabase
        .from('issues')
        .select('*, issue_history(*)');

      const issues = (allIssues || []).map(row => this.mapDbRowToIssue(row));
      const resolved = issues.filter(i => i.status === 'Resolved');
      const open = issues.length - resolved.length;
      const flagged = issues.filter(i => i.duplicate_status === 'pending').length;

      const catStats: Record<string, { totalTime: number; count: number }> = {};
      let totalTimeOverall = 0;

      resolved.forEach(issue => {
        const reportedHist = issue.history.find(h => h.status === 'Reported');
        const resolvedHist = issue.history.find(h => h.status === 'Resolved');
        if (reportedHist && resolvedHist) {
          const ms =
            new Date(resolvedHist.changed_at).getTime() -
            new Date(reportedHist.changed_at).getTime();
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
        avgTimeDays: catStats[cat].totalTime / catStats[cat].count,
      }));

      return {
        open,
        resolved: resolved.length,
        avgResolutionTimeDays,
        flaggedDuplicates: flagged,
        perCategory,
      };
    } catch (err) {
      console.error('getResolutionStats failed:', err);
      return {
        open: 0,
        resolved: 0,
        avgResolutionTimeDays: 0,
        flaggedDuplicates: 0,
        perCategory: [],
      };
    }
  }

  /**
   * Map Supabase database row to frontend Issue interface
   */
  private mapDbRowToIssue(row: any): Issue {
    const photos = parsePhotoData(row.photo_url);

    const history: IssueHistory[] = (row.issue_history || [])
      .map((h: any) => ({
        status: h.status as IssueStatus,
        changed_by: fromSupabaseUserId(h.changed_by),
        changed_at: h.changed_at,
      }))
      .sort(
        (a: IssueHistory, b: IssueHistory) =>
          new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
      );

    return {
      id: row.id,
      user_id: fromSupabaseUserId(row.user_id),
      category: row.category,
      description: row.description,
      photo_url: photos.originalUrl || '',
      ai_annotated_url: photos.annotatedUrl || undefined,
      resolved_photo_url: photos.resolvedUrl || undefined,
      lat: row.lat,
      lng: row.lng,
      status: row.status as IssueStatus,
      priority: row.priority as IssuePriority,
      suggested_priority: row.suggested_priority as IssuePriority,
      suggested_reason: row.suggested_reason || undefined,
      department_id: row.department_id || undefined,
      duplicate_of: row.duplicate_of || undefined,
      duplicate_distance_m: row.duplicate_distance_m || undefined,
      duplicate_status: row.duplicate_status || undefined,
      report_count: row.report_count || 1,
      created_at: row.created_at,
      history,
    };
  }
}

export const api = new SupabaseApi();
