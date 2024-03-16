
console.log('utils.js: start');

export const sshConnections = {};

export function sleepMs(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function fulfillWithTimeLimit(timeLimit, task, failureValue) {
    let timeout;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
            if (failureValue instanceof Error) {
                reject(failureValue);
            }
            resolve(failureValue);
        }, timeLimit);
    });
    const response = await Promise.race([task, timeoutPromise]);
    if (timeout) { // the code works without this but let's be safe and clean up the timeout
        clearTimeout(timeout);
    }
    return response;
}

export const waitStream = (stream, status) => {
    return new Promise((resolve, reject) => {
        status.stdout = '';
        status.stderr = '';
        stream.on('close', function () {
            console.log('waitStream: on close', { status });
            return resolve({ stdout: status.stdout, stderr: status.stderr });
        }).on('data', function (data) {
            status.stdout += data.toString();
        }).stderr.on('data', function (data) {
            status.stderr += data.toString();
        });
    });
};


const project = (obj, projection) => {
    const result = {};
    for (const key in projection) {
        const value = projection[key];
        if (typeof value === 'object') {
            result[key] = project(obj[key], value);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
};

function parseProjection(projection) {
    const result = {};

    projection.split(',').forEach((path) => {
        const parts = path.split('.');
        let current = result;

        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                current[part] = 1;
            } else {
                current[part] = current[part] || {};
                current = current[part];
            }
        });
    });

    return result;
}
