import { initialize        } from './mod/initialize.js';
import { vertexBufferGen   } from './mod/vertex.js';
import { indexBufferGen    } from './mod/index.js';
import { pipelineGen       } from './mod/pipeline.js';
import { uniformBufferGen,
		 updateUniform     } from './mod/uniform.js';
import { rngStateBufferGen } from './mod/rngstate.js';
import { resultBufferGen   } from './mod/resultStorage.js';
import { sceneBufferGen    } from './mod/scene.js';
import { updateFrame       } from './mod/manager.js';




// execute rendering
window.addEventListener('DOMContentLoaded', main);


async function main() {
	// samples per pixel
	const MAX_SPP = 20000;
	let       SPP = 0;

	// initialize webGPU
	const startTime = performance.now();
	const {device, width, height, format, context} = await initialize(1280, 720);

	// vertex & index buffer
	const {vertexBuffer, vertexBufferLayout} = vertexBufferGen(device);
	const {indexBuffer , indexNumber       } =  indexBufferGen(device);

	// rendering pipeline
	const {pipeline} = await pipelineGen(device, vertexBufferLayout, format);

	// bind group components @binding(0) - @binding(4)
	const {uniformBuffer} = uniformBufferGen(device);
	const {rngStateBuffer} = rngStateBufferGen(device, width, height);
	const {resultBuffer} = resultBufferGen(device, width, height);
	const {primitiveBuffer, materialBuffer, primitiveNumber} = sceneBufferGen(device);

	// bind group settings
	const bindGroup = device.createBindGroup({
		label  : 'my bind group',
		layout : pipeline.getBindGroupLayout(0), // @group(0)
		entries: [
			// @binding(0)
			{binding: 0, resource: {buffer: uniformBuffer  }},
			// @binding(1)
			{binding: 1, resource: {buffer: rngStateBuffer }},
			// @binding(2)
			{binding: 2, resource: {buffer: resultBuffer   }},
			// @binding(3)
			{binding: 3, resource: {buffer: primitiveBuffer}},
			// @binding(4)
			{binding: 4, resource: {buffer: materialBuffer }},
		],
	});


	// render bundle
	const buildRenderBundle = () => {
		const descriptor = {colorFormats: [format]};
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
	const render = () => {
		// update uniforms
		SPP++;
		updateFrame(SPP, MAX_SPP);
		updateUniform(device, uniformBuffer, startTime, width, height, primitiveNumber, SPP);

		const encoder = device.createCommandEncoder();
		const pass    = encoder.beginRenderPass({
			colorAttachments: [{
				clearValue: [0, 0, 0, 1],
				loadOp    : 'clear',
				storeOp   : 'store',
				view      : context.getCurrentTexture().createView(),
			}]
		});

		//===== commands =====
		pass.executeBundles([renderBundle]);
		pass.end();
		//===== commands =====

		device.queue.submit([encoder.finish()]);

		if (SPP < MAX_SPP) window.requestAnimationFrame(render);
	}

	render();
}