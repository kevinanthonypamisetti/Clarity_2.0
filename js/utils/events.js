const bus = new EventTarget();

export const EventBus = {
  on(type, handler) { bus.addEventListener(type, handler); },
  off(type, handler) { bus.removeEventListener(type, handler); },
  emit(type, detail = {}) { bus.dispatchEvent(new CustomEvent(type, { detail })); }
};

export default EventBus;
