import type { Node, NodeProvider } from '@nangohq/fleet';
import { Err, Ok } from '@nangohq/utils';
import { envs } from '../env.js';
import { ECS } from './aws/ecs.js';
import { getPersistAPIUrl, getProvidersUrl } from '@nangohq/shared';

const ecs = new ECS({ region: envs.RUNNER_AWS_REGION });

export const fargateNodeProvider: NodeProvider = {
    defaultNodeConfig: {
        image: 'nangohq/nango-runner',
        cpuMilli: 512,
        memoryMb: 512,
        storageMb: 20000
    },
    start: async (node: Node) => {
        const name = serviceName(node);
        const taskDefinition = await ecs.createTaskDefinition({
            name,
            image: node.image,
            envVars: {
                NODE_ENV: envs.NODE_ENV,
                NANGO_CLOUD: String(envs.NANGO_CLOUD),
                NODE_OPTIONS: `--max-old-space-size=${Math.floor((node.memoryMb / 4) * 3)}`,
                RUNNER_NODE_ID: `${node.id}`,
                IDLE_MAX_DURATION_MS: `${25 * 60 * 60 * 1000}`, // 25 hours
                NANGO_TELEMETRY_SDK: process.env['NANGO_TELEMETRY_SDK'] || 'false',
                ...(envs.DD_ENV ? { DD_ENV: envs.DD_ENV } : {}),
                ...(envs.DD_SITE ? { DD_SITE: envs.DD_SITE } : {}),
                ...(envs.DD_TRACE_AGENT_URL ? { DD_TRACE_AGENT_URL: envs.DD_TRACE_AGENT_URL } : {}),
                PERSIST_SERVICE_URL: getPersistAPIUrl(),
                JOBS_SERVICE_URL: envs.JOBS_SERVICE_URL,
                PROVIDERS_URL: getProvidersUrl(),
                PROVIDERS_RELOAD_INTERVAL: envs.PROVIDERS_RELOAD_INTERVAL.toString()
            },
            cpuMilli: node.cpuMilli,
            memoryMb: node.memoryMb,
            port: 80,
            logsGroup: envs.RUNNER_AWS_LOGS_GROUP,
            executionRoleArn: envs.RUNNER_AWS_EXECUTION_ROLE_ARN
        });
        if (taskDefinition.isErr()) {
            return Err(new Error('Failed to create task definition', { cause: taskDefinition.error }));
        }

        const svc = await ecs.createService({
            name,
            cluster: envs.RUNNER_AWS_ECS_CLUSTER,
            taskDefinition: name,
            subnets: envs.RUNNER_AWS_SUBNETS,
            securityGroups: envs.RUNNER_AWS_SECURITY_GROUPS
        });

        if (svc.isErr()) {
            return Err(new Error('Failed to create ECS service', { cause: svc.error }));
        }

        return Ok(undefined);
    },
    terminate: async (node: Node) => {
        return ecs.deleteService({ cluster: envs.RUNNER_AWS_ECS_CLUSTER, name: serviceName(node) });
    },
    verifyUrl: (_url) => {
        // TODO:
        return Promise.resolve(Ok(undefined));
    }
};

function serviceName(node: Node) {
    return `${node.routingId}-${node.id}`;
}
