import { supabase, USER_ID_MAP } from './supabaseClient';
import { serializePhotoData } from './supabaseAdapter';
import { IssueStatus, IssuePriority } from './types';

const seedIssues = [
  {
    id: 'ISSUE-1001',
    user_id: USER_ID_MAP['citizen1'],
    category: 'pothole',
    description: 'Deep road crater causing severe traffic slowdown and hazard near Kurla station.',
    photo_url: serializePhotoData(
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      undefined,
      undefined
    ),
    lat: 19.066,
    lng: 72.882,
    status: 'Reported' as IssueStatus,
    priority: 'Critical' as IssuePriority,
    suggested_priority: 'Critical' as IssuePriority,
    suggested_reason: 'base category pothole, mentions deep, accident hazard',
    department_id: 'Roads',
    report_count: 3,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    history: [
      { status: 'Reported' as IssueStatus, changed_by: USER_ID_MAP['citizen1'], changed_at: new Date(Date.now() - 3 * 86400000).toISOString() }
    ]
  },
  {
    id: 'ISSUE-1002',
    user_id: USER_ID_MAP['citizen2'],
    category: 'pothole',
    description: 'Cluster of asphalt cracks and potholes on Dadar TT circle.',
    photo_url: serializePhotoData(
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
      undefined,
      undefined
    ),
    lat: 19.019,
    lng: 72.842,
    status: 'Assigned' as IssueStatus,
    priority: 'High' as IssuePriority,
    suggested_priority: 'High' as IssuePriority,
    suggested_reason: 'base category pothole, major intersection',
    department_id: 'Roads',
    report_count: 1,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    history: [
      { status: 'Reported' as IssueStatus, changed_by: USER_ID_MAP['citizen2'], changed_at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { status: 'Assigned' as IssueStatus, changed_by: USER_ID_MAP['admin'], changed_at: new Date(Date.now() - 4 * 86400000).toISOString() }
    ]
  },
  {
    id: 'ISSUE-1003',
    user_id: USER_ID_MAP['citizen1'],
    category: 'water leak',
    description: 'Pipeline burst leaking potable water onto Bandra Linking Road.',
    photo_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    lat: 19.054,
    lng: 72.833,
    status: 'In Progress' as IssueStatus,
    priority: 'High' as IssuePriority,
    suggested_priority: 'High' as IssuePriority,
    suggested_reason: 'base category water leak, mentions flood hazard',
    department_id: 'Water',
    report_count: 2,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    history: [
      { status: 'Reported' as IssueStatus, changed_by: USER_ID_MAP['citizen1'], changed_at: new Date(Date.now() - 7 * 86400000).toISOString() },
      { status: 'Assigned' as IssueStatus, changed_by: USER_ID_MAP['admin'], changed_at: new Date(Date.now() - 6 * 86400000).toISOString() },
      { status: 'In Progress' as IssueStatus, changed_by: USER_ID_MAP['worker1'], changed_at: new Date(Date.now() - 2 * 86400000).toISOString() }
    ]
  },
  {
    id: 'ISSUE-1004',
    user_id: USER_ID_MAP['citizen1'],
    category: 'pothole',
    description: 'Dangerous pothole repaired and resurfaced on JVLR near Powai.',
    photo_url: serializePhotoData(
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      undefined,
      'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=800&q=80'
    ),
    lat: 19.121,
    lng: 72.908,
    status: 'Resolved' as IssueStatus,
    priority: 'Medium' as IssuePriority,
    suggested_priority: 'Medium' as IssuePriority,
    suggested_reason: 'base category pothole',
    department_id: 'Roads',
    report_count: 1,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    history: [
      { status: 'Reported' as IssueStatus, changed_by: USER_ID_MAP['citizen1'], changed_at: new Date(Date.now() - 10 * 86400000).toISOString() },
      { status: 'Assigned' as IssueStatus, changed_by: USER_ID_MAP['admin'], changed_at: new Date(Date.now() - 8 * 86400000).toISOString() },
      { status: 'In Progress' as IssueStatus, changed_by: USER_ID_MAP['worker1'], changed_at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { status: 'Resolved' as IssueStatus, changed_by: USER_ID_MAP['admin'], changed_at: new Date(Date.now() - 1 * 86400000).toISOString() }
    ]
  },
  {
    id: 'ISSUE-1005',
    user_id: USER_ID_MAP['citizen2'],
    category: 'drainage',
    description: 'Blocked stormwater drain overflowing near school entrance.',
    photo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    lat: 19.062,
    lng: 72.875,
    status: 'Reported' as IssueStatus,
    priority: 'Critical' as IssuePriority,
    suggested_priority: 'Critical' as IssuePriority,
    suggested_reason: 'base category drainage, mentions school, flood',
    department_id: 'Drainage',
    report_count: 1,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    history: [
      { status: 'Reported' as IssueStatus, changed_by: USER_ID_MAP['citizen2'], changed_at: new Date(Date.now() - 1 * 86400000).toISOString() }
    ]
  }
];

export async function seedSupabaseIfEmpty(): Promise<void> {
  try {
    const { count, error } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('Could not check issue count in Supabase:', error);
      return;
    }

    if (count === 0) {
      console.log('🌱 Seeding initial issues into Supabase...');

      for (const item of seedIssues) {
        const { history, ...issueRow } = item;
        const { error: insErr } = await supabase.from('issues').insert(issueRow);
        if (insErr) {
          console.warn('Failed to seed issue:', item.id, insErr);
          continue;
        }

        for (const h of history) {
          await supabase.from('issue_history').insert({
            issue_id: item.id,
            status: h.status,
            changed_by: h.changed_by,
            changed_at: h.changed_at,
          });
        }
      }

      console.log('✅ Supabase database seeded successfully!');
    }
  } catch (err) {
    console.warn('Error during Supabase seeding:', err);
  }
}
