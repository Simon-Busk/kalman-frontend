import { Routes } from '@angular/router';
import { KalmanDemoComponent } from './kalman/kalman-demo.component';
import { HomeComponent } from './home/home.component';
import { SimulationDemoComponent } from './simulation/simulation-demo.component';
import { Kalman2dDemoComponent } from './kalman2d/kalman2d-demo-component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'kalman', component: KalmanDemoComponent },
  { path: 'simulation', component: SimulationDemoComponent },
  { path: '2dkalman', component: Kalman2dDemoComponent},
];
