const STORAGE_KEY = "uf_editor_onboarding_hidden_v1";

export function shouldOpenEditorOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function hideEditorOnboardingForever() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // localStorage can be unavailable in private/restricted contexts.
  }
}
