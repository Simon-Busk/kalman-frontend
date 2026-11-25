// ── Request models ────────────────────────────────────────────────────────────

export interface MultivariateInitRequest {
  initialState: number[];
  processNoise?: number[][];
  measurementNoise: number[][];
  stateTransition?: number[][];
  observationModel?: number[][];
  initialUncertainty?: number[][];
}

export interface MultivariateMeasurementRequest {
  measurement: number[];
}

// ── Response models ───────────────────────────────────────────────────────────

export interface MultivariateFilterState {
  step: number;
  estimate: number[];
  uncertainty: number[][];
  kalmanGain: number[][];
}

export interface MultivariateStepResult {
  step: number;
  measurement: number[];
  estimate: number[];
  uncertainty: number[][];
  kalmanGain: number[][];
}
