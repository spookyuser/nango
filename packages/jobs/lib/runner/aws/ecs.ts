import { CreateServiceCommand, DeleteServiceCommand, ECSClient, RegisterTaskDefinitionCommand } from '@aws-sdk/client-ecs';
import { Err, Ok } from '@nangohq/utils';
import type { Result } from '@nangohq/utils';

export class ECS {
    private client: ECSClient;
    private region: string;
    constructor({ region }: { region: string }) {
        this.region = region;
        this.client = new ECSClient({ region });
    }

    async createTaskDefinition({
        name,
        image,
        envVars,
        cpuMilli,
        memoryMb,
        port,
        logsGroup,
        executionRoleArn
    }: {
        name: string;
        image: string;
        envVars: Record<string, string>;
        cpuMilli: number;
        memoryMb: number;
        port: number;
        logsGroup: string;
        executionRoleArn: string;
    }): Promise<Result<string>> {
        try {
            const environment = Object.entries(envVars).map(([name, value]) => ({
                name,
                value
            }));

            const res = await this.client.send(
                new RegisterTaskDefinitionCommand({
                    family: name,
                    requiresCompatibilities: ['FARGATE'],
                    networkMode: 'awsvpc',
                    cpu: String(cpuMilli),
                    memory: String(memoryMb),
                    executionRoleArn,
                    containerDefinitions: [
                        {
                            name: name,
                            image: image,
                            environment,
                            portMappings: [
                                {
                                    containerPort: port,
                                    protocol: 'tcp'
                                }
                            ],
                            logConfiguration: {
                                logDriver: 'awslogs',
                                options: {
                                    'awslogs-group': logsGroup,
                                    'awslogs-region': this.region,
                                    'awslogs-stream-prefix': 'runner',
                                    'awslogs-create-group': 'true'
                                }
                            }
                        }
                    ]
                })
            );

            const taskDefinitionArn = res.taskDefinition?.taskDefinitionArn;
            if (!taskDefinitionArn) {
                return Err(new Error(`Failed to create task definition`));
            }
            return Ok(taskDefinitionArn);
        } catch (err) {
            return Err(new Error(`Failed to create task definition`, { cause: err }));
        }
    }

    async createService({
        name,
        cluster,
        taskDefinition,
        subnets,
        securityGroups
    }: {
        name: string;
        cluster: string;
        taskDefinition: string;
        subnets: string[];
        securityGroups: string[];
    }): Promise<Result<void>> {
        try {
            const res = await this.client.send(
                new CreateServiceCommand({
                    serviceName: name,
                    cluster,
                    taskDefinition,
                    desiredCount: 1,
                    launchType: 'FARGATE',
                    networkConfiguration: {
                        awsvpcConfiguration: {
                            subnets,
                            securityGroups,
                            assignPublicIp: 'ENABLED'
                        }
                    }
                })
            );

            if (!res.service) {
                return Err(new Error(`Failed to create service '${name}'`));
            }
            return Ok(undefined);
        } catch (err) {
            return Err(new Error(`Failed to create ECS service`, { cause: err }));
        }
    }

    async deleteService({ cluster, name }: { cluster: string; name: string }): Promise<Result<void>> {
        try {
            const res = await this.client.send(
                new DeleteServiceCommand({
                    cluster,
                    service: name,
                    force: true
                })
            );

            if (!res.service) {
                return Err(new Error(`Failed to delete service '${name}'`));
            }
            return Ok(undefined);
        } catch (err) {
            return Err(new Error(`Failed to delete service '${name}'`, { cause: err }));
        }
    }
}
