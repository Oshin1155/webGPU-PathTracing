//===============================================================
// bind group
//===============================================================
export function bindGroupGen(device, pipeline, ...buffers) {
	const bindGroup = device.createBindGroup({
		label  : 'my bind group',
		layout : pipeline.getBindGroupLayout(0),
		entries: [
			{binding: 0, resource: {buffer: buffers[0]}},
			{binding: 1, resource: {buffer: buffers[1]}},
			{binding: 2, resource: {buffer: buffers[2]}},
			{binding: 3, resource: {buffer: buffers[3]}},
			{binding: 4, resource: {buffer: buffers[4]}}
		]
	});

	return {
		bindGroup: bindGroup
	};
}
//===============================================================