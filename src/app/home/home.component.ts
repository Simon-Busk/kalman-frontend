import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div id="home">
      <h1>Welcome to the Kalman filter demonstration app</h1>
      <p>Please select one of the following Kalman filter scenarios.</p>
      <button routerLink="/kalman" class="button-home">Kalman Filter</button>
      <br />
      <button routerLink="/simulation" class="button-home">Simulation</button>
      <br />
      <button routerLink="/2dkalman" class="button-home">2 dimensional Kalman filter</button>
      <br />
      <button routerLink="/velocity" class="button-home">
        1-dimensional with constant velocity.
      </button>
    </div>
  `,
  styles: `
    #home {
      padding: 1rem;
    }
    .button-home {
      height: 35px;
      width: 300px;
    }
    p {
      font-size: 1.5em;
    }
  `,
})
export class HomeComponent {}
