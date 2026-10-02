import { useState, useEffect } from 'react';

export type Role = 'citizen1' | 'citizen2' | 'admin';

export function useAuth() {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('role') as Role) || 'citizen1';
  });

  useEffect(() => {
    localStorage.setItem('role', role);
  }, [role]);

  return { role, setRole };
}
