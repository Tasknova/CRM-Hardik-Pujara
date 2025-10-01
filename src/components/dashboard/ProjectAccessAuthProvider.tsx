import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface ProjectAccessAuthProviderProps {
  children: React.ReactNode;
}

export const ProjectAccessAuthProvider: React.FC<ProjectAccessAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in via project access
    const session = localStorage.getItem('projectAccessSession');
    if (!session) {
      navigate('/project-access/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(session);
      setUser({
        id: parsedSession.entityId,
        name: parsedSession.entityName,
        email: parsedSession.entityEmail || '',
        role: 'external_user'
      });
    } catch (error) {
      console.error('Error parsing session:', error);
      navigate('/project-access/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};
