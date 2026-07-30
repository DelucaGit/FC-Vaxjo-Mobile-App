export type Role = 'ADMIN' | 'COACH' | 'PARENT' | 'PLAYER';

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
};

export type Team = {
  id: number;
  name: string;
  ageGroup: string | null;
  season: string | null;
  coaches: User[];
};

export type Player = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  jerseyNumber: number | null;
  teamId: number | null;
  teamName: string | null;
  userId: number | null;
  parents: User[];
};

export type AuthResponse = {
  token: string;
  tokenType: string;
  user: User;
};
