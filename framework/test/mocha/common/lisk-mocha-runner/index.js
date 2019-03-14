/* eslint-disable no-console */

const { cpus } = require('os');
const { getTestFiles } = require('./file_manager');
const processManager = require('./process_manager');

const state = {
	terminated: false,
	mochaOptions: [],
	numberOfTestFiles: 0,
	processedCount: 0,
	queue: [],
	tests: {
		passed: {},
		failed: {},
		killed: {},
	},
};
const MAX_TASK_LIMIT = process.env.MAX_TASK_LIMIT || cpus().length;
const timeStart = process.hrtime();

const summary = () => {
	const { processedCount, numberOfTestFiles } = state;
	const { passed, failed, killed } = state.tests;
	const timeEnd = process.hrtime(timeStart);

	console.log('\n================\n');
	console.info('Summary:\n');
	console.info(`Execution time: ${timeEnd[0]}s ${timeEnd[1] / 1000000}ms\n`);
	console.info(`Total Test Files: ${numberOfTestFiles}`);
	console.info(`Processed Test Files: ${processedCount}`);
	console.log('\n\n');
	console.info(`Passed: ${Object.keys(passed).length}/${processedCount}`);
	console.info(`Failed: ${Object.keys(failed).length}/${processedCount}`);
	console.info(`Killed: ${Object.keys(killed).length}/${processedCount}`);
	console.log('\n\n');
	if (Object.keys(failed).length) {
		console.log('(Error Code):\tFailed test\n');
		console.log('=============\t===========\n');
		Object.keys(failed).forEach(file =>
			console.warn(`(${failed[file]}):\t${file}`)
		);
	}
};

const processNext = () => {
	if (!state.queue.length) {
		return null;
	}
	state.processedCount++;

	if (state.terminated) {
		return Promise.reject();
	}

	const file = state.queue[0];
	state.queue = state.queue.slice(1);
	return (
		processManager
			.spawn(file, state.mochaOptions)
			// eslint-disable-next-line no-loop-func
			.then(() => {
				state.tests.passed[file] = true;
				return processNext();
			})
			// eslint-disable-next-line no-loop-func
			.catch((code, error) => {
				const status = state.terminated ? 'killed' : 'failed';
				state.tests[status][file] = { code, error };

				console.error(`Test failed: ${file}`);
				if (state.terminated) console.info('\t--> Reason: Killed');
				if (code) console.info(`\t--> Code: ${code}`);
				if (error) console.info(`\t--> Error: ${error}`);

				// If test failed because it was terminated
				// no need to call processNext
				return state.terminated ? null : processNext();
			})
	);
};

const executeTests = (testType, testPathPattern, mochaOptions) => {
	const allTestFiles = getTestFiles(testType, testPathPattern);
	state.numberOfTestFiles = allTestFiles.length;
	state.mochaOptions = mochaOptions;
	state.queue = [...allTestFiles];
	return Promise.all(
		allTestFiles.slice(0, MAX_TASK_LIMIT).map(() => processNext())
	);
};

const [
	// eslint-disable-next-line no-unused-vars
	nodePath,
	// eslint-disable-next-line no-unused-vars
	runnerPath,
	testType,
	testPathPattern,
	...mochaOptions
] = process.argv;

process.on('SIGINT', () => {
	console.log('Test runner terminated!');
	state.terminated = true;
	processManager.killAll();
	setTimeout(() => process.exit(), 1000);
});

process.on('exit', () => {
	summary();
});

(async () => {
	await executeTests(testType, testPathPattern, mochaOptions);
})();
