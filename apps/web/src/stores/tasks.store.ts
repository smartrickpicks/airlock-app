import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import {
  MOCK_TASKS,
  MOCK_CURRENT_USER_ID,
  type Task,
  type TaskStatus,
  type TaskSeverity,
  type TaskType,
  type ModuleType,
} from "@/lib/mock-tasks";
import { mergeDemoTasks } from "@/stores/demo-lifecycle.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface TaskFilters {
  status: TaskStatus | "all";
  severity: TaskSeverity | "all";
  taskType: TaskType | "all";
  moduleType: ModuleType | "all";
  assignedTo: string | "all" | "unassigned";
  search: string;
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  currentUserId: string;

  fetchTasks: () => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  setFilter: <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K],
  ) => void;
  resetFilters: () => void;
  getFilteredTasks: () => Task[];
}

const DEFAULT_FILTERS: TaskFilters = {
  status: "all",
  severity: "all",
  taskType: "all",
  moduleType: "all",
  assignedTo: "all",
  search: "",
};

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  currentUserId: MOCK_CURRENT_USER_ID,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{ tasks: Task[] }>("/api/v1/tasks");
      set({ tasks: mergeDemoTasks(data.tasks), isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ tasks: [], isLoading: false, error: null });
      } else {
        set({
          tasks: mergeDemoTasks(MOCK_TASKS),
          isLoading: false,
          error: null,
        });
      }
    }
  },

  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t,
      ),
    })),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  getFilteredTasks: () => {
    const { tasks, filters } = get();
    return tasks.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.severity !== "all" && t.severity !== filters.severity)
        return false;
      if (filters.taskType !== "all" && t.taskType !== filters.taskType)
        return false;
      if (filters.moduleType !== "all" && t.moduleType !== filters.moduleType)
        return false;
      if (filters.assignedTo === "unassigned" && t.assignedTo !== null)
        return false;
      if (
        filters.assignedTo !== "all" &&
        filters.assignedTo !== "unassigned" &&
        t.assignedTo !== filters.assignedTo
      )
        return false;
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  },
}));
