export interface UserProfile {
  id: string;
  email: string;
  name: string;
  userType: 'soloist' | 'pianist';
  createdAt: string;
}
