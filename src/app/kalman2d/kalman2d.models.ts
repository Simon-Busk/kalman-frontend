// ── Request models ────────────────────────────────────────────────────────────

export interface MultivariateInitRequest {
  firstMeasurement: number[];
  processNoise: number[][];
  measurementNoise: number[][];
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
