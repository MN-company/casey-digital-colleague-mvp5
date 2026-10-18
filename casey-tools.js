/* Casey 6.0 tool dispatcher: Live and Standard share the verified Casey backend.
 * The browser only routes known tool names; the Supabase backend revalidates session,
 * student identity, slot availability and the eventual explicit confirmation.
 */
(() => {
  'use strict';
  const handlers = Object.freeze({
    find_available_slots: 'liveFindSlots',
    prepare_booking: 'livePrepareBooking',
    get_booking_status: 'liveBookingStatus',
    search_verified_knowledge: 'liveSearchKnowledge'
  });
  async function execute(name, args) {
    if (!Object.hasOwn(handlers, name)) return {status:'unsupported_tool'};
    const method = handlers[name];
    if (!window.CaseyBridge?.[method]) return {status:'bridge_not_ready'};
    try {
      const data = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
      if (name === 'prepare_booking') return await window.CaseyBridge[method](data.slot_id);
      if (name === 'get_booking_status') return await window.CaseyBridge[method](data.request_id);
      if (name === 'search_verified_knowledge') return await window.CaseyBridge[method](data.query);
      return await window.CaseyBridge[method](data);
    } catch (error) {
      const http = Number(error?.status||0);
      return {status: http===401||http===403 ? 'authentication_required' : http===409 ? 'slot_unavailable' : 'tool_unavailable'};
    }
  }
  window.CaseyTools = Object.freeze({execute, names:Object.keys(handlers)});
})();
