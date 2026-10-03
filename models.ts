/**
 * Hợp đồng dữ liệu cho API/model AI. Khi tích hợp backend, trả về AnalysisResult
 * theo các kiểu này; giao diện dashboard có thể dùng trực tiếp kết quả đó.
 */
export interface Student { id: string; name: string; grade: string }
export interface Subject { id: string; name: string }
export interface KnowledgePoint { id: string; name: string; description?: string }
export interface Assessment { id: string; title: string; duration: number; type?: 'practice' | 'quiz' }
export interface LearningError {
  id: string; position: string; title: string; severity: 'revisit' | 'practice' | 'good';
  studentWork?: string; correction?: string; explanation: string; tip?: string;
}
export interface LearningResource { id: string; type: 'video' | 'article' | 'exercise'; title: string; duration?: number; url?: string }
export interface AIRecommendation { message: string; priority?: 'high' | 'normal' }
export interface LearningPath { step: number; title: string; goal?: string; knowledgePointId?: string; assessmentId?: string; resourceIds?: string[] }
export interface AnalysisResult {
  student: Student; subject: Subject; knowledgePoint: KnowledgePoint; assessment: Assessment;
  learningErrors: LearningError[]; learningPath: LearningPath[];
  learningResources: LearningResource[]; aiRecommendation: AIRecommendation; sourceImage: string;
}
