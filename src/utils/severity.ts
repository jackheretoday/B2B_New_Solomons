import { IssuePriority } from '../api/types';

export function calculateSeverity(category: string, description: string): { suggested_priority: IssuePriority, suggested_reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const text = description.toLowerCase();
  
  const keywords: Record<string, number> = {
    accident: 3,
    deep: 1,
    flood: 2,
    school: 2,
    children: 2,
    hospital: 2,
    'live wire': 3,
    open: 1
  };

  const categoryBase: Record<string, number> = {
    pothole: 1,
    streetlight: 1,
    'water leak': 1,
    garbage: 1,
    drainage: 2,
    other: 1
  };

  score += categoryBase[category] || 1;
  reasons.push(`base category ${category}`);

  for (const [kw, weight] of Object.entries(keywords)) {
    if (text.includes(kw)) {
      score += weight;
      reasons.push(`mentions ${kw}`);
    }
  }

  let suggested_priority: IssuePriority = 'Low';
  if (score >= 4) suggested_priority = 'Critical';
  else if (score === 3) suggested_priority = 'High';
  else if (score === 2) suggested_priority = 'Medium';

  return { suggested_priority, suggested_reason: reasons.join(', ') };
}
