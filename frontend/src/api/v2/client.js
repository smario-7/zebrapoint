import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatDetail(detail) {
  if (detail == null) return "Błąd serwera";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (typeof e === "object" && e?.msg ? e.msg : JSON.stringify(e))).join("; ");
  }
  if (typeof detail === "object" && detail.message) return detail.message;
  try {
    return JSON.stringify(detail);
  } catch {
    return "Błąd serwera";
  }
}

async function request(method, path, body = null) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body != null) opts.body = JSON.stringify(body);

  let res = await fetch(`${BASE_URL}${path}`, opts);

  if (res.status === 401) {
    const refreshRes = await fetch(`${BASE_URL}/api/v2/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshRes.ok) {
      window.dispatchEvent(new CustomEvent("zp:unauthorized"));
      const err = await refreshRes.json().catch(() => ({}));
      throw new Error(formatDetail(err.detail) || "Sesja wygasła");
    }
    res = await fetch(`${BASE_URL}${path}`, opts);
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("zp:unauthorized"));
      throw new Error("Sesja wygasła — zaloguj się ponownie");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = formatDetail(err.detail);
    if (res.status !== 401) {
      toast.error(msg);
    }
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
};
