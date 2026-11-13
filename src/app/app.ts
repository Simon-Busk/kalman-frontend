import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/kalman">Kalman Filter</a>
      <a routerLink="/simulation">Simulation</a>
      <a routerLink="/2dkalman">2 dimensional Kalman Filter</a>
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
        background: var(--button-bg);
        color: var(--button-text);
        border-radius: 4px;
      }

      nav a:hover {
        background: #1baf7a;
      }
    `,
  ],
})
export class App {}
