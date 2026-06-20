const MODE = (typeof window !== "undefined" && window.storage) ? "cloud" : (() => {
  try {
    localStorage.setItem("_wc_t", "1");
    localStorage.removeItem("_wc_t");
    return "local";
  } catch (e) {
    return "mem";
  }
})();

const memCache = new Map();

export async function readKey(key) {
  try {
    if (MODE === "cloud") {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    }
    if (MODE === "local") {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    }
  } catch (e) {}
  return memCache.has(key) ? memCache.get(key) : null;
}

export async function writeKey(key, value) {
  memCache.set(key, value);
  try {
    if (MODE === "cloud") {
      await window.storage.set(key, JSON.stringify(value), false);
    } else if (MODE === "local") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {}
}

export function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
