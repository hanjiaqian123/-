import type { WeatherSceneId } from '../../theme/weatherScenes';

export const SKY_TRANSITION_DURATION = 1000;
type Slot = 0 | 1;

export type SkyTransition = {
  readonly scenes: readonly [WeatherSceneId, WeatherSceneId];
  readonly front: Slot;
  readonly incoming: Slot | null;
  readonly pending: WeatherSceneId | null;
  readonly revision: number;
};

type Action =
  | { type: 'request'; scene: WeatherSceneId; animate: boolean }
  | { type: 'finished'; revision: number };

export function createSkyTransition(scene: WeatherSceneId): SkyTransition {
  return { scenes: [scene, scene], front: 0, incoming: null, pending: null, revision: 0 };
}

function startTransition(state: SkyTransition, scene: WeatherSceneId): SkyTransition {
  if (state.scenes[state.front] === scene) return state;
  const incoming = state.front === 0 ? 1 : 0;
  const scenes: [WeatherSceneId, WeatherSceneId] = [...state.scenes];
  scenes[incoming] = scene; // Only recolor the hidden slot.
  return { ...state, scenes, incoming, pending: null, revision: state.revision + 1 };
}

/** Two permanent slots, one latest pending scene; never an unbounded animation queue. */
export function skyTransitionReducer(state: SkyTransition, action: Action): SkyTransition {
  if (action.type === 'request') {
    if (!action.animate) {
      if (state.incoming === null && state.scenes[state.front] === action.scene) return state;
      return { ...createSkyTransition(action.scene), revision: state.revision + 1 };
    }
    if (state.incoming !== null) {
      const pending = state.scenes[state.incoming] === action.scene ? null : action.scene;
      return pending === state.pending ? state : { ...state, pending };
    }
    return startTransition(state, action.scene);
  }

  // A completion already queued on the JS thread may arrive after cancellation.
  if (action.revision !== state.revision || state.incoming === null) return state;
  const settled = { ...state, front: state.incoming, incoming: null, pending: null };
  return state.pending === null ? settled : startTransition(settled, state.pending);
}
