//===============================================================
// initialize webGPU
//===============================================================
export async function initialize(width = 800, height = 600) {
	const adapter = await navigator.gpu.requestAdapter();
	const device  = await adapter.requestDevice();
	const canvas  = document.getElementById('screen');

	canvas.width  = width;
	canvas.height = height;

	const canvasFormat  = navigator.gpu.getPreferredCanvasFormat();
	const webgpuContext = canvas.getContext('webgpu');
	webgpuContext.configure({
		device: device,
		format: canvasFormat,
	});

	// return necessary objects
	return {
		device : device,
		width  : width,
		height : height,
		format : canvasFormat,
		context: webgpuContext,
	};
}
//===============================================================