import * as df from "durable-functions"
import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const INSTANCE_ID = 'DISPATCH-ORCHESTRATOR';

const httpStart: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
    const client = df.getClient(context);

    const existingInstance = await client.getStatus(INSTANCE_ID);

    if (existingInstance) {
        client.terminate(INSTANCE_ID, 'Terminated by DFHttpStarter');
    }

    const instanceId = await client.startNew(req.params.functionName, INSTANCE_ID);

    context.log(`Started orchestration with ID = '${instanceId}'.`);

    return client.createCheckStatusResponse(context.bindingData.req, instanceId);
};

export default httpStart;
