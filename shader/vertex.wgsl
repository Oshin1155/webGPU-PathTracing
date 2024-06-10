struct VertexIn {
	@location(0) pos: vec4f,
}

struct VertexOut {
	@builtin(position) pos: vec4f,
}


@vertex
fn vs_main(input: VertexIn) -> VertexOut
{
	var output: VertexOut;
	output.pos = input.pos;

	return output;
}