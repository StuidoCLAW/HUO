/**
 * Client-side game state.
 *
 * Mirrors the server state machine exactly. The client only ever knows what
 * the server has revealed — dealer hole and unrevealed board cards stay null
 * until state === 'RESOLVED'.
 */

export function initialState() {
  return {
    phase: 'BETTING',           // BETTING | PREFLOP | FLOP | RIVER | RESOLVED
    sessionId: null,
    balance: 500,
    stakes: { ante: 0, blind: 0, trips: 0 },
    playerHole: null,           // number[4] | null
    dealerHole: null,           // number[4] | null — only at RESOLVED
    flop: null,                 // number[3] | null
    turn: null,                 // number[1] | null
    river: null,                // number[1] | null
    raisedStreet: null,         // 'preflop'|'flop'|'river'|null
    playMultiplier: 0,
    folded: false,
    resolution: null,           // full resolve payload
    lastError: null,
  };
}

export function applyStartResponse(state, payload, stakes) {
  return {
    ...state,
    phase: payload.state,
    sessionId: payload.sessionId,
    stakes: { ...stakes },
    playerHole: payload.playerHole,
    dealerHole: null,
    flop: null, turn: null, river: null,
    raisedStreet: null, playMultiplier: 0, folded: false, resolution: null,
  };
}

export function applyFlopReveal(state, payload) {
  return { ...state, phase: 'FLOP', flop: payload.flop };
}

export function applyRiverReveal(state, payload) {
  return { ...state, phase: 'RIVER', turn: payload.turn, river: payload.river };
}

export function applyResolution(state, payload) {
  const flop = payload.board.slice(0, 3);
  const turn = payload.board.slice(3, 4);
  const river = payload.board.slice(4, 5);
  return {
    ...state,
    phase: 'RESOLVED',
    dealerHole: payload.dealerHole,
    flop, turn, river,
    raisedStreet: payload.raisedStreet,
    playMultiplier: payload.playMultiplier,
    folded: payload.folded,
    resolution: payload,
  };
}

export function applyReconnect(state, payload) {
  const next = {
    ...state,
    sessionId: payload.sessionId,
    phase: payload.state,
    stakes: {
      ante: payload.anteStake,
      blind: payload.blindStake,
      trips: payload.tripsStake ?? 0,
    },
    playerHole: payload.playerHole ?? null,
    flop: payload.flop ?? null,
    turn: payload.turn ?? null,
    river: payload.river ?? null,
    dealerHole: null,
    resolution: null,
  };
  if (payload.state === 'RESOLVED') return applyResolution(next, payload);
  return next;
}

export function applyNewHand(balance) {
  const s = initialState();
  s.balance = balance;
  return s;
}

export function creditResolution(state, resolution) {
  const gain = resolution.totalReturn;
  return { ...state, balance: state.balance + gain };
}
