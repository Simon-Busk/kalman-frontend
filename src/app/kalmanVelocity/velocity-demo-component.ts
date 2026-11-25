import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultivariateFilterState, MultivariateStepResult } from '../kalman2d/kalman2d.models';
import { MultivariateKalmanService } from '../kalman2d/multivariate.kalman.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Point1D, TrajectoryPlot1DComponent } from './plot.velocity-component';

type State1D = Point1D & {v: number};

@Component({
  selector: 'app-kalman-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TrajectoryPlot1DComponent],
  templateUrl: './velocity-demo-component.html',
  styleUrl: '/velocity-demo-component.css',
})
export class VelocityDemoComponent implements OnInit {
  // ── Config ───────────────────────────────────────────────────────────────
  initialState = [25, 1];
  measurementNoise = [[2]];
  stateTransition = [
    [1, 1],
    [0, 1],
  ];
  observationModel = [[1, 0]];
  initialUncertainty = [
    [2, 0],
    [0, 2],
  ];

  truePosition = 25;
  trueVelocity = 1;

  // ── Runtime ──────────────────────────────────────────────────────────────
  nextMeasurement = this.truePosition + this.trueVelocity;
  initialised = signal(false);
  loading = signal(false);
  error = '';
  fieldErrors = signal<Record<string, string>>({});
  history = signal<MultivariateStepResult[]>([]);
  state = signal<MultivariateFilterState | null>(null);
  truthHistory = signal<State1D[]>([])


  // Helper functions to calculate errors.

  errorMeas(r: MultivariateStepResult) {
    return Math.abs(r.measurement[0] - this.truthHistory()[r.step-1].x);
  }

  errorEstPosition(r: MultivariateStepResult) {
    return Math.abs(r.estimate[0] - this.truthHistory()[r.step-1].x);
  }

  errorEstVelocity(r: MultivariateStepResult) {
    return Math.abs(r.estimate[1] - this.truthHistory()[r.step-1].v);
  }

  constructor(private multivariateKalman: MultivariateKalmanService) {}

  ngOnInit(): void {
    // Try to restore state if the user already has an active session
    this.multivariateKalman.getState("velocity").subscribe({
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
    const savedHistory = localStorage.getItem('velocityHistory');
    const savedTruth = localStorage.getItem('truthHistory');
    if (savedHistory && savedTruth) {
      let history, truth;
      try {
        history = JSON.parse(savedHistory);
        truth =  JSON.parse(savedTruth);
      } catch {
        localStorage.removeItem('velocityHistory');
        localStorage.removeItem('truthHistory');
        this.error =
          'Failure in parsing the history for Kalman filter with velocity from the local storage';
        return;
      }
      this.history.set(history);
      this.truthHistory.set(truth);

      const last = truth.at(-1);
      if (last) {
        this.truePosition = last.x;
        this.trueVelocity = last.v;
        this.nextMeasurement = last.v + last.x;
      }
    }
  }

  initialise() {
    this.loading.set(true);
    this.error = '';
    this.fieldErrors.set({});
    this.multivariateKalman
      .init({
        initialState: this.initialState,
        measurementNoise: this.measurementNoise,
        stateTransition: this.stateTransition,
        observationModel: this.observationModel,
        initialUncertainty: this.initialUncertainty,
      }, "velocity")
      .subscribe({
        next: (s) => {
          this.state.set(s);
          this.initialised.set(true);
          this.loading.set(false);
          this.nextMeasurement = this.truePosition;
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
    this.multivariateKalman.step({ measurement: [this.nextMeasurement] }, "velocity").subscribe({
      next: (result) => {
        this.history.update((h) => [result, ...h]); // newest at the top
        this.state.set(result);
        this.loading.set(false);
        if (result.step > 1) {
          this.truePosition += this.trueVelocity;
        }
        this.truthHistory.update((h) => [...h, { x: this.truePosition, v: this.trueVelocity }]);
        this.nextMeasurement = this.truePosition + this.trueVelocity;
        localStorage.setItem('velocityHistory', JSON.stringify(this.history()));
        localStorage.setItem('truthHistory', JSON.stringify(this.truthHistory()));
      },
      error: (err) => {
        this.error = `Step failed for Kalman filter with velocity: ${err.message}`;
        this.loading.set(false);
      },
    });
  }

  resetFilter() {
    this.multivariateKalman.reset("velocity").subscribe({
      next: () => {
        this.initialised.set(false);
        this.history.set([]);
        this.state.set(null);
        this.trueVelocity = 1;
        this.truePosition = 25;
        this.truthHistory.set([]);
        localStorage.removeItem('velocityHistory');
        localStorage.removeItem('truthHistory');
      },
      error: (err) => {
        this.error = `Reset failed for Kalman filter with velocity: ${err.message}`;
      },
    });
  }

  // Helper functions for plotting.

  private ordered = computed(() => [...this.history()].reverse());

  measPoints = computed(() =>
    this.ordered().map((r) => ({
      x: r.measurement[0],
      label: String(r.step),
    })),
  );
  estPoints = computed(() =>
    this.ordered().map((r) => ({
      x: r.estimate[0],
      v: r.estimate[1],
      label: String(r.step),
      variance: r.uncertainty[0][0],
    })),
  );
}
