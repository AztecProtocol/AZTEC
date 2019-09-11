import {
    warnLog,
} from '~utils/log';
import dataKeyConfig from '~config/dataKey';

export default function dataKey(type, data, config = dataKeyConfig) {
    const pattern = typeof type === 'string' && type.match(/{([^{}]+)}/)
        ? type
        : config[type];

    if (!pattern) {
        return '';
    }

    return pattern.replace(/{([^{}]+)}/ig, (_, key) => {
        if (!(key in data)) {
            warnLog(`Data '${key}' not found for type '${type}'.`);
            return _;
        }
        return data[key];
    });
}