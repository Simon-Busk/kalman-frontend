import { Component, computed, input, signal } from '@angular/core';

export interface Point {
  x: number;
  y: number;
  label?: string;
}

@Component({
  selector: 'plot-trajectory',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE" class="plot">
      <!-- grid and tick labels -->
      @for (t of xTicks(); track t) {
        <line
          [attr.x1]="sx(t)"
          [attr.x2]="sx(t)"
          [attr.y1]="PAD"
          [attr.y2]="SIZE - PAD"
          class="grid"
        />
        <text [attr.x]="sx(t)" [attr.y]="SIZE - PAD + 16" class="tick" text-anchor="middle">
          {{ t.toFixed(1) }}
        </text>
      }
      @for (t of yTicks(); track t) {
        <line
          [attr.x1]="PAD"
          [attr.x2]="SIZE - PAD"
          [attr.y1]="sy(t)"
          [attr.y2]="sy(t)"
          class="grid"
        />
        <text [attr.x]="PAD - 6" [attr.y]="sy(t) + 4" class="tick" text-anchor="end">
          {{ t.toFixed(1) }}
        </text>
      }

      <!-- true value: drawn once -->
      @if (truth(); as t) {
        <circle [attr.cx]="sx(t.x)" [attr.cy]="sy(t.y)" r="6" class="truth-dot" />
        <circle [attr.cx]="sx(t.x)" [attr.cy]="sy(t.y)" r="2" class="truth-center" />
      }

      <!-- measurements -->
      <polyline [attr.points]="path(measurements())" class="meas-line" />
      @for (p of measurements(); track $index) {
        <circle [attr.cx]="sx(p.x)" [attr.cy]="sy(p.y)" r="3.5" class="meas-dot" />
        @if (p.label && showLabels()) {
          <text [attr.x]="sx(p.x) + 6" [attr.y]="sy(p.y) + 12" class="label meas-label">{{p.label}}</text>
        }
      }

      <!-- Kalman estimate -->
      <polyline [attr.points]="path(estimates())" class="est-line" />
      @for (p of estimates(); track $index) {
        <circle [attr.cx]="sx(p.x)" [attr.cy]="sy(p.y)" r="3.5" class="est-dot" />
        @if (p.label && showLabels()) {
          <text [attr.x]="sx(p.x)+6" [attr.y]="sy(p.y) +12" class="label est-label">{{p.label}}</text>
        }
      }
    </svg>

    <div class="legend">
      <span><i class="sw truth"></i>True value</span>
      <span><i class="sw meas"></i>Measurement</span>
      <span><i class="sw est"></i>Kalman estimate</span>

      <label class="toggle">
        <input
          class="label-check"
          type="checkbox"
          [checked]="showLabels()"
          (change)="showLabels.set($any(($event.target)).checked)"
        />
        On/off labels
      </label>
    </div>
  `,
  styles: [
    `
      .plot {
        width: 100%;
        max-width: 560px;
        background: #fafafa;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .grid {
        stroke: #e4e4e4;
        stroke-width: 1;
      }
      .tick {
        font: 10px monospace;
        fill: #777;
      }
      .truth-dot {
        fill: none;
        stroke: #888;
        stroke-width: 2;
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
      .est-line {
        fill: none;
        stroke: #1baf7a;
        stroke-width: 2;
      }
      .est-dot {
        fill: #1baf7a;
      }
      .legend {
        display: flex;
        gap: 1.25rem;
        font-size: 0.85rem;
        margin-top: 0.5rem;
      }
      .sw {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        margin-right: 6px;
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
      .label {
        font: 10px monospace;
        pointer-events: none;
      }
      .meas-label {
        fill: #2a78d6;
        opacity: 0.55;
      }
      .est-label  {
        fill: #0f7a55;
        font-weight: bold;
      }
      .toggle {
        margin-left: 1rem;
        cursor: pointer;
        user-select: none;
      }
      .label-check:checked {
        accent-color: green;
      }
    `,
  ],
})
export class TrajectoryPlotComponent {
  readonly SIZE = 500;
  readonly PAD = 40;

  truth = input<Point | null>(null);
  measurements = input<Point[]>([]);
  estimates = input<Point[]>([]);

  showLabels = signal(true);

  /** Square bounds so the x and y axes share one scale (a true "map"). */
  private bounds = computed(() => {
    const t = this.truth();
    const pts = [...(t ? [t]: []) ,...this.measurements(), ...this.estimates()];
    if (pts.length === 0) return { minX: 0, minY: 0, span: 1 };

    const xs = pts.map((p) => p.x),
          ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
          maxX = Math.max(...xs);
    const minY = Math.min(...ys),
          maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 1e-9) * 1.15; // 15% margin
    return {
      minX: (minX + maxX) / 2 - span / 2,
      minY: (minY + maxY) / 2 - span / 2,
      span,
    };
  });

  sx = (x: number) => {
    const b = this.bounds();
    return this.PAD + ((x - b.minX) / b.span) * (this.SIZE - 2 * this.PAD);
  };

  sy = (y: number) => {
    const b = this.bounds();
    return this.SIZE - this.PAD - ((y - b.minY) / b.span) * (this.SIZE - 2 * this.PAD); // flip y
  };

  path = (pts: Point[]) => pts.map((p) => `${this.sx(p.x)},${this.sy(p.y)}`).join(' ');

  xTicks = computed(() => this.ticks(this.bounds().minX));
  yTicks = computed(() => this.ticks(this.bounds().minY));

  private ticks(min: number): number[] {
    const { span } = this.bounds();
    return Array.from({ length: 6 }, (_, i) => min + (span * i) / 5);
  }
}
