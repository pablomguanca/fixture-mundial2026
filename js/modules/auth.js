export const STORAGE_KEYS = {
  PROFILE: "wc2026:profile"
};

export const GOOGLE_CLIENT_ID = "334140254771-055i4rboumeva01lrqeu7h0rj1rdn3dk.apps.googleusercontent.com";

export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch { }
}

export function clearProfile() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  } catch { }
}

export function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join("");
}

export function slugify(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "invitado"
  );
}

function decodeJwt(token) {
  const payload = token.split(".")[1];

  const json = decodeURIComponent(
    atob(
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
    )
      .split("")
      .map(char =>
        "%" + char.charCodeAt(0).toString(16).padStart(2, "0")
      )
      .join("")
  );

  return JSON.parse(json);
}

export function googleConfigured() {
  return !GOOGLE_CLIENT_ID.startsWith("TU_");
}

export function renderGoogleButton(container, onSignedIn) {
  if (!googleConfigured()) return false;

  const script = document.createElement("script");

  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;

  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: response => {
        const data = decodeJwt(response.credential);

        const profile = {
          id: `google:${data.sub}`,
          name: data.name,
          picture: data.picture,
          provider: "google"
        };

        setProfile(profile);
        onSignedIn(profile);
      }
    });

    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 240
    });
  };

  document.head.appendChild(script);

  return true;
}

export function signInAsGuest(name) {
  const clean = name.trim() || "Invitado";

  const profile = {
    id: `guest:${slugify(clean)}`,
    name: clean,
    picture: null,
    provider: "guest"
  };

  setProfile(profile);

  return profile;
}