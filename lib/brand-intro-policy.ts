export function shouldPlayBrandIntro({
  alreadyPlayed,
  currentPath,
  originalNavigationUrl,
}: {
  alreadyPlayed: boolean;
  currentPath: string;
  originalNavigationUrl?: string;
}): boolean {
  if (alreadyPlayed) return false;
  if (!originalNavigationUrl) return currentPath === "/";

  try {
    return new URL(originalNavigationUrl).pathname === "/";
  } catch {
    return currentPath === "/";
  }
}
