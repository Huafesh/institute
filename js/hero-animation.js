
// Hero Animation Logic using VFX-JS
import { VFX } from 'https://esm.sh/@vfx-js/core';

export async function initHeroAnimation() {
    const container = document.querySelector('.animated-hero');
    const canvas = document.getElementById('hero-canvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');

    // Resize Logic with ResizeObserver to prevent infinite loops
    const resizeObserver = new ResizeObserver(() => {
        const ratio = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();

        const newWidth = Math.round(rect.width * ratio);
        const newHeight = Math.round(rect.height * ratio);

        // Only resize if dimensions actually changed (integer comparison)
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
    });
    resizeObserver.observe(container);


    // Logic Variables
    let target = [canvas.width / 2, canvas.height / 2]; // Initial target (will be updated on resize ideally, but ok for now)
    let p = [0, 0]; // Current position
    const ps = []; // Trail history
    let isMouseOn = false;

    // Random/Orbit Mode Variables
    let randomMode = true; // Start in random mode until mouse enters
    let randomStart = performance.now();
    let randomAngle = 0;
    let randomRadius = 0;
    let randomSpeed = 0;
    const randomDelay = 300;

    // Event Listeners (scoped to container)
    container.addEventListener('mousemove', (e) => {
        isMouseOn = true;
        randomMode = false;
        const rect = container.getBoundingClientRect();
        // Calculate logical coordinates (ignoring pixel ratio for logic, handled by transform)
        target = [e.clientX - rect.left, e.clientY - rect.top];
    });

    container.addEventListener('mouseleave', () => {
        isMouseOn = false;
        const rect = container.getBoundingClientRect();
        const center = [rect.width / 2, rect.height / 2];
        target = center.slice(); // Return to center

        // Activate Orbit Mode
        randomMode = true;
        randomStart = performance.now() + randomDelay;
        randomAngle = Math.random() * Math.PI * 2;
        randomRadius = Math.min(rect.width, rect.height) * (0.15 + Math.random() * 0.2);
        randomSpeed = 0.5 + Math.random() * 1.0;
    });

    function lerp(a, b, t) { return a * (1 - t) + b * t }

    // Drawing Loop
    function draw() {
        requestAnimationFrame(draw);

        // Orbit Logic
        if (randomMode) {
            const rect = container.getBoundingClientRect();
            const center = [rect.width / 2, rect.height / 2];
            const now = performance.now();

            if (now >= randomStart) {
                const t = (now - randomStart) / 1000;
                const angle = randomAngle + t * randomSpeed;
                const radiusOsc = randomRadius * (0.8 + 0.2 * Math.sin(t * 0.5));
                const wobble = Math.sin(t * 2.5) * (randomRadius * 0.1);

                target = [
                    center[0] + Math.cos(angle) * (radiusOsc + wobble),
                    center[1] + Math.sin(angle) * (radiusOsc + wobble)
                ];
            }
        }

        // Interpolation
        p[0] = lerp(p[0], target[0], 0.12);
        p[1] = lerp(p[1], target[1], 0.12);

        // Add to history
        ps.push([...p]);
        if (ps.length > 30) ps.shift();

        // Clear Canvas
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, width, height);

        // Draw Trails
        for (let i = 0; i < ps.length; i++) {
            const [x, y] = ps[i];
            const t = i / ps.length;
            const alpha = t * 0.5 + 0.2;

            ctx.beginPath();
            // Color logic: White/Cyan mix
            ctx.fillStyle = `rgba(${255 - (i * 5)}, ${255}, ${255}, ${alpha})`;
            ctx.arc(x, y, i * 0.8 + 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update VFX
        if (vfxInstance) vfxInstance.update(canvas);
    }

    // Shader (same as demo)
    const canvasShader = `precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    out vec4 outColor;

    #define ZOOM(uv, x) ((uv - .5) / x + .5)

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        float r = sin(time) * 0.5 + 0.5;
        float l = pow(length(uv - .5), 2.);
        uv = (uv - .5) *  (1. - l * 0.3 * r) + .5;

        float n = 0.02 + r * 0.03;
        vec4 cr = texture(src, ZOOM(uv, 1.00));
        vec4 cg = texture(src, ZOOM(uv, (1. + n)));
        vec4 cb = texture(src, ZOOM(uv, (1. + n * 2.)));

        // Preserve translucency by using the max alpha of samples
        float a = max(cr.a, max(cg.a, cb.a));
        outColor = vec4(cr.r, cg.g, cb.b, a);
    }
    `;

    // Init VFX
    let vfxInstance;
    try {
        vfxInstance = new VFX();
        await vfxInstance.add(canvas, { shader: canvasShader });
        draw();
    } catch (e) {
        console.error("VFX Init Error:", e);
    }
}

// Auto-start
initHeroAnimation();
