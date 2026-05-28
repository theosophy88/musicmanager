import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import FileManager from "./pages/FileManager";
import Sources from "./pages/Sources";
import Settings from "./pages/Settings";
import Library from "./pages/Library";
import History from "./pages/History";
import Admin from "./pages/Admin";
import LoginPage from "./pages/Login";
import { C } from "./theme";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function FullScreenSpinner() {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `2px solid rgba(255,106,61,0.3)`,
        borderTopColor: "#ff6a3d",
        animation: "mm-spin .8s linear infinite",
      }} />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/sources"   element={<RequireAuth><Sources /></RequireAuth>} />
      <Route path="/library"   element={<RequireAuth><Library /></RequireAuth>} />
      <Route path="/files"     element={<RequireAuth><FileManager /></RequireAuth>} />
      <Route path="/history"   element={<RequireAuth><History /></RequireAuth>} />
      <Route path="/admin"     element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="/settings"  element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
      <Route path="*"          element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
