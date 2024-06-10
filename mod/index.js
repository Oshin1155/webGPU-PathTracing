//===============================================================
// index buffer settings
//===============================================================
export function indexBufferGen(device) {
	const array = new Uint32Array([
		0, 1, 2, 2, 3, 0
	]);

	const count = array.length;

	const buffer = device.createBuffer({
		label: 'screen polygon indices',
		size : array.byteLength,
		usage: GPUBufferUsage.INDEX
			 | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(buffer, 0, array);

	// return necessary objects
	return {
		indexBuffer: buffer,
		indexNumber: count
	};
}
//===============================================================