import { IWorkItem } from "./IWorkItem";

export interface IWorkerActivityOutput extends IWorkItem {
    throttledUntilDate?: Date;
}