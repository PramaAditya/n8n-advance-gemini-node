const path = require('path');
const { task, src, dest } = require('gulp');
const fs = require('fs');

task('build:icons', copyIcons);

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	// Only copy credentials icons if the directory exists
	const credPath = path.resolve('credentials');
	if (fs.existsSync(credPath)) {
		const credSource = path.resolve('credentials', '**', '*.{png,svg}');
		const credDestination = path.resolve('dist', 'credentials');
		return src(credSource).pipe(dest(credDestination));
	}
	
	// Return a completed stream if credentials directory doesn't exist
	return Promise.resolve();
}
