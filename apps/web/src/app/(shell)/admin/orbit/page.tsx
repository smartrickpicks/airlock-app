"use client";

import { useEffect } from "react";
import { useOrbitStore } from "@/stores/orbit.store";
import { orbitApi } from "@/lib/orbit-api";
import OrbitConsole from "@/components/organisms/OrbitConsole";

export default function OrbitAdminPage() {
  const { profile, isLoading, error, setProfile, setLoading, setError } =
    useOrbitStore();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await orbitApi.getMyOrbit();
        setProfile(data);
      } catch {
        // 404 means no orbit profile yet — show setup placeholder
        setProfile(null);
        setError("no_profile");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-muted text-sm">Loading your orbit...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orbit</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your public creator page — links, personas, and brand identity in one place.
          </p>
        </div>

        <div className="rounded-xl border border-surface-border border-dashed p-12 text-center space-y-4">
          <div className="text-4xl">🚀</div>
          <h2 className="text-lg font-semibold text-text-primary">
            You don&apos;t have an Orbit yet
          </h2>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Orbit is your public creator page. Set up a slug to claim your space and start building.
          </p>
          <p className="text-xs text-text-muted">
            Orbit setup is coming soon. Stay tuned.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <OrbitConsole />
    </div>
  );
}
