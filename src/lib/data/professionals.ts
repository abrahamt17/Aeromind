import "server-only";
import { asUser } from "@/lib/db";
import type { VerificationStatus } from "@/lib/labels";

export type Professional = {
  user_id: string;
  display_name: string;
  headline: string;
  bio: string;
  qualifications: string[];
  specialties: string[];
  languages: string[];
  consultation_formats: string[];
  country: string | null;
  years_experience: number | null;
  accepting_requests: boolean;
  published: boolean;
  is_sample: boolean;
  verification_status: VerificationStatus;
  onboarding_completed_at: Date | null;
};

export async function listProfessionals(filters: {
  query: string;
  language: string;
  specialty: string;
}): Promise<{ professionals: Professional[]; languages: string[]; specialties: string[] }> {
  const all = await asUser(null, (tx) =>
    tx.rows<Professional>(
      `select * from public.psychologist_profiles
       where published
       order by accepting_requests desc, display_name`,
    ),
  );

  const query = filters.query.trim().toLowerCase();
  const professionals = all.filter((professional) => {
    const searchable = [
      professional.display_name,
      professional.headline,
      professional.country ?? "",
      ...professional.specialties,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (!filters.language || professional.languages.includes(filters.language)) &&
      (!filters.specialty || professional.specialties.includes(filters.specialty))
    );
  });

  return {
    professionals,
    languages: [...new Set(all.flatMap((professional) => professional.languages))].sort(),
    specialties: [...new Set(all.flatMap((professional) => professional.specialties))].sort(),
  };
}

export async function getProfessional(id: string): Promise<Professional | null> {
  return asUser(null, (tx) =>
    tx.one<Professional>(
      "select * from public.psychologist_profiles where user_id = $1 and published",
      [id],
    ),
  );
}

export async function getOwnProfessionalProfile(userId: string): Promise<Professional | null> {
  return asUser(userId, (tx) =>
    tx.one<Professional>("select * from public.psychologist_profiles where user_id = $1", [userId]),
  );
}
