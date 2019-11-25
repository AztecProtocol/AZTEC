import {
    warnLog,
} from '~/utils/log';
import {
    argsError,
} from '~/utils/error';
import * as schemas from './schemas';

const formatError = (error) => {
    const msg = error.toString();
    return msg.replace(/^Error:/i, '').trim();
};

export default function validateParameters(proofType, params) {
    const schema = schemas[proofType];
    if (!schema) {
        warnLog(`Schema for proof '${proofType}' is not defined.`);
        return null;
    }

    const errors = schema.validate(params);
    if (errors && errors.length > 0) {
        return argsError('input.invalid', {
            messages: errors.map(formatError),
        });
    }

    return null;
}