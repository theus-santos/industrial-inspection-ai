export type EquipmentType = 'maintenance' | 'welding' | 'structures' | 'equipment';
export type DefectType =
  | 'crack' | 'rust' | 'leak' | 'wear' | 'weld_failure'
  | 'damaged_part' | 'loose_bolt' | 'deformation' | 'safety_risk';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type InspectionStatus = 'open' | 'completed';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  location: string;
  createdAt: string;
}

export interface Inspection {
  id: string;
  equipmentId: string;
  inspector: string;
  notes: string;
  status: InspectionStatus;
  createdAt: string;
  defectCount?: number;
  maxSeverity?: string;
}

export interface ChecklistItem {
  id: string;
  inspectionId: string;
  label: string;
  category: string;
  checked: boolean;
}

export interface Photo {
  id: string;
  inspectionId: string;
  s3Key: string;
  createdAt: string;
  analyzedAt?: string;
}

export interface Defect {
  type: DefectType;
  severity: Severity;
  confidence: number;
  location: string;
}

export interface DefectAnalysis {
  photoId: string;
  defects: Defect[];
  summary: string;
  analyzedAt: string;
}

export const CHECKLIST_TEMPLATES: Record<EquipmentType, { category: string; label: string }[]> = {
  maintenance: [
    { category: 'Lubrificação', label: 'Nível de óleo adequado' },
    { category: 'Lubrificação', label: 'Sem vazamentos de óleo' },
    { category: 'Vibrações', label: 'Vibração dentro do normal' },
    { category: 'Temperatura', label: 'Temperatura operacional normal' },
    { category: 'Parafusos', label: 'Parafusos de fixação apertados' },
  ],
  welding: [
    { category: 'Trincas', label: 'Sem trincas visíveis' },
    { category: 'Solda', label: 'Cordão de solda uniforme' },
    { category: 'Solda', label: 'Sem porosidade na solda' },
    { category: 'Deformações', label: 'Sem deformações térmicas' },
  ],
  structures: [
    { category: 'Ferrugem', label: 'Sem pontos de ferrugem' },
    { category: 'Desgaste', label: 'Espessura da parede adequada' },
    { category: 'Segurança', label: 'Sem riscos de segurança aparentes' },
    { category: 'Segurança', label: 'Sinalização de segurança visível' },
  ],
  equipment: [
    { category: 'Peças', label: 'Sem peças danificadas' },
    { category: 'Vazamentos', label: 'Sem vazamentos de fluidos' },
    { category: 'Deformações', label: 'Estrutura sem deformações' },
    { category: 'Operação', label: 'Funcionamento dentro do esperado' },
  ],
};
