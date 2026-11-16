// AI-assisted: Claude (Anthropic). GPU renderer for the atlas globe (WebGL2, no library).
// One full-screen triangle; the fragment shader inverts the orthographic projection per pixel, samples the MODIS
// mosaic with mipmaps (seam-free at the date line), and adds soft sunlight and an atmosphere rim.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uSize, uLon0, uLat0;
out vec4 outColor;
const float PI = 3.14159265358979;
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uSize) / (0.5 * uSize - 1.5);   // unit disc, y up
  float r = length(p);
  float aa = fwidth(r) * 1.5;
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, r);                 // antialiased limb
  if (alpha <= 0.0) { outColor = vec4(0.0); return; }
  float z = sqrt(max(0.0, 1.0 - min(r * r, 1.0)));
  float sp = sin(uLat0), cp = cos(uLat0);
  float lat = asin(clamp(z * sp + p.y * cp, -1.0, 1.0));
  float lon = uLon0 + atan(p.x, z * cp - p.y * sp);
  float u = lon / (2.0 * PI) + 0.5;
  float v = 0.5 - lat / PI;
  // Tarini's trick: take mip gradients from whichever of two seam placements is continuous here.
  float uA = fract(u), uB = fract(u + 0.5) - 0.5;
  vec2 gxA = vec2(dFdx(uA), dFdx(v)), gyA = vec2(dFdy(uA), dFdy(v));
  vec2 gxB = vec2(dFdx(uB), dFdx(v)), gyB = vec2(dFdy(uB), dFdy(v));
  bool useB = abs(gxB.x) + abs(gyB.x) < abs(gxA.x) + abs(gyA.x);
  vec3 c = textureGrad(uTex, vec2(uA, v), useB ? gxB : gxA, useB ? gyB : gyA).rgb;
  // Sunlight from the upper left, soft so the night side is still readable.
  vec3 n = vec3(p.x, p.y, z);
  float diff = max(dot(n, normalize(vec3(-0.45, 0.5, 0.75))), 0.0);
  c *= 0.42 + 0.78 * diff;
  // Atmosphere: a thin blue haze that thickens toward the limb.
  float rim = pow(1.0 - z, 2.2);
  c = mix(c, vec3(0.42, 0.64, 1.0), rim * 0.6);
  outColor = vec4(c * alpha, alpha);   // premultiplied alpha
}`;

export interface GlobeGL { draw: (lonDeg: number, latDeg: number) => void; dispose: () => void }

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** Returns null when WebGL2 is unavailable; the caller then falls back to the canvas-2D renderer. */
export function createGlobeGL(canvas: HTMLCanvasElement, image: HTMLImageElement): GlobeGL | null {
  let gl: WebGL2RenderingContext | null = null;
  try { gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, alpha: true }); } catch { gl = null; }
  if (!gl) return null;
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));

    const uSize = gl.getUniformLocation(prog, "uSize"), uLon = gl.getUniformLocation(prog, "uLon0"), uLat = gl.getUniformLocation(prog, "uLat0");
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
    const g = gl;
    return {
      draw(lonDeg, latDeg) {
        g.viewport(0, 0, canvas.width, canvas.height);
        g.uniform1f(uSize, canvas.width);
        g.uniform1f(uLon, (lonDeg * Math.PI) / 180);
        g.uniform1f(uLat, (latDeg * Math.PI) / 180);
        g.clearColor(0, 0, 0, 0);
        g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 3);
      },
      dispose() {
        // Free GPU memory but keep the context: React may mount the same canvas again (dev double mount).
        g.deleteTexture(tex); g.deleteBuffer(buf); g.deleteProgram(prog);
      },
    };
  } catch {
    return null;
  }
}
