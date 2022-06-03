let handlers = new Map();

const mainEvent = {
  on(event, handler) {
    handlers.set(event, handler);
  },
  emit(event) {
    handlers.get(event)();
  }
};

module.exports = mainEvent;
