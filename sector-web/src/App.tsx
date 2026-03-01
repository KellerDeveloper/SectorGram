import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MainLayout } from "./components/MainLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ChatList } from "./pages/ChatList";
import { ChatRoom } from "./pages/ChatRoom";
import { NewChat } from "./pages/NewChat";
import { Profile } from "./pages/Profile";
import { EventList } from "./pages/EventList";
import { EventNew } from "./pages/EventNew";
import { EventDetail } from "./pages/EventDetail";
import { Stories } from "./pages/Stories";
import { StoryView } from "./pages/StoryView";
import { StoryNew } from "./pages/StoryNew";
import "./index.css";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected />}>
        <Route element={<MainLayout />}>
          <Route index element={<ChatList />} />
          <Route path="chat/:id" element={<ChatRoom />} />
          <Route path="new-chat" element={<NewChat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/new" element={<EventNew />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="stories" element={<Stories />} />
          <Route path="stories/new" element={<StoryNew />} />
          <Route path="stories/:userId" element={<StoryView />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
