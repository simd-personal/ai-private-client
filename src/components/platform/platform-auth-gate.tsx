"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_ADMIN_LOGOUT_EVENT,
  PLATFORM_ADMIN_SESSION_EXPIRED_EVENT,
  clearPlatformAdminToken,
  getPlatformAdminToken,
  setPlatformAdminToken,
} from "@/lib/platform-admin/session";

interface PlatformAuthGateProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PlatformAuthGate({
  title,
  description,
  children,
}: PlatformAuthGateProps) {
  const [inputPassword, setInputPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const verifyToken = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/tenants", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setAuthenticated(false);
        if (res.status === 401) {
          clearPlatformAdminToken();
          setError("Session expired. Please sign in again.");
        } else {
          setError("Invalid platform admin password or server error.");
        }
        return false;
      }

      setPlatformAdminToken(token);
      setAuthenticated(true);
      return true;
    } catch {
      setError("Failed to connect");
      setAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getPlatformAdminToken();
    if (!token) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- check stored token after mount
    setCheckingSession(true);
    void verifyToken(token).finally(() => {
      setCheckingSession(false);
    });
  }, [verifyToken]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAuthenticated(false);
      setError("Session expired. Please sign in again.");
    };

    const handleLogout = () => {
      setAuthenticated(false);
      setError(null);
      setInputPassword("");
    };

    window.addEventListener(
      PLATFORM_ADMIN_SESSION_EXPIRED_EVENT,
      handleSessionExpired
    );
    window.addEventListener(PLATFORM_ADMIN_LOGOUT_EVENT, handleLogout);

    return () => {
      window.removeEventListener(
        PLATFORM_ADMIN_SESSION_EXPIRED_EVENT,
        handleSessionExpired
      );
      window.removeEventListener(PLATFORM_ADMIN_LOGOUT_EVENT, handleLogout);
    };
  }, []);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    void verifyToken(inputPassword);
  };

  if (checkingSession) {
    return (
      <AuthShell>
        <p className="text-sm text-gray-500">Checking platform admin session...</p>
      </AuthShell>
    );
  }

  if (!authenticated) {
    return (
      <AuthShell>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-lg"
        >
          <h1 className="mb-2 font-serif text-2xl text-navy">{title}</h1>
          <p className="mb-6 text-sm text-gray-500">{description}</p>
          <Input
            type="password"
            placeholder="Platform admin password"
            value={inputPassword}
            onChange={(event) => setInputPassword(event.target.value)}
            className="mb-4"
          />
          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return <>{children}</>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige/30 px-6">
      {children}
    </div>
  );
}
