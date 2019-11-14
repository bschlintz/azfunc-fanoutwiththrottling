import { IWorkItem } from "./IWorkItem";

export interface IWorkerSubOrchestratorOutput {
    success: boolean;
    failedWorkItems?: IWorkItem[];
    throttledWorkItems?: IWorkItem[];
    retryAfterDateString?: string;
}