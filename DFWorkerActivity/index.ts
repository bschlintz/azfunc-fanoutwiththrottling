import { AzureFunction, Context } from "@azure/functions"
import { IWorkerActivityOutput } from "../shared/models/IWorkerActivityOutput";
import { WorkItemStatus } from "../shared/models/IWorkItem";
import { addMinutes } from "date-fns";
import * as faker from "faker";
import { IWorkerActivityInput } from "../shared/models/IWorkerActivityInput";

const activityFunction: AzureFunction = async function (context: Context): Promise<IWorkerActivityOutput> {
    const input: IWorkerActivityInput = context.bindings.input;
    let output: IWorkerActivityOutput = null;

    //Fake an async call that takes between 0-5 seconds
    await fakeAsyncCall((Math.random() * 5) * 1000) 

    //10% of the time, return Throttle status
    if (Math.random() < 0.10) {
        output = {
            ...input.workItem,
            status: WorkItemStatus.Throttled,
            throttledUntilDate: addMinutes(new Date(), 2)
        }
    }

    //2% of the time, return Failed status
    if (Math.random() < 0.02) {
        output = {
            ...input.workItem,
            status: WorkItemStatus.Failed
        }
    }
    
    //OK, return Complete status
    output = {
        ...input.workItem,
        status: WorkItemStatus.Complete,
        result: faker.random.words()
    }   

    if (output.status === WorkItemStatus.Complete) {
        console.log(`[${output.id}] [COMPLETE] ${output.result}`);
    }
    else if (output.status === WorkItemStatus.Throttled) {
        console.log(`[${output.id}] [THROTTLED] Sleep until ${output.throttledUntilDate}`);
    }
    else if (output.status === WorkItemStatus.Failed) {
        console.log(`[${output.id}] [FAILED]`);
    }

    return output;
};

const fakeAsyncCall = async (callDurationMs): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, callDurationMs));
}

export default activityFunction;
