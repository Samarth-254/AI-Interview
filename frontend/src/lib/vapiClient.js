import Vapi from '@vapi-ai/web';

let vapiInstance = null;

// Store named listener references so we can remove them later.
// vapiInstance.off(event, handler) requires the exact same function reference.
const listeners = {};

/**
 * vapiClient — thin wrapper around @vapi-ai/web SDK.
 * All Vapi browser interactions go through this module.
 */
export const vapiClient = {
  init(publicKey) {
    if (!vapiInstance) {
      vapiInstance = new Vapi(publicKey);
    }
    return vapiInstance;
  },

  getInstance() {
    return vapiInstance;
  },

  /**
   * Start a web call using an assistantId (string) returned from the backend.
   * vapi.start() accepts: assistantId string | inline assistant config object
   */
  async startCall(assistant) {
    if (!vapiInstance) throw new Error('Vapi not initialized. Call vapiClient.init(publicKey) first.');
    return vapiInstance.start(assistant);
  },

  async stopCall() {
    if (!vapiInstance) return;
    return vapiInstance.stop();
  },

  setMuted(muted) {
    if (!vapiInstance) return;
    vapiInstance.setMuted(muted);
  },

  isMuted() {
    if (!vapiInstance) return false;
    return vapiInstance.isMuted();
  },

  /**
   * Register a named event listener.
   * Stores the handler reference so off() can cleanly remove it.
   */
  on(event, handler) {
    if (!vapiInstance || typeof handler !== 'function') return;
    // Remove any existing listener for this event before adding a new one
    if (listeners[event]) {
      vapiInstance.off(event, listeners[event]);
    }
    listeners[event] = handler;
    vapiInstance.on(event, handler);
  },

  /**
   * Remove a named event listener using the stored reference.
   * Safe to call even if no listener was registered.
   */
  off(event) {
    if (!vapiInstance) return;
    const handler = listeners[event];
    if (handler) {
      vapiInstance.off(event, handler);
      delete listeners[event];
    }
  },

  /**
   * Remove all registered listeners (call on unmount).
   */
  offAll() {
    if (!vapiInstance) return;
    Object.entries(listeners).forEach(([event, handler]) => {
      vapiInstance.off(event, handler);
    });
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  },
};
