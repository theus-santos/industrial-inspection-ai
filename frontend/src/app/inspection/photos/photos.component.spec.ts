import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PhotosComponent } from './photos.component';
import { ApiService } from '../../core/services/api.service';

describe('PhotosComponent', () => {
  let fixture: ComponentFixture<PhotosComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['getPresignedUrl', 'analyzePhoto']);
    await TestBed.configureTestingModule({
      imports: [PhotosComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([]), provideAnimations(),
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'ins-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PhotosComponent);
    fixture.detectChanges();
  });

  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
