export interface User {
  id?: number;
  name: string;
  email?: string;
  roleId?: number;
  roleName?: string;
  status?: 'active' | 'inactive';
  avatarUrl?: string;
}