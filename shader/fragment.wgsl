//=============================================================================
// CONSTANTS
//=============================================================================
const kPI      : f32 = 3.14159265;
const kPI2     : f32 = 6.28318531;
const kPI_INV  : f32 = 0.31830989;
const kPI2_INV : f32 = 0.15915494;
const kINF     : f32 = 1e+20f;
const kEPS     : f32 = 1e-4f;
const kGAMMA   : f32 = 1.0; // this is unnecessary
const MAX_DEPTH: u32 = 50;
//=============================================================================





//=============================================================================
// BUFFER STRUCTURES
//=============================================================================
struct Uniforms {
	t  : f32,      // offset( 0)  size( 4)
	x  : f32,      // offset( 4)  size( 4)
	y  : f32,      // offset( 8)  size( 4)
	n  : f32,      // offset(12)  size( 4)
	spp: f32,      // offset(16)  size( 4)
}						        //size(20) bytes total

struct Primitive {
	id		: u32, // offset( 0)  size( 4)
	shape	: u32, // offset( 4)  size( 4)
	material: u32, // offset( 8)  size( 4)
	// padding     // offset(12)  size( 4)
	v0: vec3f,	   // offset(16)  size(12)
	// padding     // offset(28)  size( 4)
	v1: vec3f,     // offset(32)  size(12)
	// padding     // offset(44)  size( 4)
	v2: vec3f,     // offset(48)  size(12)
	// padding     // offset(60)  size( 4)
}								//size(64) bytes total

struct Material {
	brdf  : u32,	// offset( 0)  size( 4)
	fuzz  : f32,    // offset( 4)  size( 4)
	ri    : f32,    // offset( 8)  size( 4)
	// padding      // offset(12)  size( 4)
	albedo: vec3f,  // offset(16)  size(12)
	// padding      // offset(28)  size( 4)
}								 //size(32) bytes total

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@group(0) @binding(1)
var<storage, read_write> rng_storage: array<u32>;

@group(0) @binding(2)
var<storage, read_write> accumulation: array<vec4f>;

@group(0) @binding(3)
var<storage, read> primitives: array<Primitive>;

@group(0) @binding(4)
var<storage, read> materials: array<Material>;

// private rng state
var<private> rng_state: u32;
//=============================================================================





//=============================================================================
// UTILITIES
//=============================================================================
fn gamma(color: vec3f) -> vec4f {
	return vec4f(pow(color, vec3f(1/kGAMMA)), 1.0);
}

// Schlick's approximate formula (Freshnel's law)
fn schlick(cos: f32, ri: f32) -> f32 {
	// pls let me use pow function correctly in chrome...
	let f0 = ((1-ri)/(1+ri)) * ((1-ri)/(1+ri));
	return f0 + (1 - f0) * (1-cos)*(1-cos)*(1-cos)*(1-cos)*(1-cos);
}

// random number generator
fn xorshift32() -> u32 {
	var x = rng_state;
	x ^= x << 13u;
	x ^= x >> 17u;
	x ^= x <<  5u;
	rng_state = x;
	return x;
}

fn get_seed(pos: vec4f) {
	rng_state = rng_storage[u32(uniforms.x) * u32(pos.y) + u32(pos.x)];
}

fn set_seed(pos: vec4f) {
	rng_storage[u32(uniforms.x) * u32(pos.y) + u32(pos.x)] = rng_state;
}

fn rand() -> f32 { // [0, 1)
	return fract(f32(xorshift32()) / 4294967296.0);
}

fn random_sphere() -> vec3f {
	let y = 1 - 2 * rand();
	let p =  kPI2 * rand();
	let f = sqrt(1 - y * y);
	return vec3f(f * cos(p), y, f * sin(p));
}

fn random_unit_disk() -> vec3f {
	let t = kPI2 * rand();
	let r = sqrt(rand());
	return vec3f(r * cos(t), r * sin(t), 0);
}

