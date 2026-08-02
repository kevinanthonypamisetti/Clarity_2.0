const EventEmitter = require('events');

class ServerEventBus extends EventEmitter {}

const bus = new ServerEventBus();

// helper for structured emits
bus.emitDebug = function (payload) {
  try { this.emit('clarity:debug', payload); } catch (e) { /* ignore */ }
};

bus.emitError = function (payload) {
  try { this.emit('clarity:error', payload); } catch (e) { /* ignore */ }
};

module.exports = bus;
