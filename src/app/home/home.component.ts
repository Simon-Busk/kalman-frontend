import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div id="home">
      <h1>Welcome</h1>
      <button routerLink="/kalman">Go to Kalman Filter</button>
      <br>
      <button routerLink="/simulation">Go to a Simulation</button>
      <br>
      <button routerLink="/2dkalman">Go to 2 dimensional Kalman filter</button>
    </div>
  `,
})
export class HomeComponent {}
