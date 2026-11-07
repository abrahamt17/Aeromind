type Role = "trainee" | "psychologist" | "admin";

export const SESSION_COOKIE = "aeromind_session";

/** Admin work happens through scripts in the MVP, so admins have no portal. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "trainee":
      return "/trainee/dashboard";
    case "psychologist":
      return "/psychologist/dashboard";
    case "admin":
      return "/";
  }
}
