import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  tel?: string;
  display_name: string;
  points: number;
  total_spent: number;
  vip_level: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Try to load user from localStorage
    const savedUser = localStorage.getItem('gs_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        
        // Background fetch to update user data
        fetch(`/api/auth/me?username=${parsed.username}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setUser(data.user);
              localStorage.setItem('gs_user', JSON.stringify(data.user));
            } else {
              logout();
            }
          })
          .catch(console.error);
      } catch (e) {
        localStorage.removeItem('gs_user');
      }
    }
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('gs_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('gs_user');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gs_user');
  };

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
