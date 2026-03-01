import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <ChatList />
          </Protected>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <Protected>
            <ChatRoom />
          </Protected>
        }
      />
      <Route
        path="/new-chat"
        element={
          <Protected>
            <NewChat />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />
      <Route
        path="/events"
        element={
          <Protected>
            <EventList />
          </Protected>
        }
      />
      <Route
        path="/events/new"
        element={
          <Protected>
            <EventNew />
          </Protected>
        }
      />
      <Route
        path="/events/:id"
        element={
          <Protected>
            <EventDetail />
          </Protected>
        }
      />
      <Route
        path="/stories"
        element={
          <Protected>
            <Stories />
          </Protected>
        }
      />
      <Route
        path="/stories/new"
        element={
          <Protected>
            <StoryNew />
          </Protected>
        }
      />
      <Route
        path="/stories/:userId"
        element={
          <Protected>
            <StoryView />
          </Protected>
        }
      />
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
