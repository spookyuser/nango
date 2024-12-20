import { describe, expect, it } from 'vitest';
import { fargateNodeProvider } from './fargate.js';
import type { Node } from '@nangohq/fleet';
// import type { CommitHash } from '@nangohq/types';

describe('Node provider', () => {
    it('start', async () => {
        const node: Node = {
            id: 1,
            routingId: 'test',
            deploymentId: 1,
            state: 'PENDING',
            createdAt: new Date(),
            url: '',
            image: 'nangohq/nango-runner:7723a664402a27129733496f21aeeeb39ec0055e',
            cpuMilli: 512,
            memoryMb: 1024,
            storageMb: 20,
            error: null,
            lastStateTransitionAt: new Date()
        };
        const res = await fargateNodeProvider.start(node);
        if (res.isOk()) {
            console.log(res.value);
        } else {
            console.error(res.error);
        }
        expect(res.isOk()).toBe(true);
    });
});
