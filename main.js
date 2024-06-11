import { initialize        } from './mod/initialize.js';
import { vertexBufferGen   } from './mod/vertex.js';
import { indexBufferGen    } from './mod/index.js';
import { pipelineGen       } from './mod/pipeline.js';
import { uniformBufferGen,
         updateUniform     } from './mod/uniform.js';
import { rngStateBufferGen } from './mod/rngstate.js';
import { resultBufferGen   } from './mod/resultStorage.js';
import { setScene          } from './mod/scene.js';
import { bindGroupGen      } from './mod/bindgroup.js';
import { updateFrame       } from './mod/manager.js';




// execute rendering
window.addEventListener('DOMContentLoaded', main);



function main() {
	render(3000);
}



async function render(MAX_SPP = 600) {
	// samples per pixel
	let SPP = 0;

	// initialize webGPU
	const startTime = performance.now();
	const {device, width, height, context} = await initialize(1280, 720);

	// vertex & index buffer
	const {vertexBuffer, vertexBufferLayout} = vertexBufferGen(device);
	const {indexBuffer , indexNumber       } =  indexBufferGen(device);

	// rendering pipeline
	const {pipeline} = await pipelineGen(device, vertexBufferLayout);

	// bind group components @binding(0) - @binding(4)
	const {uniformBuffer}  =  uniformBufferGen(device, width, height);
	const {rngStateBuffer} = rngStateBufferGen(device, width, height);
	const {resultBuffer}   =   resultBufferGen(device, width, height);
	const {primitiveBuffer, materialBuffer, primitiveNumber} = setScene(device);

	// bind group settings
	const {bindGroup} = bindGroupGen(device, pipeline, uniformBuffer, rngStateBuffer, resultBuffer, primitiveBuffer, materialBuffer);


	// render bundle
	const buildRenderBundle = () => {
		const descriptor = {colorFormats: [navigator.gpu.getPreferredCanvasFormat()]};
		const encoder    = device.createRenderBundleEncoder(descriptor);
		//===== commands =====
		encoder.setPipeline(pipeline);
		encoder.setBindGroup(0, bindGroup);
		encoder.setVertexBuffer(0, vertexBuffer);
		encoder.setIndexBuffer(indexBuffer, 'uint32');
		encoder.drawIndexed(indexNumber);
		//===== commands =====
		return encoder.finish();
	};
	const renderBundle = buildRenderBundle();


	// render loop
	const loop = () => {
		// update uniforms
		SPP++;
		updateFrame(SPP, MAX_SPP);
		updateUniform(device, uniformBuffer, startTime, width, height, primitiveNumber, SPP);

		// render settings
		const encoder = device.createCommandEncoder();
		const pass    = encoder.beginRenderPass({
			colorAttachments: [{
				clearValue: [0, 0, 0, 1],
				loadOp    : 'clear',
				storeOp   : 'store',
				view      : context.getCurrentTexture().createView(),
			}]
		});
		pass.executeBundles([renderBundle]);
		pass.end();
		device.queue.submit([encoder.finish()]);

		if (SPP < MAX_SPP) window.requestAnimationFrame(loop);
	}

	loop();
}