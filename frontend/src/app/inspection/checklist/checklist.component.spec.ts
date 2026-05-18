import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ChecklistComponent } from './checklist.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';

describe('ChecklistComponent', () => {
  let fixture: ComponentFixture<ChecklistComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getInspection', 'saveChecklist']);
    apiSpy.getInspection.and.returnValue(of({ inspection: { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open', createdAt: '' }, checklist: [] }));
    apiSpy.saveChecklist.and.returnValue(of({ message: 'ok' }));

    await TestBed.configureTestingModule({
      imports: [ChecklistComponent, MatSnackBarModule],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        provideRouter([]), provideAnimations(),
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'ins-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChecklistComponent);
    fixture.detectChanges();
  });

  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
  it('should load inspection on init', () => expect(apiSpy.getInspection).toHaveBeenCalledWith('ins-1'));
});