// mix latest color and accumulated color
fn mix_result(pos: vec4f, next: vec4f) -> vec4f {
	let idx = u32(uniforms.x) * u32(pos.y) + u32(pos.x);
	let spp = uniforms.spp;
	let pre = accumulation[idx];
	let result = pre * (spp - 1)/spp + next / spp;
	accumulation[idx] = result;
	return result;
}
//=============================================================================





//=============================================================================
// RAY AND CAMERA STRUCTURE
//=============================================================================
struct Ray {
	o: vec3f,
	d: vec3f,
}

struct Camera {
	o: vec3f,
	u: vec3f,
	v: vec3f,
	w: vec3f,
}

fn ray_at(ray: Ray, t: f32) -> vec3f {
	return ray.o + ray.d * t;
}

fn ray_gen(uv: vec2f, camera: Camera) -> Ray {
	return Ray(
		camera.o,
		normalize(camera.w + camera.u * uv.x + camera.v * uv.y - camera.o)
	);
}

fn set_camera(origin: vec3f, lookat: vec3f, vup: vec3f, vfov: f32) -> Camera {
	let aspect = uniforms.x / uniforms.y;
	let halfh  = tan(radians(vfov) * 0.5);
	let halfw  = halfh * aspect;
	let w  = normalize(origin - lookat);
	let u  = normalize(cross(vup, w));
	let v  = cross(w, u);
	let uw = halfw * u;
	let vh = halfh * v;
	return Camera(
		origin,
		uw * 2.0,
		vh * 2.0,
		origin - uw - vh - w
	);
}
//=============================================================================





//=============================================================================
// INTERSECT INFORMATION
//=============================================================================
struct HitInfo {
	t : f32,
	p : vec3f,
	n : vec3f,
	id: u32,
	//uv: vec2f, //texture coordinates !invalid member! now
}

fn hit_sphere(primitive: Primitive, ray: Ray, info: ptr<function, HitInfo>) -> bool {
	// sphere position and size
	let center = primitive.v0;
	let radius = length(primitive.v1);

	// judgement
	let oc = ray.o - center;
	let b  = dot(oc, ray.d);
	let d  = b * b - dot(oc, oc) + radius * radius;

	if d < 0.0 { return false; }

	let sd = sqrt(d);
	var t  = -b - sd;

	if t < kEPS || kINF < t {
		t = -b + sd;
		if t < kEPS || kINF < t { return false; }
	}

	// result
	(*info).t = t;
	(*info).p = ray_at(ray, t);
	(*info).n = normalize((*info).p - center);
	return true;
}

fn hit_plane(primitive: Primitive, ray: Ray, info: ptr<function, HitInfo>) -> bool {
	// plane position
	let corner = primitive.v0;
	let right  = primitive.v1;
	let up     = primitive.v2;

	// judgement
	let normal = normalize(cross(right, up));
	let center = corner + right * 0.5 + up * 0.5;

	let t = -dot(ray.o - center, normal) / dot(ray.d, normal);
	if t < kEPS || kINF < t { return false; }

	let rdir = normalize(right);
	let udir = normalize(up);
	let rlen = length(right);
	let ulen = length(up);
	let pos  = ray_at(ray, t);
	let dx   = dot(pos - corner, rdir);
	let dy   = dot(pos - corner, udir);
	if dx < 0 || rlen < dx || dy < 0 || ulen < dy {
		return false;
	}

	// result
	(*info).t = t;
	(*info).p = pos;
	(*info).n = normal * sign(dot(-ray.d, normal));
	return true;
}

fn hit_each(primitive: Primitive, ray: Ray, info: ptr<function, HitInfo>) -> bool {
	switch primitive.shape {
		// sphere
		case 0: { return hit_sphere(primitive, ray, info); }
		// plane
		case 1: { return  hit_plane(primitive, ray, info); }
		// other shapes are not supported
		default { return false; }
	}
}

fn hit_scene(ray: Ray, info: ptr<function, HitInfo>) -> bool {
	// result
	var hit = false;
	(*info).t = kINF;

	// linear search
	for (var i: u32 = 0; i < u32(uniforms.n); i++) {
		var temp: HitInfo;
		if hit_each(primitives[i], ray, &temp) {
			if kEPS < temp.t && temp.t < (*info).t {
				hit = true;
				temp.id = primitives[i].id;
				(*info) = temp;
			}
		}
	}
	return hit;
}
//=============================================================================





