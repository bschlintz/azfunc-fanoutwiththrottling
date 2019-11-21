import { AzureFunction, Context } from "@azure/functions"
import { IWorkManagerInput } from "../shared/models/IWorkManagerInput";
import { IWorkManagerOutput } from "../shared/models/IWorkManagerOutput";
import { IWorkItem, WorkItemStatus } from "../shared/models/IWorkItem";

const activityFunction: AzureFunction = async function (context: Context): Promise<IWorkManagerOutput> {
    const input: IWorkManagerInput = context.bindings.input;
    let output: IWorkManagerOutput = {
        workItems: []
    };

    if (input.mode === 'Incremental') {
        const INCREMENTAL_MAX_WORK_ITEMS = 100;
        for (let index = 0; index < INCREMENTAL_MAX_WORK_ITEMS; index++) {
            output.workItems.push(newWorkItem(index))        
        }
    }
    else if (input.mode === 'Full') {
        const FULL_MAX_WORK_ITEMS = 500;
        for (let index = 0; index < FULL_MAX_WORK_ITEMS; index++) {
            output.workItems.push(newWorkItem(index))        
        }
    }

    return output;
};

const newWorkItem = (index: number): IWorkItem => {
    return {
        id: newIdFromIndex(index),
        status: WorkItemStatus.New,
        result: null
    }
}

const newIdFromIndex = (index: number): string => {
    let indexStr = `${index}`;
    while (indexStr.length < 4) indexStr = `0${indexStr}`;
    return `WORK-ITEM-${indexStr}`;
}

export default activityFunction;
