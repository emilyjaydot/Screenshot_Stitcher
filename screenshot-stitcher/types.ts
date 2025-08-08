export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export interface AnalysisIssue {
  type: 'GAP' | 'SIMILARITY';
  indices: [number, number];
  reason: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  commonHeaderHeight: number;
}