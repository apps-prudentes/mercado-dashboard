import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Required for ngModel
import { LoginComponent } from './login/login.component';
import { RouterModule } from '@angular/router'; // Import RouterModule for routing

@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule // Needed if LoginComponent uses routerLink or other routing features directly
  ],
  exports: [
    LoginComponent // Export if it will be used in other modules directly
  ]
})
export class AuthModule { }
