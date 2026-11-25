import { Component, computed, input, signal } from '@angular/core';

export interface Point1D {
  x: number;
  /** Velocity. When set, an arrow is drawn from the point. */
  v?: number;
  label?: string;
  /** Position variance (P[0][0]). Drawn as a confidence interval. */
  variance?: number;
}

interface Arrow {
  x1: number;
  x2: number;
  y: number;
  head: string;
}

@Component({
  selector: 'plot-trajectory-1d',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + WIDTH + ' ' + height()" class="plot">


      <text [attr.x]="WIDTH/2" [attr.y]="axisY() + 42" class="axis-title" text-anchor="middle">
        Position
      </text>

      <!-- vertical grid and tick labels -->
      @for (t of xTicks(); track t) {
        <line
          [attr.x1]="sx(t)"
          [attr.x2]="sx(t)"
          [attr.y1]="PAD / 2"
          [attr.y2]="axisY()"
          class="grid"
        />
        <text [attr.x]="sx(t)" [attr.y]="axisY() + 22" class="tick" text-anchor="middle">
          {{ t.toFixed(1) }}
        </text>
      }

      <!-- y-axis title, above the step labels -->
      <text [attr.x]="PAD - 6" [attr.y]="PAD / 2 - 4" class="axis-title" text-anchor="end">
        Step
      </text>

      <!-- one faint row line per step -->
      @for (i of rowIndices(); track i) {
        <line
          [attr.x1]="PAD"
          [attr.x2]="WIDTH - PAD"
          [attr.y1]="rowY(i)"
          [attr.y2]="rowY(i)"
          class="row-grid"
        />
        <text [attr.x]="PAD - 6" [attr.y]="rowY(i) + 4" class="tick" text-anchor="end">
          {{ rowLabel(i) }}
        </text>
      }

      <!-- the 1D axis itself -->
      <rect
        [attr.x]="PAD"
        [attr.y]="axisY() - 3"
        [attr.width]="WIDTH - 2 * PAD"
        height="6"
        rx="3"
        class="bar"
      />

      <!-- true value: one per step -->
      <polyline [attr.points]="path(truth())" class="truth-line" />
      @for (p of truth(); track $index) {
        @if (showArrows()) {
          @if (arrow(p, $index); as a) {
            <line
              [attr.x1]="a.x1"
              [attr.x2]="a.x2"
              [attr.y1]="a.y"
              [attr.y2]="a.y"
              class="truth-arrow"
            />
            <polygon [attr.points]="a.head" class="truth-arrow-head" />
          }
        }
        <circle [attr.cx]="sx(p.x)" [attr.cy]="rowY($index)" r="6" class="truth-dot" />
        <circle [attr.cx]="sx(p.x)" [attr.cy]="rowY($index)" r="2" class="truth-center" />
      }

      <!-- confidence intervals -->
      @if (confidenceCheck()) {
        @for (p of estimates(); track $index) {
          @if (interval(p, $index); as iv) {
            <rect
              [attr.x]="iv.x"
              [attr.y]="iv.y"
              [attr.width]="iv.width"
              height="10"
              rx="5"
              class="interval"
            />
          }
        }
      }

      <!-- measurements -->
      <polyline [attr.points]="path(measurements())" class="meas-line" />
      @for (p of measurements(); track $index) {
        @if (showArrows()) {
          @if (arrow(p, $index); as a) {
            <line
              [attr.x1]="a.x1"
              [attr.x2]="a.x2"
              [attr.y1]="a.y"
              [attr.y2]="a.y"
              class="meas-arrow"
            />
            <polygon [attr.points]="a.head" class="meas-arrow-head" />
          }
        }
        <circle [attr.cx]="sx(p.x)" [attr.cy]="rowY($index)" r="3.5" class="meas-dot" />
      }

      <!-- Kalman estimate -->
      <polyline [attr.points]="path(estimates())" class="est-line" />
      @for (p of estimates(); track $index) {
        @if (showArrows()) {
          @if (arrow(p, $index); as a) {
            <line
              [attr.x1]="a.x1"
              [attr.x2]="a.x2"
              [attr.y1]="a.y"
              [attr.y2]="a.y"
              class="est-arrow"
            />
            <polygon [attr.points]="a.head" class="est-arrow-head" />
          }
        }
        <circle [attr.cx]="sx(p.x)" [attr.cy]="rowY($index)" r="3.5" class="est-dot" />
      }
    </svg>

    <div class="legend">
      <span><i class="sw truth"></i>True value</span>
      <span><i class="sw meas"></i>Measurement</span>
      <span><i class="sw est"></i>Kalman estimate</span>
    </div>
    <div class="legend">
      <label class="toggle">
        <input
          class="label-check"
          type="checkbox"
          [checked]="showArrows()"
          (change)="showArrows.set($any($event.target).checked)"
        />
        Velocity arrows
      </label>

      <label class="toggle">
        <input
          class="label-check"
          type="checkbox"
          [checked]="confidenceCheck()"
          (change)="confidenceCheck.set($any($event.target).checked)"
        />
        Confidence on/off
      </label>
    </div>
    <div class="legend">
      <label class="confidence-input toggle">
        Confidence level:
        <input
          type="number"
          min="1"
          max="99"
          step="1"
          [value]="confidencePct()"
          (input)="setConfidence($any($event.target).value)"
        />%
      </label>
    </div>
  `,
  styles: [
    `
      .plot {
        width: 100%;
        max-width: 1200px;
        background: #fafafa;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 2rem auto;
      }
      .grid {
        stroke: #e4e4e4;
        stroke-width: 1;
      }
      .row-grid {
        stroke: #efefef;
        stroke-width: 1;
      }
      .bar {
        fill: #cfcfcf;
      }
      .tick {
        font: 10px monospace;
        fill: #777;
      }
      .truth-line {
        fill: none;
        stroke: #888;
        stroke-width: 1.5;
        stroke-dasharray: 4 3;
      }
      .truth-dot {
        fill: none;
        stroke: #888;
        stroke-width: 2;
      }
      .truth-arrow {
        stroke: #888;
        stroke-width: 1.5;
        stroke-dasharray: 3 2;
      }
      .truth-arrow-head {
        fill: #888;
      }
      .truth-center {
        fill: #888;
      }
      .meas-dot {
        fill: #2a78d6;
        opacity: 0.55;
      }
      .meas-line {
        fill: none;
        stroke: #2a78d6;
        stroke-width: 1.5;
        opacity: 0.55;
      }
      .meas-arrow {
        stroke: #2a78d6;
        stroke-width: 1.5;
        opacity: 0.55;
      }
      .meas-arrow-head {
        fill: #2a78d6;
        opacity: 0.55;
      }
      .est-line {
        fill: none;
        stroke: #1baf7a;
        stroke-width: 2;
      }
      .est-dot {
        fill: #1baf7a;
      }
      .est-arrow {
        stroke: #0f7a55;
        stroke-width: 2;
      }
      .est-arrow-head {
        fill: #0f7a55;
      }
      .interval {
        fill: #1baf7a;
        fill-opacity: 0.25;
        stroke: #1baf7a;
        stroke-opacity: 0.45;
        stroke-width: 1;
      }
      .legend {
        display: flex;
        gap: 1.25rem;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        justify-content: left;
      }
      .legend > span,
      .legend label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .sw {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        flex-shrink: 0;
        margin-right: 0;
      }
      .legend input[type='checkbox'] {
        width: 14px;
        height: 14px;
        margin: 0;
        flex-shrink: 0;
      }
      .sw.truth {
        background: #888;
      }
      .sw.meas {
        background: #2a78d6;
      }
      .sw.est {
        background: #1baf7a;
      }
      .confidence-input input {
        width: 3.5rem;
        margin: 0 0.25rem;
      }
      .toggle {
        cursor: pointer;
        user-select: none;
      }
      .label-check:checked {
        accent-color: green;
      }
    `,
  ],
})
export class TrajectoryPlot1DComponent {
  readonly WIDTH = 500;
  readonly PAD = 40;
  /** Vertical spacing between steps. */
  readonly ROW = 28;
  /** Space below the x-axis for a label. */
  readonly BOTTOM = 52;

  /** True state per step; index i shares a row with measurements[i] and estimates[i]. */
  truth = input<Point1D[]>([]);
  measurements = input<Point1D[]>([]);
  estimates = input<Point1D[]>([]);

  showArrows = signal(true);
  confidenceCheck = signal(true);

  confidence = signal(0.95);
  confidencePct = computed(() => this.confidence() * 100);

  setConfidence(raw: string) {
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v > 0 && v < 100) this.confidence.set(v / 100);
  }

  /**
   * Two-sided z-score for the confidence level (1.96 for 95%).
   * The 1D counterpart of k = -2 ln(1 - p) in the 2D plot.
   */
  private z = computed(() => Math.SQRT2 * erfinv(this.confidence()));

  // ---- layout: one row per step, step 0 just above the bar ----

  private rowCount = computed(() =>
    Math.max(this.truth().length, this.measurements().length, this.estimates().length, 1),
  );

  rowIndices = computed(() => Array.from({ length: this.rowCount() }, (_, i) => i));

  height = computed(() => this.PAD / 2 + this.rowCount() * this.ROW + this.BOTTOM);

  axisY = computed(() => this.height() - this.BOTTOM);

  rowY = (i: number) => this.axisY() - this.ROW * (i + 0.75);

  rowLabel = (i: number) =>
    this.estimates()[i]?.label ??
    this.measurements()[i]?.label ??
    this.truth()[i]?.label ??
    String(i);

  // ---- x scale ----

  private bounds = computed(() => {
    const z = this.z();
    const xs: number[] = [];

    for (const p of [...this.truth(), ...this.measurements(), ...this.estimates()]) {
      xs.push(p.x);
      if (p.v != null) xs.push(p.x + p.v);
      if (p.variance) {
        const h = z * Math.sqrt(p.variance);
        xs.push(p.x - h, p.x + h);
      }
    }

    if (xs.length === 0) return { min: 0, span: 1 };

    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const span = Math.max(hi - lo, 1e-9) * 1.15; // 15% margin
    return { min: (lo + hi) / 2 - span / 2, span };
  });

  sx = (x: number) => {
    const b = this.bounds();
    return this.PAD + ((x - b.min) / b.span) * (this.WIDTH - 2 * this.PAD);
  };

  path = (pts: Point1D[]) => pts.map((p, i) => `${this.sx(p.x)},${this.rowY(i)}`).join(' ');

  xTicks = computed(() => {
    const { min, span } = this.bounds();
    return Array.from({ length: 6 }, (_, i) => min + (span * i) / 5);
  });

  // ---- glyphs ----

  arrow(p: Point1D, i: number): Arrow | null {
    if (p.v == null) return null;

    const x1 = this.sx(p.x);
    const end = this.sx(p.x + p.v);
    const length = Math.abs(end - x1);
    if (length < 1.5) return null; // effectively zero velocity

    const dir = Math.sign(end - x1);
    const headLength = Math.min(7, length);
    const base = end - dir * headLength;
    const y = this.rowY(i);

    return {
      x1,
      x2: base,
      y,
      head: `${end},${y} ${base},${y - 4.5} ${base},${y + 4.5}`,
    };
  }

  interval(p: Point1D, i: number) {
    if (!p.variance) return null;
    const h = this.z() * Math.sqrt(p.variance);
    const x = this.sx(p.x - h);
    return {
      x,
      y: this.rowY(i) - 5,
      width: this.sx(p.x + h) - x,
    };
  }
}

/** Inverse error function (Winitzki approximation, plenty for plotting). */
function erfinv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t = 2 / (Math.PI * a) + ln / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - ln / a) - t);
}
