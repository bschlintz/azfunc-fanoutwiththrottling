export interface IWorkItem {
    status: WorkItemStatus;
    id: string;
    result: any;
}

export enum WorkItemStatus {
    New = "New",
    Active = "Active",
    Complete = "Complete",
    Failed = "Failed",
    Throttled = "Throttled",
}