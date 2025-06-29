import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isLoggingOut: boolean;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'client';
    company?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  sessionExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const initialMockUsers: User[] = [];

function getStoredUsers(): User[] {
  const stored = localStorage.getItem('todaarte_users');
  let users: User[] = stored ? JSON.parse(stored) : [];
  // Garante que todos os mockados estejam presentes
  initialMockUsers.forEach(mockUser => {
    if (!users.some(u => u.email === mockUser.email)) {
      users.push(mockUser);
    }
  });
  return users;
}
function setStoredUsers(users: User[]) {
  localStorage.setItem('todaarte_users', JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(getStoredUsers());
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Tempo de expiração da sessão em ms (30 minutos)
  const SESSION_DURATION = 30 * 60 * 1000;

  // Checa sessão ao carregar
  useEffect(() => {
    const storedUser = localStorage.getItem('todaarte_user');
    const storedExpires = localStorage.getItem('todaarte_expires');
    if (storedUser && storedExpires) {
      const expires = parseInt(storedExpires, 10);
      if (Date.now() < expires) {
      setUser(JSON.parse(storedUser));
        setSessionExpiresAt(expires);
        // Agenda logout automático
        scheduleAutoLogout(expires - Date.now());
      } else {
        handleLogout();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setStoredUsers(users);
  }, [users]);

  // Função para agendar logout automático
  let logoutTimeout: ReturnType<typeof setTimeout> | null = null;
  function scheduleAutoLogout(ms: number) {
    if (logoutTimeout) clearTimeout(logoutTimeout);
    logoutTimeout = setTimeout(() => {
      handleLogout();
    }, ms);
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_API_URL não está definida. Verifique seu arquivo .env.production e o processo de build.');
  }

  // Atualiza expiração ao logar
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        setIsLoading(false);
        return false;
      }
      const data = await response.json();
      setUser(data.user);
      const expires = Date.now() + SESSION_DURATION;
      setSessionExpiresAt(expires);
      localStorage.setItem('todaarte_user', JSON.stringify(data.user));
      localStorage.setItem('todaarte_expires', expires.toString());
      scheduleAutoLogout(SESSION_DURATION);
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  };

  // Atualiza expiração ao registrar
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'client';
    company?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const exists = users.some(u => u.email === data.email);
    if (exists) {
      setIsLoading(false);
      return { success: false, message: 'E-mail já cadastrado.' };
    }
    const newUser: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name),
      ...(data.role === 'client' ? { company: data.company } : {})
    };
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    const expires = Date.now() + SESSION_DURATION;
    setSessionExpiresAt(expires);
    localStorage.setItem('todaarte_user', JSON.stringify(newUser));
    localStorage.setItem('todaarte_expires', expires.toString());
    scheduleAutoLogout(SESSION_DURATION);
    setIsLoading(false);
    return { success: true };
  };

  // Logout manual ou automático
  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setUser(null);
      setSessionExpiresAt(null);
      localStorage.removeItem('todaarte_user');
      localStorage.removeItem('todaarte_expires');
      if (logoutTimeout) clearTimeout(logoutTimeout);
      setIsLoggingOut(false);
    }, 1200); // 1.2s para mostrar feedback visual
  };

  const logout = () => {
    handleLogout();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, isLoading, isLoggingOut, register, sessionExpiresAt }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}