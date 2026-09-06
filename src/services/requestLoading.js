const pending = new Map();
const listeners = new Set();
let snapshot = [];

function publish() {
  snapshot = [...pending.values()];
  listeners.forEach((listener) => listener());
}

export function trackDataRequest(path, authorization) {
  const id = Symbol(path);
  pending.set(id, { path: path.split('?')[0], authorization });
  publish();
  return () => {
    pending.delete(id);
    publish();
  };
}

export function subscribeToRequests(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingRequests() {
  return snapshot;
}
