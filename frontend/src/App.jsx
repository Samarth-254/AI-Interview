import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import InterviewTypeSelectPage from './pages/InterviewTypeSelectPage';
import InterviewSessionPage from './pages/InterviewSessionPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackReportPage from './pages/FeedbackReportPage';
import ProfilePage from './pages/ProfilePage';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

/**
 * PublicOnlyRoute — inverse of ProtectedRoute.
 * If the user already has a valid JWT, skip the auth page and go straight
 * to the dashboard. This prevents authenticated users from accidentally
 * landing on /login or /signup again.
 */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="centered" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public-only routes — redirect to dashboard if already logged in */}
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

          {/* Protected routes */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/interview/select" element={<ProtectedRoute><InterviewTypeSelectPage /></ProtectedRoute>} />
          <Route path="/interview/session" element={<ProtectedRoute><InterviewSessionPage /></ProtectedRoute>} />
          <Route path="/feedback/:sessionId" element={<ProtectedRoute><FeedbackReportPage /></ProtectedRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
