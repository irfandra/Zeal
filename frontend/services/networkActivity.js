let activeRequests = 0;

const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(activeRequests);
    } catch (_error) {

    }
  });
};

export const beginNetworkActivity = () => {
  activeRequests += 1;
  notifyListeners();
};

export const endNetworkActivity = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  notifyListeners();
};

export const getActiveNetworkRequests = () => activeRequests;

export const subscribeNetworkActivity = (listener) => {
  listeners.add(listener);
  listener(activeRequests);

  return () => {
    listeners.delete(listener);
  };
};
