//===============================================================
// uniform buffer settings (must set to bindgroup)
//===============================================================
export function uniformBufferGen(device, width, height) {
	const array = new Float32Array([0, width, height, 0, 0]);

	const buffer = device.createBuffer({
		label: 'uniforms',
		size : array.byteLength,
		usage: GPUBufferUsage.UNIFORM| GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(buffer, 0, array);

	// return necessary objects
	return {
		uniformBuffer: buffer
	};
}
//===============================================================

//===============================================================
// update uniform data
//===============================================================
export function updateUniform(device, buffer, start, width, height, number, spp) {
	const time = (performance.now() - start) * 0.001;

	const newArray = new Float32Array([
		time, width, height, number, spp
	]);

	device.queue.writeBuffer(buffer, 0, newArray);
}
//===============================================================