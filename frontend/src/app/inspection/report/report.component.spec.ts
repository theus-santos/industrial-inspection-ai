import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { ReportComponent } from './report.component';
import { ApiService } from '../../core/services/api.service';

describe('ReportComponent', () => {
  let fixture: ComponentFixture<ReportComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['generateReport']);
    await TestBed.configureTestingModule({
      imports: [ReportComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([]), provideAnimations(),
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'ins-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReportComponent);
    fixture.detectChanges();
  });

  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
