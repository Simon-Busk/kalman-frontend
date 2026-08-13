import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FilterState,
  InitRequest,
  MeasurementRequest,
  StepResult,
  SimulationRequest,
} from './kalman.models';

/**
 * KalmanService
 *
 * Wraps all calls to the Spring Boot Kalman Filter REST API.
 *
 * Important: { withCredentials: true } is set on every request so the browser
 * sends the JSESSIONID cookie. Without it the server would create a new session
 * (and therefore a new filter) on every request.
 *
 * Usage example:
 *
 *   constructor(private kalman: KalmanService) {}
 *
 *   ngOnInit() {
 *     // Initialise once, seeded from the first measurement
 *     this.kalman.init({
 *       seedWithFirstMeasurement: true,
 *       firstMeasurement: 24.7,
 *       processNoise: 0.01,
 *       measurementNoise: 4.0,
 *     }).subscribe(state => console.log('Filter ready', state));
 *   }
 *
 *   onNewReading(value: number) {
 *     this.kalman.step({ measurement: value })
 *       .subscribe(result => console.log('Estimate:', result.estimate));
 *   }
 */
@Injectable({ providedIn: 'root' })
export class KalmanService {

  private readonly base = 'http://localhost:8080/api/kalman';

  /** Options applied to every request – keeps the session cookie alive. */
  private readonly opts = { withCredentials: true };

  constructor(private http: HttpClient) {}

  /**
   * POST /api/kalman/init
   * Initialise (or re-initialise) the filter for this browser session.
   */
  init(request: InitRequest): Observable<FilterState> {
    return this.http.post<FilterState>(`${this.base}/init`, request, this.opts);
  }

  /**
   * POST /api/kalman/step
   * Feed one raw measurement and receive the updated estimate.
   */
  step(request: MeasurementRequest): Observable<StepResult> {
    return this.http.post<StepResult>(`${this.base}/step`, request, this.opts);
  }

  /**
   * GET /api/kalman/state
   * Peek at the current filter state without advancing it.
   * Useful for restoring UI state after a page refresh.
   */
  getState(): Observable<FilterState> {
    return this.http.get<FilterState>(`${this.base}/state`, this.opts);
  }

  /**
   * DELETE /api/kalman/reset
   * Wipe the filter so init() can be called again with new parameters.
   */
  reset(): Observable<void> {
    return this.http.delete<void>(`${this.base}/reset`, this.opts);
  }

  /**
   * SIMULATION /api/kalman/simulation
   * Simulate measurements and calculate kalman filter from the simulation
   */
  simulation(request: SimulationRequest): Observable<StepResult[]> {
    return this.http.post<StepResult[]>(`${this.base}/simulation`, request, this.opts);
  }
}
