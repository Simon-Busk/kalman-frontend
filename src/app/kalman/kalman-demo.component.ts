import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { KalmanService } from './kalman.service';
import { FilterState, StepResult } from './kalman.models';
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
  selector: 'app-kalman-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="kalman-demo">
      <h2>Kalman Filter – Step-by-Step Demo</h2>

      <!-- ── Configuration ───────────────────────────────────────────── -->
      <section *ngIf="!initialised">
        <h3>1. Configure Filter</h3>

        <label>
          Process noise Q
          <input type="number" [(ngModel)]="processNoise" step="0.001" min="0.001" />
        </label>

        <label>
          Measurement noise R (σ²)
          <input type="number" [(ngModel)]="measurementNoise" step="0.1" min="0.1" />
        </label>

        <label>
          First measurement (seeds x₀)
          <input type="number" [(ngModel)]="firstMeasurement" step="0.1" />
        </label>

        <label>
          True value (Only used for visuals)
          <input type="number" [(ngModel)]="trueValue" step="0.1" min="0.1" />
        </label>

        <button (click)="initialise()" [disabled]="loading()">
          {{ loading() ? 'Initialising…' : 'Initialise Filter' }}
        </button>

        <p class="hint">
          The first measurement will be used as the initial estimate (x₀ = z₁) and P₀ will be set to
          R — the principled initialisation strategy.
        </p>

        <button routerLink="/simulation">Simulation of data.</button>

        <p>Use this if you dont have any measurements but just want a simulation of measurements.</p>
      </section>

      <!-- ── Step input ───────────────────────────────────────────────── -->
      <section *ngIf="initialised">
        <h3>2. Feed Measurements</h3>

        <div class="step-input">
          <label>
            New measurement
            <input
              type="number"
              [(ngModel)]="nextMeasurement"
              step="0.1"
              (keyup.enter)="sendStep()"
            />
          </label>
          <button (click)="sendStep()" [disabled]="loading()">
            {{ loading() ? '…' : 'Step →' }}
          </button>
          <button (click)="resetFilter()" class="reset">Reset</button>
        </div>

        <p *ngIf="state" class="live-state">
          Step <strong>{{ state()!.step }}</strong> &nbsp;|&nbsp; Estimate:
          <strong>{{ state()!.estimate | number: '1.4-4' }}</strong> &nbsp;|&nbsp; Uncertainty P:
          <strong>{{ state()!.uncertainty | number: '1.6-6' }}</strong> &nbsp;|&nbsp; Next K:
          <strong>{{ state()!.kalmanGain | number: '1.4-4' }}</strong>
        </p>

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
      .kalman-demo {
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
export class KalmanDemoComponent implements OnInit {
  // ── Config ───────────────────────────────────────────────────────────────
  processNoise = 0.01;
  measurementNoise = 4.0;
  firstMeasurement = 25.7;
  trueValue = 25.0;

  // ── Runtime ──────────────────────────────────────────────────────────────
  nextMeasurement = 25.0;
  initialised = false;
  loading = signal(false);
  error = '';
  history = signal<StepResult[]>([]);
  state = signal<FilterState | null>(null);

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

  ngOnInit() {
    // Try to restore state if the user already has an active session
    this.kalman.getState().subscribe({
      next: (s) => {
        this.state.set(s);
        this.initialised = true;
      },
      error: () => {
        /* 409 = not initialised yet, that's fine */
      },
    });
  }

  initialise() {
    this.loading.set(true);
    this.error = '';
    this.kalman
      .init({
        seedWithFirstMeasurement: true,
        firstMeasurement: this.firstMeasurement,
        processNoise: this.processNoise,
        measurementNoise: this.measurementNoise,
      })
      .subscribe({
        next: (s) => {
          this.state.set(s);
          this.initialised = true;
          this.loading.set(false);
          this.history.set([]);
        },
        error: (err) => {
          this.error = `Init failed: ${err.message}`;
          this.loading.set(false);
        },
      });
  }

  sendStep() {
    if (this.nextMeasurement == null) return;
    this.loading.set(true);
    this.error = '';
    this.kalman.step({ measurement: this.nextMeasurement }).subscribe({
      next: (result) => {
        this.history.update((h) => [result, ...h]); // newest at the top
        this.state.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.error = `Step failed: ${err.message}`;
        this.loading.set(false);
      },
    });
  }

  resetFilter() {
    this.kalman.reset().subscribe({
      next: () => {
        this.initialised = false;
        this.history.set([]);
        this.state.set(null);
      },
    });
  }
}
