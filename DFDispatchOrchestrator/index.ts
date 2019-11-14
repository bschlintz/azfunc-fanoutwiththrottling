import * as df from "durable-functions"
import { IWorkManagerInput } from "../shared/models/IWorkManagerInput";
import { IWorkerActivityOutput } from "../shared/models/IWorkerActivityOutput";
import { IWorkManagerOutput } from "../shared/models/IWorkManagerOutput";
import { IWorkerSubOrchestratorOutput } from "../shared/models/IWorkerSubOrchestratorOutput";
import { IWorkItem } from "../shared/models/IWorkItem";
import { IWorkerSubOrchestratorInput } from "../shared/models/IWorkerSubOrchestratorInput";
import { parseISO, isAfter, isBefore } from "date-fns";

const SUBORCHESTRATOR_INSTANCE_ID = 'WORKER-SUBORCHESTRATOR';
const BATCH_MULTIPLIER = 2;
const MAX_BATCH_SIZE = 32;
const MIN_BATCH_SIZE = 1;

const orchestrator = df.orchestrator(function* (context) {
    // let outputs = [];

    const workManagerInput: IWorkManagerInput = { mode: 'Incremental' };
    const workManagerOutput: IWorkManagerOutput = yield context.df.callActivity("DFWorkManagerActivity", workManagerInput);

    // for (let idx = 0; idx < workManagerOutput.workItems.length; idx++) {
    //     const workItem = workManagerOutput.workItems[idx];
    //     const workerOutput: IWorkerActivityOutput = yield context.df.callActivity("DFWorkerActivity", { workItem });
    //     outputs.push(workerOutput);
    // }

    // Set Initial Batch Size
    let BATCH_SIZE = MIN_BATCH_SIZE;
    let BATCH: IWorkItem[] = [];

    for (let idx = 0; idx < workManagerOutput.workItems.length; idx++) {
        const executeBatch = (idx % BATCH_SIZE) === 0 || (idx + 1) === workManagerOutput.workItems.length;
        const workItem = workManagerOutput.workItems[idx];

        if (BATCH.length < BATCH_SIZE) {
            BATCH.push(workItem);
        }

        if (executeBatch) {
            const subOrchestratorInput: IWorkerSubOrchestratorInput = {
                workItems: BATCH
            }            
            const subOrchestratorOutput: IWorkerSubOrchestratorOutput = yield context.df.callSubOrchestrator("DFWorkerSubOrchestrator", subOrchestratorInput, SUBORCHESTRATOR_INSTANCE_ID);

            // SUCCESS
            if (subOrchestratorOutput.success) {
                BATCH = [];
                BATCH_SIZE = (BATCH_SIZE >= MAX_BATCH_SIZE) ? BATCH_SIZE : BATCH_SIZE * BATCH_MULTIPLIER;
            }
            // AT LEAST ONE FAILED OR THROTTLED
            else {
                BATCH = [];

                //THROTTLED - GO TO SLEEP UNTIL RETRY-AFTER DATE
                if (subOrchestratorOutput.retryAfterDateString) {
                    const retryAfter = parseISO(subOrchestratorOutput.retryAfterDateString);
                    if (isBefore(context.df.currentUtcDateTime, retryAfter)) {
                        context.log(`------ [${context.executionContext.functionName}] [THROTTLED] [SLEEP UNTIL ==> ${subOrchestratorOutput.retryAfterDateString}]`);
                    }
                    yield context.df.createTimer(retryAfter);
                }

                //CHECK FAILED
                if (subOrchestratorOutput.failedWorkItems && subOrchestratorOutput.failedWorkItems.length > 0) {
                    BATCH.push(...subOrchestratorOutput.failedWorkItems);
                }

                //CHECK THROTTLED
                if (subOrchestratorOutput.throttledWorkItems && subOrchestratorOutput.throttledWorkItems.length > 0) {
                    BATCH.push(...subOrchestratorOutput.throttledWorkItems);
                    BATCH_SIZE = BATCH.length;
                }
            }
        }
    }
});

export default orchestrator;
