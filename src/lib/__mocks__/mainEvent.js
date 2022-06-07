let handlers = new Map();

const mainEvent = {
  on(event, handler) {
    handlers.set(event, handler);
  },
  emit(event, ...args) {
    if (typeof handlers.get(event) == "function") {
      handlers.get(event)(...args);
    } else {
      throw new Error(`register listener '${event}': 'mainEvent.on(${event})'`);
    }
  }
};

module.exports = mainEvent;
