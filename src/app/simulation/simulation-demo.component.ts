import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KalmanService } from '../kalman/kalman.service';
import { StepResult } from '../kalman/kalman.models';
import { RouterLink } from '@angular/router';


/**
 * KalmanDemoComponent
 *
 * A minimal example component showing the full flow:
 *   1. Configure and initialise the filter (seeded from the first measurement)
 *   2. Feed measurements one at a time
 *   3. Display a live table of measurement vs. estimate
 *   4. Reset and start over
 *
 * Add to your app:
 *   - Import KalmanDemoComponent in your AppComponent / standalone bootstrap
 *   - Add <app-kalman-demo> to a template
 *   - Ensure HttpClientModule (or provideHttpClient()) is in your app config
 */
@Component({
  selector: 'app-simulation-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="simulation-demo">
      <h2>Kalman Filter – Simulation Demo</h2>

      <!-- ── Configuration ───────────────────────────────────────────── -->
      <section *ngIf="!initialised">
        <h3>1. Configuration</h3>

        <label>
          Number of simulated measurements
          <input type="number" [(ngModel)]="numberOfSimulations" step="1" min="1" />
        </label>

        <label>
          Variance of the simulated measurements
          <input type="number" [(ngModel)]="variance" step="0.1" min="0.1" />
        </label>

        <label>
          Mean of the simulated measurements
          <input type="number" [(ngModel)]="mean" step="1" />
        </label>

        <button (click)="initialise()" [disabled]="loading()">
          {{ loading() ? 'Simulating…' : 'Simulate data' }}
        </button>

        <br />
        <button routerLink="/kalman">Go to Kalman demo</button>

        <p>
          Use this to go back to the main Kalman demo where you can add 1 measurement at a time.
        </p>
      </section>

      <!-- ── Step input ───────────────────────────────────────────────── -->
      <section *ngIf="initialised">
        <h3>2. Results</h3>

        <div class="step-input">
          <button (click)="resetFilter()" class="reset">Reset simulation</button>
        </div>

        <!-- Results table -->
        <table *ngIf="history().length > 0">
          <thead>
            <tr>
              <th>Step</th>
              <th>Measurement z</th>
              <th>KF Estimate x̂</th>
              <th>Uncertainty P</th>
              <th>Kalman Gain K</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of history()">
              <td>{{ r.step }}</td>
              <td>{{ r.measurement | number: '1.4-4' }}</td>
              <td>{{ r.estimate | number: '1.4-4' }}</td>
              <td>{{ r.uncertainty | number: '1.6-6' }}</td>
              <td>{{ r.kalmanGain | number: '1.4-4' }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Visual table -->
        <ng-container *ngIf="history().length > 0">
          <h3 class="scale-heading">Position on scale</h3>
          <p class="scale-subtext">
            True value: {{ trueValue }} &nbsp;|&nbsp; Scale: {{ scaleMin() | number: '1.2-2' }} –
            {{ scaleMax() | number: '1.2-2' }}
          </p>

          <table>
            <thead>
              <tr>
                <th class="col-left">Step</th>
                <th class="col-left col-scale">Scale</th>
                <th>|z − true|</th>
                <th>|x&#x302; − true|</th>
                <th>KF better by</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of history()">
                <td class="col-left">{{ r.step }}</td>
                <td class="col-left">
                  <div class="scale-bar">
                    <!-- true value: grey anchor -->
                    <div class="marker marker-true" [style.left.%]="toPercent(trueValue)"></div>
                    <!-- raw measurement: blue -->
                    <div class="marker marker-meas" [style.left.%]="toPercent(r.measurement)"></div>
                    <!-- KF estimate: green -->
                    <div class="marker marker-est" [style.left.%]="toPercent(r.estimate)"></div>
                  </div>
                </td>
                <td [class.error-hi]="errMeas(r) > errEst(r)">
                  {{ errMeas(r) | number: '1.4-4' }}
                </td>
                <td [class.error-lo]="errEst(r) <= errMeas(r)">
                  {{ errEst(r) | number: '1.4-4' }}
                </td>
                <td [class.error-lo]="improvement(r) > 0" [class.error-hi]="improvement(r) < 0">
                  {{ improvement(r) | number: '1.4-4' }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Legend -->
          <div class="legend">
            <span class="legend-item"><span class="legend-dot true-dot"></span>True value</span>
            <span class="legend-item"><span class="legend-dot meas"></span>Raw measurement</span>
            <span class="legend-item"><span class="legend-dot est"></span>KF estimate</span>
          </div>
        </ng-container>
      </section>

      <p *ngIf="error" class="error">{{ error }}</p>
    </div>
  `,
  styles: [
    `
      .simulation-demo {
        font-family: monospace;
        max-width: 900px;
        margin: 2rem auto;
      }
      section {
        margin-bottom: 2rem;
      }
      label {
        display: block;
        margin: 0.5rem 0;
      }
      input {
        margin-left: 0.5rem;
        width: 120px;
      }
      button {
        margin: 0.5rem 0.25rem;
        padding: 0.4rem 1rem;
        cursor: pointer;
      }
      button.reset {
        background: #c0392b;
        color: white;
        border: none;
      }
      .hint {
        color: #666;
        font-size: 0.85rem;
      }
      .live-state {
        background: #f4f4f4;
        padding: 0.5rem;
        border-radius: 4px;
      }
      .error-msg {
        color: red;
      }
      .step-input {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .scale-heading {
        margin-top: 2rem;
        margin-bottom: 0.25rem;
      }
      .scale-subtext {
        color: #666;
        font-size: 0.85rem;
        margin: 0 0 0.5rem;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 0.4rem 0.6rem;
        text-align: right;
      }
      th {
        background: #2c3e50;
        color: white;
      }
      tr:nth-child(even) {
        background: #f9f9f9;
      }
      .col-left {
        text-align: left;
      }
      .col-scale {
        min-width: 180px;
        width: 35%;
      }

      /* Error colouring */
      .error-hi {
        color: #c0392b;
      }
      .error-lo {
        color: #27ae60;
        font-weight: bold;
      }

      /* Scale bar */
      .scale-bar {
        position: relative;
        height: 16px;
        background: #e8e8e8;
        border-radius: 3px;
        min-width: 160px;
        overflow: visible;
      }
      .marker {
        position: absolute;
        top: 2px;
        width: 3px;
        height: 12px;
        border-radius: 1px;
        transform: translateX(-50%);
      }
      .marker-true {
        background: #888;
        z-index: 1;
      }
      .marker-meas {
        background: #2a78d6;
        opacity: 0.8;
        z-index: 2;
      }
      .marker-est {
        background: #1baf7a;
        z-index: 3;
      }

      /* Legend */
      .legend {
        display: flex;
        gap: 1.5rem;
        margin-top: 0.75rem;
        font-size: 0.85rem;
        color: #555;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        display: inline-block;
      }
      .legend-dot.true-dot {
        background: #888;
      }
      .legend-dot.meas {
        background: #2a78d6;
        opacity: 0.8;
      }
      .legend-dot.est {
        background: #1baf7a;
      }
    `,
  ],
})
export class SimulationDemoComponent implements OnInit {
  // ── Config ───────────────────────────────────────────────────────────────
  numberOfSimulations = 10;
  variance = 4.0;
  mean = 25.0;
  trueValue = this.mean;

  // ── Runtime ──────────────────────────────────────────────────────────────
  initialised = false;
  loading = signal(false);
  error = '';
  history = signal<StepResult[]>([]);

  // ── Scale bounds: include the true value so its marker never clips ────────
  scaleMin = computed(() => {
    const h = this.history();
    if (h.length === 0) return this.trueValue - 1;
    const vals = h.flatMap((r) => [r.measurement, r.estimate, this.trueValue]);
    return Math.min(...vals) - 1;
  });

  scaleMax = computed(() => {
    const h = this.history();
    if (h.length === 0) return this.trueValue + 1;
    const vals = h.flatMap((r) => [r.measurement, r.estimate, this.trueValue]);
    return Math.max(...vals) + 1;
  });

  // ── Template helpers ──────────────────────────────────────────────────────

  /** Maps any value to a [0, 100] percentage position on the scale bar. */
  toPercent(value: number): number {
    const min = this.scaleMin();
    const max = this.scaleMax();
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  /** |measurement − true| */
  errMeas(r: StepResult): number {
    return Math.abs(r.measurement - this.trueValue);
  }

  /** |estimate − true| */
  errEst(r: StepResult): number {
    return Math.abs(r.estimate - this.trueValue);
  }

  /**
   * How much the KF improved over the raw measurement.
   * Positive = KF is closer to the truth.
   * Negative = raw measurement happened to be closer (can happen on any single step).
   */
  improvement(r: StepResult): number {
    return this.errMeas(r) - this.errEst(r);
  }

  constructor(private kalman: KalmanService) {}

  ngOnInit() {}

  initialise() {
    console.log(typeof this.numberOfSimulations, this.numberOfSimulations);
    this.loading.set(true);
    this.error = '';
    this.kalman
      .simulation({
        numberOfMeasurements: this.numberOfSimulations,
        variance: this.variance,
        mean: this.mean,
      })
      .subscribe({
        next: (s) => {
          this.history.set(s);
          this.initialised = true;
          this.loading.set(false);
        },
        error: (err) => {
          this.error = `Init failed: ${err.message}`;
          this.loading.set(false);
        },
      });
  }

  resetFilter() {
    this.initialised = false;
    this.history.set([]);
  }
}
