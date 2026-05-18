import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { EquipmentListComponent } from './equipment-list.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';

describe('EquipmentListComponent', () => {
  let fixture: ComponentFixture<EquipmentListComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getEquipments']);
    apiSpy.getEquipments.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [EquipmentListComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([]), provideAnimations(),
        { provide: ApiService, useValue: apiSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EquipmentListComponent);
    fixture.detectChanges();
  });

  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
  it('should call getEquipments on init', () => expect(apiSpy.getEquipments).toHaveBeenCalled());
});
