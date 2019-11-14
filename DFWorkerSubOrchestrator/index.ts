import * as df from "durable-functions"
import { IWorkerSubOrchestratorInput } from "../shared/models/IWorkerSubOrchestratorInput";
import { IWorkerActivityOutput } from "../shared/models/IWorkerActivityOutput";
import { IWorkerActivityInput } from "../shared/models/IWorkerActivityInput";
import { IWorkerSubOrchestratorOutput } from "../shared/models/IWorkerSubOrchestratorOutput";
import { WorkItemStatus } from "../shared/models/IWorkItem";
import { isAfter, parseISO } from "date-fns";

const orchestrator = df.orchestrator(function* (context) {
    const subOrchestratorInput: IWorkerSubOrchestratorInput = context.bindings.orchestrator.input;

    let workerActivities = subOrchestratorInput.workItems.map(workItem => {
        const workerInput: IWorkerActivityInput = { workItem };
        return context.df.callActivity("DFWorkerActivity", workerInput);
    });

    if (!context.df.isReplaying) {
        context.log(`------ [${context.executionContext.functionName}] [START] [COUNT ==> ${workerActivities.length}]`);
    }

    yield context.df.Task.all(workerActivities);

    //AGGREGATE RESULTS
    let failedWorkItems: IWorkerActivityOutput[] = [];
    let throttledWorkItems: IWorkerActivityOutput[] = [];
    workerActivities.map(ti => {
        const workItemResult = ti.result as IWorkerActivityOutput;
        //CHECK FAILED WORK ITEMS
        if (workItemResult.status === WorkItemStatus.Failed) {
            failedWorkItems.push(workItemResult);
        }
        //CHECK THROTTLED WORK ITEMS
        else if (workItemResult.status === WorkItemStatus.Throttled) {
            throttledWorkItems.push(workItemResult);
        }
    });

    //GET LATEST RETRY-AFTER DATE
    let retryAfterDateString: string = null;
    if (throttledWorkItems.length > 0) {
        const retryAfter = throttledWorkItems.reduce((latestRetryAfter, workItem) => {
            const currentRetryAfter = parseISO(workItem.retryAfterDateString);
            if (isAfter(currentRetryAfter, latestRetryAfter)) {
                latestRetryAfter = currentRetryAfter;
            }
            return latestRetryAfter;
        }, new Date());
        retryAfterDateString = retryAfter.toISOString();
    }

    if (!context.df.isReplaying) {
        context.log(`------ [${context.executionContext.functionName}] [END] [FAILED ==> ${failedWorkItems.length}]`);
        context.log(`------ [${context.executionContext.functionName}] [END] [THROTTLED ==> ${throttledWorkItems.length}]`);
    }
    
    //RETURN
    const subOrchestratorOutput: IWorkerSubOrchestratorOutput = {
        success: failedWorkItems.length === 0 && throttledWorkItems.length === 0,
        throttledWorkItems,
        failedWorkItems, 
        retryAfterDateString
    };  
    return subOrchestratorOutput;
});

export default orchestrator;
