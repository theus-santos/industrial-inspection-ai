import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Equipment { id: string; name: string; type: string; location: string; createdAt: string; }
export interface ChecklistItem { id: string; inspectionId: string; label: string; category: string; checked: boolean; }
export interface Inspection { id: string; equipmentId: string; inspector: string; notes: string; status: string; createdAt: string; }
export interface Defect { type: string; severity: string; confidence: number; location: string; }
export interface DefectAnalysis { photoId: string; defects: Defect[]; summary: string; analyzedAt: string; }
export interface PresignedUrlResponse { uploadUrl: string; photoId: string; s3Key: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEquipments(): Observable<Equipment[]> {
    return this.http.get<Equipment[]>(`${this.base}/equipments`);
  }

  createEquipment(body: { name: string; type: string; location: string }): Observable<Equipment> {
    return this.http.post<Equipment>(`${this.base}/equipments`, body);
  }

  getEquipmentHistory(id: string): Observable<Inspection[]> {
    return this.http.get<Inspection[]>(`${this.base}/equipments/${id}/history`);
  }

  createInspection(body: { equipmentId: string; equipmentType: string; inspector: string; notes: string }): Observable<{ inspection: Inspection; checklist: ChecklistItem[] }> {
    return this.http.post<{ inspection: Inspection; checklist: ChecklistItem[] }>(`${this.base}/inspections`, body);
  }

  getInspection(id: string): Observable<{ inspection: Inspection; checklist: ChecklistItem[] }> {
    return this.http.get<{ inspection: Inspection; checklist: ChecklistItem[] }>(`${this.base}/inspections/${id}`);
  }

  saveChecklist(inspectionId: string, items: ChecklistItem[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/inspections/${inspectionId}/checklist`, { items });
  }

  getPresignedUrl(inspectionId: string): Observable<PresignedUrlResponse> {
    return this.http.get<PresignedUrlResponse>(`${this.base}/photos/presigned-url`, { params: { inspectionId } });
  }

  analyzePhoto(photoId: string, inspectionId: string): Observable<DefectAnalysis> {
    return this.http.post<DefectAnalysis>(`${this.base}/photos/${photoId}/analyze`, { inspectionId });
  }

  generateReport(inspectionId: string): Observable<{ downloadUrl: string; pdfKey: string }> {
    return this.http.post<{ downloadUrl: string; pdfKey: string }>(`${this.base}/inspections/${inspectionId}/report`, {});
  }
}
