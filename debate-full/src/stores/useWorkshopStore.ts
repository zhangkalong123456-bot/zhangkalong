import { create } from 'zustand';

interface WorkshopState {
  documentContent: string;
  reviewResult: string;
  reviewLoading: boolean;
  activeTab: 'whiteboard' | 'editor' | 'review';

  // Draft workflow
  draftId: number | null;
  workflowStatus: string; // 'draft' | 'teacher_reviewing' | 'ai_reviewed' | 'final'
  savedDrafts: any[];

  setDocumentContent: (content: string) => void;
  setReviewResult: (result: string) => void;
  setReviewLoading: (loading: boolean) => void;
  setActiveTab: (tab: 'whiteboard' | 'editor' | 'review') => void;
  setDraftId: (id: number | null) => void;
  setWorkflowStatus: (status: string) => void;
  setSavedDrafts: (drafts: any[]) => void;
}

export const useWorkshopStore = create<WorkshopState>((set) => ({
  documentContent: '',
  reviewResult: '',
  reviewLoading: false,
  activeTab: 'whiteboard',

  draftId: null,
  workflowStatus: '',
  savedDrafts: [],

  setDocumentContent: (content) => set({ documentContent: content }),
  setReviewResult: (result) => set({ reviewResult: result }),
  setReviewLoading: (loading) => set({ reviewLoading: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDraftId: (id) => set({ draftId: id }),
  setWorkflowStatus: (status) => set({ workflowStatus: status }),
  setSavedDrafts: (drafts) => set({ savedDrafts: drafts }),
}));
