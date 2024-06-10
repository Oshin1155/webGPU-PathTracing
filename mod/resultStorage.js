//===============================================================
// result storage buffer
//===============================================================
export function resultBufferGen(device, width, height) {
	const array = new ArrayBuffer(width * height * 4 * 4);
	const view  = new DataView(array);

	for (var i = 0; i < width * height * 4; i++) {
		view.setFloat32(i * 4, 0, true);
	}

	const buffer = device.createBuffer({
		label: 'result storage',
		size : array.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(buffer, 0, array);

	// return necessary objects
	return {
		resultBuffer: buffer
	};
}
//===============================================================