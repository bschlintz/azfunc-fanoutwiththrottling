import { AzureFunction, Context } from "@azure/functions"
import { IGetWorkItemsInput } from "../shared/models/IGetWorkItemsInput";
import { IGetWorkItemsOutput } from "../shared/models/IGetWorkItemsOutput";
// import { v4 as uuid } from "uuid";
import { IWorkItem, WorkItemStatus } from "../shared/models/IWorkItem";

const activityFunction: AzureFunction = async function (context: Context): Promise<IGetWorkItemsOutput> {
    const input: IGetWorkItemsInput = context.bindings.input;
    let output: IGetWorkItemsOutput = {
        workItems: []
    };

    if (input.mode === 'Incremental') {
        const INCREMENTAL_MAX_WORK_ITEMS = 100;
        for (let index = 0; index < INCREMENTAL_MAX_WORK_ITEMS; index++) {
            output.workItems.push(newWorkItem(`WORK-ITEM-${index}`))        
        }
    }
    else if (input.mode === 'Full') {
        const FULL_MAX_WORK_ITEMS = 1000;
        for (let index = 0; index < FULL_MAX_WORK_ITEMS; index++) {
            output.workItems.push(newWorkItem(`WORK-ITEM-${index}`))        
        }
    }

    return output;
};

const newWorkItem = (id: string): IWorkItem => {
    return {
        id,
        status: WorkItemStatus.New,
        result: null
    }
}

export default activityFunction;
