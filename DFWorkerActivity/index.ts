import { AzureFunction, Context } from "@azure/functions"
import { IWorkerActivityOutput } from "../shared/models/IWorkerActivityOutput";
import { WorkItemStatus } from "../shared/models/IWorkItem";
import { addSeconds } from "date-fns";
import * as faker from "faker";
import { IWorkerActivityInput } from "../shared/models/IWorkerActivityInput";

const activityFunction: AzureFunction = async function (context: Context): Promise<IWorkerActivityOutput> {
    const input: IWorkerActivityInput = context.bindings.input;
    let output: IWorkerActivityOutput = null;

    //Fake an async call that takes between 0-1 seconds
    await fakeAsyncCall((Math.random() * 1) * 1000) 

    //5% of the time, return Throttle status, pause for 20 seconds
    if (Math.random() < 0.15) {
        output = {
            ...input.workItem,
            status: WorkItemStatus.Throttled,
            retryAfterDateString: addSeconds(new Date(), 20).toISOString()
        }
    }
    //5% of the time, return Failed status
    else if (Math.random() < 0.05) {
        output = {
            ...input.workItem,
            status: WorkItemStatus.Failed
        }
    }    
    //OK, return Complete status
    else output = {
        ...input.workItem,
        status: WorkItemStatus.Complete,
        result: faker.random.words()
    }   

    if (output.status === WorkItemStatus.Complete) {
        context.log(`[${output.id}] [COMPLETE] ${output.result}`);
    }
    else if (output.status === WorkItemStatus.Throttled) {
        context.log(`[${output.id}] [THROTTLED] Sleep until ${output.retryAfterDateString}`);
    }
    else if (output.status === WorkItemStatus.Failed) {
        context.log(`[${output.id}] [FAILED]`);
    }

    return output;
};

const fakeAsyncCall = async (callDurationMs): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, callDurationMs));
}

export default activityFunction;
