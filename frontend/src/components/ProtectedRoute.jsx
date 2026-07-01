import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — two-stage guard:
 *  1. Must be authenticated (redirects to /login if not).
 *  2. Must have a complete profile (job_role + experience_level).
 *     If profile is incomplete and the current path is NOT /onboarding,
 *     redirect to /onboarding.  Only /onboarding is exempt to avoid a loop.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="centered" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile completeness check — exempt /onboarding itself to avoid redirect loop
  const isOnboardingRoute = location.pathname === '/onboarding';
  const jobRole = user?.job_role || user?.jobRole || '';
  const expLevel = user?.experience_level || user?.experienceLevel || '';
  const profileComplete = jobRole.trim() !== '' && expLevel.trim() !== '';

  if (!profileComplete && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;
