import * as df from "durable-functions"
import { IWorkManagerInput } from "../shared/models/IWorkManagerInput";
import { IWorkManagerOutput } from "../shared/models/IWorkManagerOutput";
import { IWorkerSubOrchestratorOutput } from "../shared/models/IWorkerSubOrchestratorOutput";
import { IWorkItem } from "../shared/models/IWorkItem";
import { IWorkerSubOrchestratorInput } from "../shared/models/IWorkerSubOrchestratorInput";
import { parseISO } from "date-fns";

const SUBORCHESTRATOR_INSTANCE_ID = 'WORKER-SUBORCHESTRATOR';
const BATCH_MULTIPLIER = 4;
const MAX_BATCH_SIZE = 128;
const MIN_BATCH_SIZE = 2;

const orchestrator = df.orchestrator(function* (context) {
    const workManagerInput: IWorkManagerInput = { mode: 'Full' };
    const workManagerOutput: IWorkManagerOutput = yield context.df.callActivity("DFWorkManagerActivity", workManagerInput);

    // Set Initial Batch Size
    let BATCH_SIZE = MIN_BATCH_SIZE;
    let BATCH: IWorkItem[] = [];
    let LAST_BATCH_FAILED = false;

    for (let idx = 0; idx < workManagerOutput.workItems.length || BATCH.length > 0; idx++) {
        const workItem = workManagerOutput.workItems[idx];
        if (workItem) BATCH.push(workItem);
        
        // EXECUTE IF: Last Batch Failed -OR- Hit Batch Limit -OR- Hit Last Work Item
        const executeBatch = LAST_BATCH_FAILED || (BATCH.length % BATCH_SIZE) === 0 || (idx + 1) === workManagerOutput.workItems.length;

        if (executeBatch) {
            const batchInput: IWorkerSubOrchestratorInput = {
                workItems: BATCH
            }            
            const batchOutput: IWorkerSubOrchestratorOutput = yield context.df.callSubOrchestrator(
                "DFWorkerSubOrchestrator", batchInput, SUBORCHESTRATOR_INSTANCE_ID
            );

            // CLEAR BATCH ARRAY
            BATCH = [];

            // SUCCESS
            if (batchOutput.success) {
                BATCH_SIZE = incrementBatchSize(BATCH_SIZE);
                LAST_BATCH_FAILED = false;
            }
            // AT LEAST ONE FAILED OR THROTTLED
            else {
                
                //THROTTLED - GO TO SLEEP UNTIL RETRY-AFTER DATE
                if (batchOutput.retryAfterDateString) {
                    const retryAfter = parseISO(batchOutput.retryAfterDateString);
                    yield context.df.createTimer(retryAfter);
                }
                
                BATCH_SIZE = resetBatchSize();
                LAST_BATCH_FAILED = true;

                //CHECK FAILED - RE-ADD FAILED TO BATCH ARRAY
                if (batchOutput.failedWorkItems && batchOutput.failedWorkItems.length > 0) {
                    BATCH.push(...batchOutput.failedWorkItems);
                }

                //CHECK THROTTLED - RE-ADD THROTTLED TO BATCH ARRAY
                if (batchOutput.throttledWorkItems && batchOutput.throttledWorkItems.length > 0) {
                    BATCH.push(...batchOutput.throttledWorkItems);
                }
            }
        }
    }
});

const incrementBatchSize = (current: number): number => {
    let batchSize = current;

    if (batchSize < MAX_BATCH_SIZE) {
        batchSize = current * BATCH_MULTIPLIER;
    }
    else {
        batchSize = MAX_BATCH_SIZE;
    }

    return batchSize;
}

const resetBatchSize = (): number => {
    return MIN_BATCH_SIZE;
}

export default orchestrator;
