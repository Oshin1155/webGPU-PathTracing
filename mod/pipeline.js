//===============================================================
// gpu render pipeline
//===============================================================
export async function pipelineGen(device, layout) {
	const loadModuleFrom = async path => {
		const res = await fetch(path);
		const src = await res.text();
		return device.createShaderModule({code: src});
	};

	const vertexModule   = await loadModuleFrom('../shader/vertex.wgsl');
	const fragmentModule = await loadModuleFrom('../shader/fragment.wgsl');

	const descriptor = {
		label    : 'path tracing rendering pipeline',
		layout   : 'auto',
		primitive: {
			topology: 'triangle-list'
		},
		vertex: {
			module    : vertexModule,
			entryPoint: 'vs_main',
			buffers   : [layout]
		},
		fragment: {
			module    : fragmentModule,
			entryPoint: 'fs_main',
			targets   : [{format: navigator.gpu.getPreferredCanvasFormat()}],
		}
	};

	const renderPipeline = device.createRenderPipeline(descriptor);

	// return necessary objects
	return {
		pipeline: renderPipeline
	};
}
//===============================================================