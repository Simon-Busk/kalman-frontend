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
  templateUrl: './kalman-demo.component.html',
  styleUrl: '/kalman-demo.component.css'
})
export class KalmanDemoComponent implements OnInit {
  // ── Config ───────────────────────────────────────────────────────────────
  processNoise = 0.01;
  measurementNoise = 4.0;
  firstMeasurement = 25.7;
  trueValue = 25.0;

  // ── Runtime ──────────────────────────────────────────────────────────────
  nextMeasurement = 25.0;
  initialised = signal(false);
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
        this.initialised.set(true);
        this.loadState();
      },
      error: () => {
        /* 409 = not initialised yet, that's fine */
        this.error = '';
      },
    });
  }

  loadState() {
    const savedHistory = localStorage.getItem('history');
    if (savedHistory) {
      try {
        this.history.set(JSON.parse(savedHistory));
      } catch {
        localStorage.removeItem('history');
        this.error = "Failure in parsing the history from the local storage";
      }
    }
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
          this.initialised.set(true);
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
        localStorage.setItem('history', JSON.stringify(this.history()));
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
        this.initialised.set(false);
        this.history.set([]);
        this.state.set(null);
        localStorage.removeItem('history');
      },
      error: (err) => {
        this.error = `Reset failed: ${err.message}`;
      },
    });
  }
}
