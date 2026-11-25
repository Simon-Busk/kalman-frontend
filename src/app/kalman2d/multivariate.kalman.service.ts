import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MultivariateFilterState,
  MultivariateInitRequest,
  MultivariateMeasurementRequest,
  MultivariateStepResult,
} from './kalman2d.models';

@Injectable({ providedIn: 'root' })
export class MultivariateKalmanService {
  private readonly base = `http://localhost:8080/api/kalman/`;

  /** Options applied to every request – keeps the session cookie alive. */
  private readonly opts = { withCredentials: true };

  constructor(private http: HttpClient) {}

  /**
   * POST /api/kalman/multivariate/init
   * Initialise (or re-initialise) the filter for this browser session.
   */
  init(request: MultivariateInitRequest, id: string): Observable<MultivariateFilterState> {
    return this.http.post<MultivariateFilterState>(`${this.base}${id}/multivariate/init`, request, this.opts);
  }

  /**
   * POST /api/kalman/step
   * Feed one raw measurement and receive the updated estimate.
   */
  step(request: MultivariateMeasurementRequest, id: string): Observable<MultivariateStepResult> {
    return this.http.post<MultivariateStepResult>(
      `${this.base}${id}/multivariate/step`,
      request,
      this.opts,
    );
  }

  /**
   * GET /api/kalman/state
   * Peek at the current filter state without advancing it.
   * Useful for restoring UI state after a page refresh.
   */
  getState(id: string): Observable<MultivariateFilterState> {
    return this.http.get<MultivariateFilterState>(
      `${this.base}${id}/multivariate/state`,
      this.opts,
    );
  }

  /**
   * DELETE /api/kalman/reset
   * Wipe the filter so init() can be called again with new parameters.
   */
  reset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${id}/multivariate/reset`, this.opts);
  }
}
