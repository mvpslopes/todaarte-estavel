export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client' | 'user';
  avatar?: string;
  company?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'review' | 'approved' | 'completed';
  clientId: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  budget?: number;
  deadline?: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'client';
  message: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  featured: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  price?: string;
}

export interface Financial {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  status: 'pending' | 'paid' | 'overdue';
  projectId?: string;
}