// ── Request models ────────────────────────────────────────────────────────────

export interface InitRequest {
  seedWithFirstMeasurement: boolean;

  /** Used when seedWithFirstMeasurement = true */
  firstMeasurement?: number;

  /** Used when seedWithFirstMeasurement = false */
  initialEstimate?: number;
  initialUncertainty?: number;

  processNoise: number;
  measurementNoise: number;
}

export interface MeasurementRequest {
  measurement: number;
}

export interface SimulationRequest {
  numberOfMeasurements: number;
  variance: number;
  mean: number;
}

// ── Response models ───────────────────────────────────────────────────────────

export interface FilterState {
  step: number;
  estimate: number;
  uncertainty: number;
  kalmanGain: number;
}

export interface StepResult {
  step: number;
  measurement: number;
  estimate: number;
  uncertainty: number;
  kalmanGain: number;
}
