//===============================================================
// scene storage buffer
//===============================================================
export function setScene(device) {
	// scene settings
	const cornelBoxScene = new Scene();

	cornelBoxScene.add(
		// red wall left
		(new GeometryBuilder())
		.color(0.99, 0.3, 0.3)
		.lambertian()
		.planeYZ(-1, -1, -1, 2, 2)
		.build(),

		// green wall right
		(new GeometryBuilder())
		.color(0.3, 0.99, 0.3)
		.lambertian()
		.planeYZ( 1, -1, -1, 2, 2)
		.build(),

		// white walls x3
		(new GeometryBuilder())
		.color(0.7, 0.7, 0.7)
		.lambertian()
		.planeXZ(-1, -1, -1, 2, 2)
		.build(),

		(new GeometryBuilder())
		.color(0.7, 0.7, 0.7)
		.lambertian()
		.planeXZ(-1,  1, -1, 2, 2)
		.build(),

		(new GeometryBuilder())
		.color(0.7, 0.7, 0.7)
		.lambertian()
		.planeXY(-1, -1, -1, 2, 2)
		.build(),

		// sphere
		(new GeometryBuilder())
		.color(1.0, 1.0, 1.0)
		.metal()
		.sphere(0.5, -0.7, 0.2, 0.3)
		.build(),

		(new GeometryBuilder())
		.color(1.0, 1.0, 1.0)
		.glass(1.8)
		.sphere(-0.3, -0.5, -0.3, 0.5)
		.build(),

		// light
		(new GeometryBuilder())
		.light(20, 20, 20)
		.lambertian()
		.planeXZ(-0.2, 0.99, -0.2, 0.4, 0.4)
		.build()
	);

	const {primitiveArray, materialArray, primitiveNumber} = cornelBoxScene.build();

	// buffers
	const primitiveBuffer = device.createBuffer({
		label: 'primitives',
		size : primitiveArray.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});

	const materialBuffer  = device.createBuffer({
		label: 'materials',
		size : materialArray.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(primitiveBuffer, 0, primitiveArray);
	device.queue.writeBuffer(materialBuffer,  0, materialArray );

	// return necessary objects
	return {
		primitiveBuffer: primitiveBuffer,
		materialBuffer : materialBuffer,
		primitiveNumber: primitiveNumber
	};
}
//===============================================================






//===============================================================
// Scene
//===============================================================
class Scene {
	constructor() {
		this.geometryList = [];
	}

	// add geometries
	add(...geometries) {
		for (const geometry of geometries) {
			this.geometryList.push(geometry);
		}
	}

	// build and create primitive and material array
	build() {
		// the number of primitives in the scene
		const number = this.geometryList.length;
	
		// result array
		const primitiveArray = new ArrayBuffer(number * 64);
		const materialArray  = new ArrayBuffer(number * 32);

		// result view
		const pview = new DataView(primitiveArray);
		const mview = new DataView(materialArray);

		// write data
		for (var i = 0; i < number; i++) {
			// current geometry
			const geometry = this.geometryList[i];

			// primitives
			let offset = i * 64;
			pview.setUint32 (offset + 0, i, true); // id
			pview.setUint32 (offset + 4, geometry.shape, true);
			pview.setUint32 (offset + 8, i, true);
			// padding(4)
			pview.setFloat32(offset +16, geometry.v0[0], true);
			pview.setFloat32(offset +20, geometry.v0[1], true);
			pview.setFloat32(offset +24, geometry.v0[2], true);
			// padding(4)
			pview.setFloat32(offset +32, geometry.v1[0], true);
			pview.setFloat32(offset +36, geometry.v1[1], true);
			pview.setFloat32(offset +40, geometry.v1[2], true);
			// padding(4)
			pview.setFloat32(offset +48, geometry.v2[0], true);
			pview.setFloat32(offset +52, geometry.v2[1], true);
			pview.setFloat32(offset +56, geometry.v2[2], true);
			// padding(4)


			// materials
			offset = i * 32;
			mview.setUint32 (offset + 0, geometry.brdf, true);
			mview.setFloat32(offset + 4, geometry.fuzz, true);
			mview.setFloat32(offset + 8, geometry.ri,   true);
			// padding(4)
			mview.setFloat32(offset +16, geometry.albedo[0], true);
			mview.setFloat32(offset +20, geometry.albedo[1], true);
			mview.setFloat32(offset +24, geometry.albedo[2], true);
			// padding(4)
		}

		return {
			primitiveArray : primitiveArray,
			materialArray  : materialArray,
			primitiveNumber: number
		};
	}
}
//===============================================================



//===============================================================
// Geometry
//===============================================================
class Geometry {
	constructor() {
		// primitive elements
		this.shape = 0;
		this.v0    = [0, 0, 0];
		this.v1    = [0, 0, 0];
		this.v2    = [0, 0, 0];

		// material elements
		this.brdf   = 0;
		this.fuzz   = 0;
		this.ri     = 0; // invalid
		this.albedo = [0, 0, 0];
	}
}
//===============================================================



//===============================================================
// Geometry builder
//===============================================================
class GeometryBuilder {
	constructor() {
		this.geometry = new Geometry();
	}

	//===== set color =====
	color(r, g, b) {
		this.geometry.albedo = [r, g, b];
		return this;
	}

	light(r, g, b) {
		this.geometry.albedo = [r, g, b];
		return this;
	}


	//===== set material =====
	lambertian() {
		this.geometry.brdf = 0;
		return this;
	}

	metal(fuzz = 0.0) {
		this.geometry.brdf = 1;
		this.geometry.fuzz = fuzz;
		return this;
	}

	glass(ri = 1.5) {
		this.geometry.brdf = 2;
		this.geometry.ri = ri;
		return this;
	}


	//===== set shape =====
	sphere(x, y, z, r) {
		this.geometry.shape = 0;
		this.geometry.v0    = [x, y, z];
		this.geometry.v1    = [r, 0, 0];
		return this;
	}

	plane(cx, cy, cz, rx, ry, rz, ux, uy, uz) {
		this.geometry.shape = 1;
		this.geometry.v0    = [cx, cy, cz];
		this.geometry.v1    = [rx, ry, rz];
		this.geometry.v2    = [ux, uy, uz];
		return this;
	}

	planeXY(x, y, z, r, u) {
		this.geometry.shape = 1;
		this.geometry.v0    = [x, y, z];
		this.geometry.v1    = [r, 0, 0];
		this.geometry.v2    = [0, u, 0];
		return this;
	}

	planeXZ(x, y, z, r, u) {
		this.geometry.shape = 1;
		this.geometry.v0    = [x, y, z];
		this.geometry.v1    = [r, 0, 0];
		this.geometry.v2    = [0, 0, u];
		return this;
	}

	planeYZ(x, y, z, r, u) {
		this.geometry.shape = 1;
		this.geometry.v0    = [x, y, z];
		this.geometry.v1    = [0, r, 0];
		this.geometry.v2    = [0, 0, u];
		return this;
	}

	//===== build =====
	build() {
		return this.geometry;
	}
}
//===============================================================