//=============================================================================
// SCATTERED RAY INFORMATION
//=============================================================================
fn scatter_lambert(material: Material, ray: ptr<function, Ray>, hit: HitInfo) -> bool {
	let new_direction = hit.p + hit.n + random_sphere();
	(*ray).d = normalize(new_direction - hit.p);
	(*ray).o = hit.p + (*ray).d * kEPS;
	return true;
}

fn scatter_metal(material: Material, ray: ptr<function, Ray>, hit: HitInfo) -> bool {
	let reflected = normalize(reflect((*ray).d, hit.n) + material.fuzz * random_sphere());
	(*ray).d = reflected;
	(*ray).o = hit.p + reflected * kEPS;
	return true;
}

fn scatter_glass(material: Material, ray: ptr<function, Ray>, hit: HitInfo) -> bool {
	let dotdn  = dot((*ray).d, hit.n);
	var out_n  = hit.n;
	var ni_nt  = -1 / material.ri;
	var cosine = -dotdn;
	if dotdn > 0.0 {
		out_n  = -hit.n;
		ni_nt  = material.ri;
		cosine = material.ri * dotdn;
	}
	let reflected = reflect((*ray).d, hit.n);
	let refracted = refract((*ray).d, out_n, ni_nt);
	var new_direction = reflected;

	if length(refracted) != 0 && rand() > schlick(cosine, material.ri) {
		new_direction = refracted;
	}
	(*ray).d = new_direction;
	(*ray).o = hit.p + new_direction * kEPS;
	return true;
}

fn scatter(material: Material, ray: ptr<function, Ray>, hit: HitInfo) -> bool {
	switch material.brdf {
		// lambertian
		case 0: { return scatter_lambert(material, ray, hit); }
		// metal
		case 1: { return   scatter_metal(material, ray, hit); }
		// glass
		case 2: { return   scatter_glass(material, ray, hit); }
		// other materials are not supported yet
		default { return false; }
	}
}
//=============================================================================





//=============================================================================
// COMPUTE COLOR
//=============================================================================
fn compute_radiance(ray_in: Ray) -> vec3f {
	// result
	var color      = vec3f(0.0);
	var throughput = vec3f(1.0);
	var ray        = ray_in;
	let russian_prob = 0.95;

	// tracing loop
	for (var i: u32 = 0; i < MAX_DEPTH; i++) {
		// russian roulette
		if rand() > russian_prob { break; }
		throughput /= russian_prob;

		var info: HitInfo;
		if hit_scene(ray, &info) {
			let hit_primitive = primitives[info.id];
			let hit_material  = materials[hit_primitive.material];

			if scatter(hit_material, &ray, info) {
				// if emitted, break
				let albedo = hit_material.albedo;
				if max(albedo.x, max(albedo.y, albedo.z)) > 1 {
					color += throughput * albedo;
					break;
				}

				// update throughput
				throughput *= albedo;
			} else {
				return vec3f(0.0);
			}
		} else {
			color += throughput * background(ray.d);
			break;
		}
	}
	return color;
}

fn background(d: vec3f) -> vec3f {
	return vec3f(0.0);
}
//=============================================================================





//=============================================================================
// FRAGMENT SHADER
//=============================================================================
@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
	// rng state setting
	get_seed(pos);

	// fragment position
	let uv = vec2f(
						 (pos.x + rand()) / (uniforms.x - 1),
		(uniforms.y - 1 - pos.y + rand()) / (uniforms.y - 1)
	);

	// camera
	let camera = set_camera(
		vec3f(0.0, 0.0, 6.0),
		vec3f(0.0, 0.0, 0.0),
		vec3f(0.0, 1.0, 0.0),
		25.0
	);

	// compute color
	let ray    = ray_gen(uv, camera);
	let color  = compute_radiance(ray);
	let result = gamma(color);
	set_seed(pos);

	// finish
	return mix_result(pos, result);
}
//=============================================================================