// WebGL2 plumbing shared by the raft's renderer (foam.ts), its stills (assets.ts) and 인쇄물's sheets: compiling,
// uniform locations looked up once, sampler units set once, a texture's sampling state.

export function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const;
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`bubble/9 shader: ${log}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`bubble/9 program: ${gl.getProgramInfoLog(program)}`);
  return program;
}

export type Uniforms = {
  /** A uniform's location (null where the program has none of that name), looked up once per program and name rather than every frame. */
  at(program: WebGLProgram, name: string): WebGLUniformLocation | null;
  /**
   * Points a program's samplers (`units`: name → texture unit) at their units, the first time it is asked for that
   * program and table: a sampler's unit is the program's own state and never changes. The program must be in use.
   * (What is bound to the units is not kept: bind every frame, since an upload binds on whichever unit is active.)
   */
  samplers(program: WebGLProgram, units: Readonly<Record<string, number>>): void;
};

export function createUniforms(gl: WebGL2RenderingContext): Uniforms {
  const locations = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const pointed = new WeakMap<WebGLProgram, Set<Readonly<Record<string, number>>>>();
  const at: Uniforms["at"] = (program, name) => {
    let known = locations.get(program);
    if (!known) locations.set(program, (known = new Map()));
    let found = known.get(name);
    if (found === undefined) known.set(name, (found = gl.getUniformLocation(program, name)));
    return found;
  };
  return {
    at,
    samplers(program, units) {
      let done = pointed.get(program);
      if (!done) pointed.set(program, (done = new Set()));
      if (done.has(units)) return;
      done.add(units);
      for (const name in units) gl.uniform1i(at(program, name), units[name]!);
    },
  };
}

/** The bound texture's filters and, where given, its wraps (left as they are otherwise: REPEAT on a new texture). */
export function sampling(gl: WebGL2RenderingContext, target: number, min: number, mag: number, wrapS?: number, wrapT?: number) {
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, mag);
  if (wrapS !== undefined) gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
  if (wrapT !== undefined) gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
}
