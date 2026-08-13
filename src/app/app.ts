import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { KalmanDemoComponent } from './kalman/kalman-demo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, KalmanDemoComponent],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/kalman">Kalman Filter</a>
      <a routerLink="/simulation">Simulation</a>
    </nav>
    <router-outlet />
  `,
  styles: [
    `
      nav {
        display: flex;
        gap: 1rem; /* space between buttons */
        padding: 1rem; /* breathing room around the whole nav */
      }

      nav a {
        padding: 0.4rem 1rem;
        text-decoration: none;
        background: #2c3e50;
        color: white;
        border-radius: 4px;
      }

      nav a:hover {
        background: #1baf7a;
      }
    `,
  ],
})
export class App {}
