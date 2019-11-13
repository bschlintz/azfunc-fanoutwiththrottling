import * as df from "durable-functions"
import { IGetWorkItemsInput } from "../shared/models/IGetWorkItemsInput";
import { IWorkerActivityOutput } from "../shared/models/IWorkerActivityOutput";
import { IGetWorkItemsOutput } from "../shared/models/IGetWorkItemsOutput";

const orchestrator = df.orchestrator(function* (context) {
    let outputs = [];

    const getWorkItemsInput: IGetWorkItemsInput = { mode: 'Incremental' };
    const getWorkItemsOutput: IGetWorkItemsOutput = yield context.df.callActivity("DFGetWorkItemsActivity", getWorkItemsInput);

    for (let idx = 0; idx < getWorkItemsOutput.workItems.length; idx++) {
        const workItem = getWorkItemsOutput.workItems[idx];
        const workerOutput: IWorkerActivityOutput = yield context.df.callActivity("DFWorkerActivity", { workItem });
        outputs.push(workerOutput);
    }

    return outputs;
});

export default orchestrator;
