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
  templateUrl: '/simulation-demo.component.html',
  styleUrl: '/simulation-demo.component.css',
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

  ngOnInit() {
    this.loadState();
  }

  loadState() {
    const savedHistory = localStorage.getItem('history');
    if (savedHistory) {
      try {
        this.history.set(JSON.parse(savedHistory));
        this.initialised = true;
      } catch {
        localStorage.removeItem('history');
        this.error = 'Failure in parsing the history from the local storage';
      }
    }
  }

  initialise() {
    this.loading.set(true);
    this.error = '';
    this.trueValue = this.mean;
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
          localStorage.setItem('history', JSON.stringify(this.history()));
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
    localStorage.removeItem('history');
  }
}
