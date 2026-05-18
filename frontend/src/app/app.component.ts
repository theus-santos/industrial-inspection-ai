import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  activeRoute = '';
  userInitials = 'US';
  isMobile = false;
  private bpSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router,
    private bp: BreakpointObserver,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.checkSession();
    this.bpSub = this.bp.observe(Breakpoints.Handset).subscribe(r => {
      this.isMobile = r.matches;
    });
    this.routerSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  ngOnDestroy(): void { this.bpSub?.unsubscribe(); this.routerSub?.unsubscribe(); }

  isActive(path: string): boolean { return this.activeRoute.startsWith(path); }
  navigate(path: string): void { this.router.navigate([path]); }
  async logout(): Promise<void> { await this.auth.logout(); }
}
