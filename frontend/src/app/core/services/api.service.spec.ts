import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getEquipments() calls GET /equipments', () => {
    service.getEquipments().subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/equipments') && r.method === 'GET');
    req.flush([]);
  });

  it('createEquipment() calls POST /equipments', () => {
    service.createEquipment({ name: 'Test', type: 'maintenance', location: 'L' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/equipments') && r.method === 'POST');
    req.flush({ id: '1' });
  });

  it('createInspection() calls POST /inspections', () => {
    service.createInspection({ equipmentId: 'eq-1', equipmentType: 'maintenance', inspector: 'João', notes: '' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/inspections') && r.method === 'POST');
    req.flush({ inspection: {}, checklist: [] });
  });
});
