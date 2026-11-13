import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'
import { MultivariateFilterState, MultivariateStepResult } from './kalman2d.models';
import { MultivariateKalmanService } from './multivariate.kalman.service';
import { RouterLink } from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import { TrajectoryPlotComponent } from './plot.trajectory-component';

@Component({
  selector: 'app-kalman-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TrajectoryPlotComponent],
  templateUrl: './kalman2d-demo-component.html',
  styleUrl: '/kalman2d-demo-component.css',
})
export class Kalman2dDemoComponent implements OnInit {
  // ── Config ───────────────────────────────────────────────────────────────
  processNoise = [
    [1, 1],
    [1, 1],
  ];
  measurementNoise = [
    [2, 0],
    [0, 2],
  ];
  firstMeasurement = [25.7, 24.3];
  trueValue = [25.0, 25];

  // ── Runtime ──────────────────────────────────────────────────────────────
  nextMeasurement = [25.0, 26.7];
  initialised = signal(false);
  loading = signal(false);
  error = '';
  fieldErrors = signal<Record<string, string>>({});
  history = signal<MultivariateStepResult[]>([]);
  state = signal<MultivariateFilterState | null>(null);

  // Helper functions to calculate errors.

  errorMeas(r: MultivariateStepResult) {
    return Math.sqrt(
      (r.measurement[0] - this.trueValue[0]) ** 2 + (r.measurement[1] - this.trueValue[1]) ** 2,
    );
  }

  errorEst(r: MultivariateStepResult) {
    return Math.sqrt(
      (r.estimate[0] - this.trueValue[0]) ** 2 + (r.estimate[1] - this.trueValue[1]) ** 2,
    );
  }

  constructor(private multivariateKalman: MultivariateKalmanService) {}

  ngOnInit() {
    // Try to restore state if the user already has an active session
    this.multivariateKalman.getState().subscribe({
      next: (s) => {
        this.state.set(s);
        this.initialised.set(true);
        this.loadState();
      },
      error: () => {
        /* 409 = not initialised yet, that's fine */
        this.error = '';
        this.fieldErrors.set({});
      },
    });
  }

  loadState() {
    const savedHistory = localStorage.getItem('multivariateHistory');
    if (savedHistory) {
      try {
        this.history.set(JSON.parse(savedHistory));
      } catch {
        localStorage.removeItem('multivariateHistory');
        this.error = 'Failure in parsing the history for multivariate from the local storage';
      }
    }
  }

  initialise() {
    this.loading.set(true);
    this.error = '';
    this.fieldErrors.set({});
    this.multivariateKalman
      .init({
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
        error: (err: HttpErrorResponse) => {
          this.fieldErrors.set(err.error ?? {});
          this.error = `Initialisation failed: ${err.message}`;
          this.loading.set(false);
        },
      });
  }

  sendStep() {
    if (this.nextMeasurement == null) return;
    this.loading.set(true);
    this.error = '';
    this.multivariateKalman.step({ measurement: this.nextMeasurement }).subscribe({
      next: (result) => {
        this.history.update((h) => [result, ...h]); // newest at the top
        this.state.set(result);
        this.loading.set(false);
        localStorage.setItem('multivariateHistory', JSON.stringify(this.history()));
      },
      error: (err) => {
        this.error = `Step failed for multivariate: ${err.message}`;
        this.loading.set(false);
      },
    });
  }

  resetFilter() {
    this.multivariateKalman.reset().subscribe({
      next: () => {
        this.initialised.set(false);
        this.history.set([]);
        this.state.set(null);
        localStorage.removeItem('multivariateHistory');
      },
      error: (err) => {
        this.error = `Reset failed for multivariate: ${err.message}`;
      },
    });
  }

  //Trajectory plot

  private ordered = computed(() => [...this.history()].reverse());

  measPoints = computed(() =>
    this.ordered().map((r) => ({ x: r.measurement[0], y: r.measurement[1], label: String(r.step) })),
  );
  estPoints = computed(() =>
    this.ordered().map((r) => ({ x: r.estimate[0], y: r.estimate[1], label: String(r.step) })),
  );
  truePoint = computed(() => ({ x: this.trueValue[0], y: this.trueValue[1] }));
}
