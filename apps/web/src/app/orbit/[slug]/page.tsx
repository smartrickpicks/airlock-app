import { orbitApi } from "@/lib/orbit-api";
import OrbitPage from "@/components/organisms/OrbitPage";

interface OrbitSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrbitSlugPage({ params }: OrbitSlugPageProps) {
  const { slug } = await params;

  let profile;
  try {
    profile = await orbitApi.getOrbitPage(slug);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-3">
          <p className="text-white/40 text-lg">This orbit doesn&apos;t exist yet.</p>
          <p className="text-white/20 text-sm">Check the URL and try again.</p>
        </div>
      </div>
    );
  }

  if (!profile.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-3">
          <p className="text-white/40 text-lg">This orbit is not published yet.</p>
          <p className="text-white/20 text-sm">Check back soon.</p>
        </div>
      </div>
    );
  }

  return <OrbitPage profile={profile} />;
}
