import { Fleet } from '@nangohq/fleet';
import { envs } from '../env.js';
import { localNodeProvider } from './local.js';
import { renderNodeProvider } from './render.js';
import { fargateNodeProvider } from './fargate.js';

const fleetId = 'nango_runners';
export const runnersFleet = (() => {
    switch (envs.RUNNER_TYPE) {
        case 'LOCAL':
            return new Fleet({ fleetId, nodeProvider: localNodeProvider });
        case 'RENDER':
            return new Fleet({ fleetId, nodeProvider: renderNodeProvider });
        case 'FARGATE':
            return new Fleet({ fleetId, nodeProvider: fargateNodeProvider });
        default:
            return new Fleet({ fleetId });
    }
})();
