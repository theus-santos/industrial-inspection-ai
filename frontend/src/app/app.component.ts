import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  activeRoute = '';
  userInitials = 'US';

  constructor(public auth: AuthService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.auth.checkSession();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  isActive(path: string): boolean {
    return this.activeRoute.startsWith(path);
  }

  navigate(path: string): void { this.router.navigate([path]); }

  async logout(): Promise<void> { await this.auth.logout(); }
}
