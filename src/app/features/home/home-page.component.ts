import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-home-page', imports: [RouterLink], templateUrl: './home-page.component.html', styleUrl: './home-page.component.scss' })
export class HomePageComponent {
  protected readonly trackingCode = signal('');
  protected search(): void { this.trackingCode.update((code) => code.trim().toUpperCase()); }
}
