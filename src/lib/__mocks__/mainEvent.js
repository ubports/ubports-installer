let handlers = new Map();

const mainEvent = {
  on(event, handler) {
    handlers.set(event, handler);
  },
  emit(event, ...args) {
    if (typeof handlers.get(event) != "function")
      throw new Error(`register listener '${event}': 'mainEvent.on(${event})'`);
    handlers.get(event)(...args);
  }
};

module.exports = mainEvent;
