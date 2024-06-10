//===============================================================
// vertex buffer settings
//===============================================================
export function vertexBufferGen(device) {
	const array = new Float32Array([
		// float32x4 position x 4
		-1, -1,  0,  1,
		 1, -1,  0,  1,
		 1,  1,  0,  1,
		-1,  1,  0,  1,
	]);

	const buffer = device.createBuffer({
		label: 'screen polygon vertices',
		size : array.byteLength,
		usage: GPUBufferUsage.VERTEX
			 | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(buffer, 0, array);

	const layout = {
		arrayStride: 4 * 4, // 4floats, 4bytes each
		attributes : [{
			format: 'float32x4',
			offset: 0,
			shaderLocation: 0,
		}]
	};

	// return necessary objects
	return {
		vertexBuffer: buffer,
		vertexBufferLayout: layout,
	};
}
//===============================================================
