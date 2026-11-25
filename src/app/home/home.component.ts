import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div id="home">
      <h1>Welcome</h1>
      <button routerLink="/kalman">Kalman Filter</button>
      <br>
      <button routerLink="/simulation">Simulation</button>
      <br>
      <button routerLink="/2dkalman">2 dimensional Kalman filter</button>
      <br>
      <button routerLink="/velocity">1-dimensional  with constant velocity.</button>
    </div>
  `,
})
export class HomeComponent {}
