//===============================================================
// RNG state storage buffer
//==s=============================================================
export function rngStateBufferGen(device, width, height) {
	const seedArray = new ArrayBuffer(width * height * 4);
	const seedView  = new DataView(seedArray);
	const uintMax   = 4294967295;

	for (var i = 0; i < width * height; i++) {
		seedView.setUint32(
			i * 4,
			Math.floor(Math.random() * uintMax),
			true
		);
	}

	const buffer = device.createBuffer({
		label: 'RNG state storage',
		size : seedArray.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(buffer, 0, seedArray);

	// return necessary objects
	return {
		rngStateBuffer: buffer
	};
}
//===============================================================