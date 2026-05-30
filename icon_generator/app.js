// 3D Isometric Helix Generator Logic (Custom Software 3D Renderer)
// Created for Sequent App Icon Customization

// Discrete Grid reference coordinates (original 11 blocks)
const BLOCKS_DATA = [
    { x: 0, y: 3, z: 0.0 },
    { x: 1, y: 3, z: 0.4 },
    { x: 2, y: 3, z: 0.8 },
    { x: 2, y: 2, z: 1.2 },
    { x: 1, y: 2, z: 1.6 },
    { x: 0, y: 2, z: 2.0 },
    { x: 0, y: 1, z: 2.4 },
    { x: 0, y: 0, z: 2.8 },
    { x: 1, y: 0, z: 3.2 },
    { x: 2, y: 0, z: 3.6 },
    { x: 3, y: 0, z: 4.0 }
];

// Local corner offsets for a single 3D cube (unit cube centered at origin)
const CUBE_VERTICES = [
    { x: -1, y: -1, z: -1 }, // 0
    { x:  1, y: -1, z: -1 }, // 1
    { x:  1, y:  1, z: -1 }, // 2
    { x: -1, y:  1, z: -1 }, // 3
    { x: -1, y: -1, z:  1 }, // 4
    { x:  1, y: -1, z:  1 }, // 5
    { x:  1, y:  1, z:  1 }, // 6
    { x: -1, y:  1, z:  1 }  // 7
];

const CUBE_FACES = [
    { name: 'top',    indices: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 } },
    { name: 'bottom', indices: [0, 3, 2, 1], normal: { x: 0, y: 0, z: -1 } },
    { name: 'right',  indices: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 } },
    { name: 'left',   indices: [2, 3, 7, 6], normal: { x: 0, y: 1, z: 0 } },
    { name: 'back',   indices: [0, 4, 7, 3], normal: { x: -1, y: 0, z: 0 } },
    { name: 'front',  indices: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 } }
];

// Configuration state
let state = {
    yaw: 45,
    pitch: 35,
    spacingX: 38,
    spacingZ: 48,
    
    pathType: 'smooth',          // smooth, discrete, spiral
    blockShape: 'cube',          // cube, cylinder, sphere
    blockCount: 35,
    blockScale: 1.10,            // allows overlaps to form solid S-ribbon
    pathAmplitude: 1.25,         // controls S curve width
    pathHeightScale: 1.10,       // controls spiral/stretch vertical height
    
    height: 24,                  // block height
    power: 2.0,                  // brightness boost curve
    opacity: 0.60,
    blur: 40,
    glowOpacity: 0.50,
    deboss: 1.5,
    
    colorBg: '#0B0C10',
    colorBase: '#1F2833',
    colorCyan: '#00FFFF',
    colorUltraviolet: '#8A2BE2',
    colorBorder: '#3A475A',
    colorCheckmark: '#FFFFFF',
    
    preset: 'cyber',
    alignToPath: true,
    
    pulse: false,
    hover: true
};

// Animation state
let animationFrameId = null;

// DOM Elements mapping
const elements = {
    yaw: document.getElementById('paramYaw'),
    pitch: document.getElementById('paramPitch'),
    spacingX: document.getElementById('paramSpacingX'),
    spacingZ: document.getElementById('paramSpacingZ'),
    
    pathType: document.getElementById('paramPathType'),
    blockShape: document.getElementById('paramBlockShape'),
    blockCount: document.getElementById('paramBlockCount'),
    blockScale: document.getElementById('paramBlockScale'),
    pathAmplitude: document.getElementById('paramPathAmplitude'),
    pathHeightScale: document.getElementById('paramPathHeightScale'),
    
    height: document.getElementById('paramHeight'),
    power: document.getElementById('paramPower'),
    opacity: document.getElementById('paramOpacity'),
    blur: document.getElementById('paramBlur'),
    glowOpacity: document.getElementById('paramGlowOpacity'),
    deboss: document.getElementById('paramDeboss'),
    
    colorBg: document.getElementById('colorBg'),
    colorBase: document.getElementById('colorBase'),
    colorCyan: document.getElementById('colorCyan'),
    colorUltraviolet: document.getElementById('colorUltraviolet'),
    
    valYaw: document.getElementById('valYaw'),
    valPitch: document.getElementById('valPitch'),
    valSpacingX: document.getElementById('valSpacingX'),
    valSpacingZ: document.getElementById('valSpacingZ'),
    valBlockCount: document.getElementById('valBlockCount'),
    valBlockScale: document.getElementById('valBlockScale'),
    valPathAmplitude: document.getElementById('valPathAmplitude'),
    valPathHeightScale: document.getElementById('valPathHeightScale'),
    valHeight: document.getElementById('valHeight'),
    valPower: document.getElementById('valPower'),
    valOpacity: document.getElementById('valOpacity'),
    valBlur: document.getElementById('valBlur'),
    valGlowOpacity: document.getElementById('valGlowOpacity'),
    valDeboss: document.getElementById('valDeboss'),
    
    colorBgText: document.getElementById('colorBgText'),
    colorBaseText: document.getElementById('colorBaseText'),
    colorCyanText: document.getElementById('colorCyanText'),
    colorUltravioletText: document.getElementById('colorUltravioletText'),
    colorBorder: document.getElementById('colorBorder'),
    colorBorderText: document.getElementById('colorBorderText'),
    colorCheckmark: document.getElementById('colorCheckmark'),
    colorCheckmarkText: document.getElementById('colorCheckmarkText'),
    
    toggleHover: document.getElementById('toggleHover'),
    togglePulse: document.getElementById('togglePulse'),
    
    iconContainer: document.getElementById('iconContainer'),
    svgCode: document.getElementById('svgCode'),
    btnCopy: document.getElementById('btnCopy'),
    btnDownload: document.getElementById('btnDownload'),
    
    preset: document.getElementById('paramPreset'),
    toggleAlign: document.getElementById('toggleAlign')
};

// Initial setup
function init() {
    setupEventListeners();
    updateUIFromState();
    render();
}

function setupEventListeners() {
    // Range Sliders
    const sliders = [
        'yaw', 'pitch', 'spacingX', 'spacingZ', 
        'blockCount', 'blockScale', 'pathAmplitude', 'pathHeightScale', 
        'height', 'power', 'opacity', 'blur', 'glowOpacity', 'deboss'
    ];
    
    sliders.forEach(key => {
        if (elements[key]) {
            elements[key].addEventListener('input', (e) => {
                state[key] = parseFloat(e.target.value);
                updateLabel(key);
                render();
            });
        }
    });

    // Select Dropdowns
    ['pathType', 'blockShape', 'preset'].forEach(key => {
        if (elements[key]) {
            elements[key].addEventListener('change', (e) => {
                state[key] = e.target.value;
                if (key === 'preset') {
                    applyPreset(e.target.value);
                } else {
                    render();
                }
            });
        }
    });

    // Path Alignment Toggle
    elements.toggleAlign.addEventListener('change', (e) => {
        state.alignToPath = e.target.checked;
        render();
    });

    // Color Pickers & Hex Fields
    const colors = ['colorBg', 'colorBase', 'colorCyan', 'colorUltraviolet', 'colorBorder', 'colorCheckmark'];
    colors.forEach(key => {
        const picker = elements[key];
        const textInput = document.getElementById(`${key}Text`);
        
        if (picker && textInput) {
            picker.addEventListener('input', (e) => {
                state[key] = e.target.value;
                textInput.value = e.target.value.toUpperCase();
                render();
            });
            
            textInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    state[key] = val;
                    picker.value = val;
                    render();
                }
            });
        }
    });

    // Hover Float toggle
    elements.toggleHover.addEventListener('change', (e) => {
        state.hover = e.target.checked;
        if (state.hover) {
            elements.iconContainer.classList.add('hover-animate');
        } else {
            elements.iconContainer.classList.remove('hover-animate');
        }
    });

    // Pulsing Glow toggle
    elements.togglePulse.addEventListener('change', (e) => {
        state.pulse = e.target.checked;
        if (state.pulse) {
            startAnimationLoop();
        } else {
            stopAnimationLoop();
            render();
        }
    });

    // Copy to clipboard
    elements.btnCopy.addEventListener('click', () => {
        const code = elements.svgCode.textContent;
        navigator.clipboard.writeText(code).then(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }).catch(err => {
            console.error('Clipboard copy failed: ', err);
        });
    });

    // Download SVG
    elements.btnDownload.addEventListener('click', () => {
        const code = elements.svgCode.textContent;
        const blob = new Blob([code], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequent-icon-${state.blockShape}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function updateLabel(key) {
    const valEl = elements[`val${key.charAt(0).toUpperCase() + key.slice(1)}`];
    if (!valEl) return;
    
    let suffix = '';
    if (key === 'yaw' || key === 'pitch') suffix = '°';
    else if (key === 'spacingX' || key === 'spacingZ' || key === 'height' || key === 'blur' || key === 'deboss') suffix = 'px';
    
    let val = state[key];
    if (key === 'opacity' || key === 'glowOpacity' || key === 'blockScale' || key === 'pathAmplitude' || key === 'pathHeightScale') val = val.toFixed(2);
    else if (key === 'power' || key === 'deboss') val = val.toFixed(1);
    
    valEl.textContent = `${val}${suffix}`;
}

function updateUIFromState() {
    // Set slider values
    Object.keys(state).forEach(key => {
        if (elements[key]) {
            if (elements[key].type === 'range') {
                elements[key].value = state[key];
                updateLabel(key);
            } else if (elements[key].tagName === 'SELECT') {
                elements[key].value = state[key];
            }
        }
    });
    
    // Set colors
    elements.colorBg.value = state.colorBg;
    elements.colorBgText.value = state.colorBg.toUpperCase();
    elements.colorBase.value = state.colorBase;
    elements.colorBaseText.value = state.colorBase.toUpperCase();
    elements.colorCyan.value = state.colorCyan;
    elements.colorCyanText.value = state.colorCyan.toUpperCase();
    elements.colorUltraviolet.value = state.colorUltraviolet;
    elements.colorUltravioletText.value = state.colorUltraviolet.toUpperCase();
    elements.colorBorder.value = state.colorBorder;
    elements.colorBorderText.value = state.colorBorder.toUpperCase();
    elements.colorCheckmark.value = state.colorCheckmark;
    elements.colorCheckmarkText.value = state.colorCheckmark.toUpperCase();

    // Set custom checkbox alignments
    elements.toggleAlign.checked = state.alignToPath;
}

// Apply Color Presets dynamically
function applyPreset(presetName) {
    if (presetName === 'cyber') {
        state.colorBg = '#0B0C10';
        state.colorBase = '#1F2833';
        state.colorCyan = '#00FFFF';
        state.colorUltraviolet = '#8A2BE2';
        state.colorBorder = '#3A475A';
        state.colorCheckmark = '#FFFFFF';
    } else if (presetName === 'amber') {
        state.colorBg = '#110D0A';
        state.colorBase = '#28201A';
        state.colorCyan = '#FFB800';
        state.colorUltraviolet = '#FF5C00';
        state.colorBorder = '#5C402B';
        state.colorCheckmark = '#FFF8F0';
    } else if (presetName === 'ruby') {
        state.colorBg = '#0D090A';
        state.colorBase = '#251618';
        state.colorCyan = '#FF003C';
        state.colorUltraviolet = '#800010';
        state.colorBorder = '#4E2A2E';
        state.colorCheckmark = '#FFF2F4';
    } else if (presetName === 'emerald') {
        state.colorBg = '#060B08';
        state.colorBase = '#16251C';
        state.colorCyan = '#00FF88';
        state.colorUltraviolet = '#006633';
        state.colorBorder = '#243D2F';
        state.colorCheckmark = '#F0FFF7';
    } else if (presetName === 'silver') {
        state.colorBg = '#0E0E10';
        state.colorBase = '#27272A';
        state.colorCyan = '#F8FAFC';
        state.colorUltraviolet = '#71717A';
        state.colorBorder = '#3F3F46';
        state.colorCheckmark = '#FAFAFA';
    }
    
    // Update color picker values in UI
    elements.colorBg.value = state.colorBg;
    elements.colorBgText.value = state.colorBg.toUpperCase();
    elements.colorBase.value = state.colorBase;
    elements.colorBaseText.value = state.colorBase.toUpperCase();
    elements.colorCyan.value = state.colorCyan;
    elements.colorCyanText.value = state.colorCyan.toUpperCase();
    elements.colorUltraviolet.value = state.colorUltraviolet;
    elements.colorUltravioletText.value = state.colorUltraviolet.toUpperCase();
    elements.colorBorder.value = state.colorBorder;
    elements.colorBorderText.value = state.colorBorder.toUpperCase();
    elements.colorCheckmark.value = state.colorCheckmark;
    elements.colorCheckmarkText.value = state.colorCheckmark.toUpperCase();
    
    render();
}

// 3D Path coordinates generator
function generatePath() {
    const points = [];
    const count = state.blockCount;
    const amp = state.pathAmplitude;
    const heightScale = state.pathHeightScale;

    if (state.pathType === 'discrete') {
        // Interpolated discrete grid path from original specs
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const index = t * (BLOCKS_DATA.length - 1);
            const baseIdx = Math.floor(index);
            const nextIdx = Math.min(BLOCKS_DATA.length - 1, baseIdx + 1);
            const localT = index - baseIdx;
            
            const b1 = BLOCKS_DATA[baseIdx];
            const b2 = BLOCKS_DATA[nextIdx];
            
            points.push({
                x: lerp(b1.x, b2.x, localT) - 1.25,
                y: lerp(b1.y, b2.y, localT) - 1.25,
                z: (lerp(b1.z, b2.z, localT) - 2.0) * heightScale,
                t: t,
                isTop: i === count - 1
            });
        }
    } else if (state.pathType === 'smooth') {
        // A mathematically perfect smooth S-shape curve
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const u = t * 2 - 1; // -1 to +1

            // Dynamic S-curve coordinates
            // Sweeps left and right symmetrically, climbing in Z
            const x = -1.35 * amp * Math.sin(u * Math.PI * 0.95) - u * 0.15;
            const y = -1.35 * amp * u;
            const z = u * 2.0 * heightScale;

            points.push({
                x,
                y,
                z,
                t: t,
                isTop: i === count - 1
            });
        }
    } else if (state.pathType === 'spiral') {
        // A clean circular helix spiral
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const u = t * 2 - 1; // -1 to +1
            const turns = 1.5;
            const angle = t * Math.PI * 2 * turns - Math.PI * 0.5;

            const x = amp * 1.2 * Math.cos(angle);
            const y = amp * 1.2 * Math.sin(angle);
            const z = u * 2.0 * heightScale;

            points.push({
                x,
                y,
                z,
                t: t,
                isTop: i === count - 1
            });
        }
    }
    return points;
}

// Generate shape mesh (cube vertices and faces)
function getMesh(shape, bw, bd, bh) {
    if (shape === 'cube') {
        return {
            vertices: CUBE_VERTICES.map(v => ({ x: v.x * bw, y: v.y * bd, z: v.z * bh })),
            faces: CUBE_FACES
        };
    } else if (shape === 'cylinder') {
        const sectors = 12; // Sufficient detail in isometric view
        const vertices = [];
        
        // Top cap vertices (0 to 11)
        for (let i = 0; i < sectors; i++) {
            const theta = (i * 2 * Math.PI) / sectors;
            vertices.push({ x: Math.cos(theta) * bw, y: Math.sin(theta) * bd, z: bh });
        }
        
        // Bottom cap vertices (12 to 23)
        for (let i = 0; i < sectors; i++) {
            const theta = (i * 2 * Math.PI) / sectors;
            vertices.push({ x: Math.cos(theta) * bw, y: Math.sin(theta) * bd, z: -bh });
        }

        const faces = [];
        
        // 1. Top cap face
        const topIndices = [];
        for (let i = 0; i < sectors; i++) topIndices.push(i);
        faces.push({ name: 'top', indices: topIndices, normal: { x: 0, y: 0, z: 1 } });

        // 2. Bottom cap face
        const bottomIndices = [];
        for (let i = sectors - 1; i >= 0; i--) bottomIndices.push(i + sectors);
        faces.push({ name: 'bottom', indices: bottomIndices, normal: { x: 0, y: 0, z: -1 } });

        // 3. Side faces
        for (let i = 0; i < sectors; i++) {
            const next = (i + 1) % sectors;
            const thetaMid = ((i + 0.5) * 2 * Math.PI) / sectors;
            faces.push({
                name: `side_${i}`,
                indices: [i + sectors, next + sectors, next, i],
                normal: { x: Math.cos(thetaMid), y: Math.sin(thetaMid), z: 0 }
            });
        }

        return { vertices, faces };
    }
    return null;
}

// 3D Rendering logic
function render(timestamp = 0) {
    const center_x = 250;
    const center_y = 250;
    
    // Dynamic glow and blur under animation pulse
    let currentGlowOpacity = state.glowOpacity;
    let currentBlur = state.blur;
    
    if (state.pulse && timestamp) {
        currentGlowOpacity = Math.max(0.1, Math.min(1.0, state.glowOpacity * (0.85 + 0.15 * Math.sin(timestamp * 0.003))));
        currentBlur = Math.round(state.blur * (0.9 + 0.12 * Math.cos(timestamp * 0.003)));
    }

    const radYaw = state.yaw * Math.PI / 180;
    const radPitch = state.pitch * Math.PI / 180;
    
    // Directional light vector (coming from top-left, slightly in front)
    const Light = { x: -0.4, y: -0.4, z: 0.82 };

    // Get the helix path points
    const rawPath = generatePath();

    // 1. Project all path nodes in 3D to calculate depth-sorting
    const projectedPath = rawPath.map((p, i) => {
        // Calculate path direction tangent (angle in XY plane)
        let dx = 0;
        let dy = 0;
        if (i < rawPath.length - 1 && i > 0) {
            dx = rawPath[i+1].x - rawPath[i-1].x;
            dy = rawPath[i+1].y - rawPath[i-1].y;
        } else if (i === 0) {
            dx = rawPath[1].x - rawPath[0].x;
            dy = rawPath[1].y - rawPath[0].y;
        } else {
            dx = rawPath[i].x - rawPath[i-1].x;
            dy = rawPath[i].y - rawPath[i-1].y;
        }
        
        const alpha = state.alignToPath ? Math.atan2(dy, dx) : 0;

        // Grid spacing scales
        const X_3d = p.x * state.spacingX;
        const Y_3d = p.y * state.spacingX; // Keep XY scale symmetric
        const Z_3d = p.z * state.spacingZ;

        // Yaw Rotation (Z-axis)
        const x1 = X_3d * Math.cos(radYaw) - Y_3d * Math.sin(radYaw);
        const y1 = X_3d * Math.sin(radYaw) + Y_3d * Math.cos(radYaw);
        const z1 = Z_3d;
        
        // Pitch Rotation (X-axis)
        const x2 = x1;
        const y2 = y1 * Math.cos(radPitch) - z1 * Math.sin(radPitch);
        const z2 = y1 * Math.sin(radPitch) + z1 * Math.cos(radPitch);

        return {
            orig: p,
            x_rot: x2,
            y_rot: y2,
            z_depth: z2,
            cx_screen: center_x + x2,
            cy_screen: center_y + y2,
            alpha: alpha
        };
    });

    // Sort blocks back-to-front (Painter's algorithm)
    const sortedPath = [...projectedPath].sort((a, b) => a.z_depth - b.z_depth);

    // Get positions for glow blobs tracking the top block
    const topBlock = projectedPath[projectedPath.length - 1];
    const top_cx = topBlock.cx_screen;
    const top_cy = topBlock.cy_screen;

    // Mesh dimensions (individual block scale multiplied by spacing bounds)
    const bw = state.spacingX * 0.45 * state.blockScale;
    const bd = state.spacingX * 0.45 * state.blockScale;
    const bh = state.height / 2;

    let blocksMarkup = '';
    let svgGradients = '';

    sortedPath.forEach((node, index) => {
        const t = node.orig.t;
        const illumination = Math.pow(t, state.power);
        const glowColor = lerpColor(state.colorCyan, state.colorUltraviolet, t);
        const baseColor = lerpColor(state.colorBase, glowColor, illumination);
        const opacity = lerp(state.opacity, 0.95, illumination);
        
        // Outline colors
        const strokeColor = lerpColor(state.colorBorder, glowColor, illumination);
        const strokeOpacity = lerp(0.35, 1.0, illumination);
        const strokeWidth = lerp(1.0, 1.5, illumination);
        const glowFilterAttr = illumination > 0.4 ? 'filter="url(#blockGlow)"' : '';

        // If sphere, render using specialized 2D projection with dynamic radial gradient
        if (state.blockShape === 'sphere') {
            const rs = bw; // Use X half-size as radius
            const sphereGradId = `sphereGrad_${index}`;
            const shadowColor = shadeColor(baseColor, 0.55);
            const highlightColor = lerpColor("#FFFFFF", baseColor, 0.45);
            
            // Generate glossy sphere gradient stops dynamically
            svgGradients += `        <radialGradient id="${sphereGradId}" cx="35%" cy="35%" r="70%" fx="35%" fy="35%">
            <stop offset="0%" stop-color="${highlightColor}" stop-opacity="0.95" />
            <stop offset="35%" stop-color="${baseColor}" stop-opacity="${opacity}" />
            <stop offset="85%" stop-color="${shadowColor}" stop-opacity="${opacity}" />
            <stop offset="100%" stop-color="${shadowColor}" stop-opacity="${opacity * 0.7}" />
        </radialGradient>\n`;

            blocksMarkup += `        <circle cx="${node.cx_screen.toFixed(1)}" cy="${node.cy_screen.toFixed(1)}" r="${rs.toFixed(1)}" fill="url(#${sphereGradId})" stroke="${strokeColor}" stroke-opacity="${strokeOpacity * 0.8}" stroke-width="${strokeWidth}" ${glowFilterAttr} />\n`;
        } 
        else {
            // Render 3D Mesh (Cube or Cylinder)
            const mesh = getMesh(state.blockShape, bw, bd, bh);
            if (!mesh) return;

            // Project all mesh corners to 2D screen coordinate values
            const alpha = node.alpha;
            const projectedMeshCorners = mesh.vertices.map(v => {
                // Apply local path Z-alignment rotation first
                const rx_local = state.alignToPath ? (v.x * Math.cos(alpha) - v.y * Math.sin(alpha)) : v.x;
                const ry_local = state.alignToPath ? (v.x * Math.sin(alpha) + v.y * Math.cos(alpha)) : v.y;
                const rz_local = v.z;

                const px_3d = node.orig.x * state.spacingX + rx_local;
                const py_3d = node.orig.y * state.spacingX + ry_local;
                const pz_3d = node.orig.z * state.spacingZ + rz_local;

                // Apply global rotational matrices
                const rx1 = px_3d * Math.cos(radYaw) - py_3d * Math.sin(radYaw);
                const ry1 = px_3d * Math.sin(radYaw) + py_3d * Math.cos(radYaw);
                const rz1 = pz_3d;

                const rx2 = rx1;
                const ry2 = ry1 * Math.cos(radPitch) - rz1 * Math.sin(radPitch);

                return {
                    x: center_x + rx2,
                    y: center_y + ry2
                };
            });

            // Draw visible faces
            mesh.faces.forEach(face => {
                const facePoints = face.indices.map(idx => projectedMeshCorners[idx]);
                const area = getSignedArea(facePoints);

                if (area < 0) { // Points towards camera in CCW order
                    // Rotate face normals to compute 3D shading
                    // Apply local rotation first
                    const nx_l = state.alignToPath ? (face.normal.x * Math.cos(alpha) - face.normal.y * Math.sin(alpha)) : face.normal.x;
                    const ny_l = state.alignToPath ? (face.normal.x * Math.sin(alpha) + face.normal.y * Math.cos(alpha)) : face.normal.y;
                    const nz_l = face.normal.z;

                    const nx1 = nx_l * Math.cos(radYaw) - ny_l * Math.sin(radYaw);
                    const ny1 = nx_l * Math.sin(radYaw) + ny_l * Math.cos(radYaw);
                    const nz1 = nz_l;

                    const nx2 = nx1;
                    const ny2 = ny1 * Math.cos(radPitch) - nz1 * Math.sin(radPitch);
                    const nz2 = ny1 * Math.sin(radPitch) + nz1 * Math.cos(radPitch);

                    const dot = nx2 * Light.x + ny2 * Light.y + nz2 * Light.z;
                    const brightness = 0.86 + 0.18 * dot;
                    
                    const faceColor = shadeColor(baseColor, brightness);
                    const pointsStr = facePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

                    blocksMarkup += `        <polygon points="${pointsStr}" fill="${faceColor}" fill-opacity="${opacity}" stroke="${strokeColor}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}" ${glowFilterAttr} />\n`;

                    // Top face highlights
                    if (face.name === 'top') {
                        const pt4 = projectedMeshCorners[4] || projectedMeshCorners[0];
                        const pt5 = projectedMeshCorners[5] || projectedMeshCorners[1];
                        const pt7 = projectedMeshCorners[7] || projectedMeshCorners[3];
                        
                        blocksMarkup += `        <polyline points="${pt7.x.toFixed(1)},${pt7.y.toFixed(1)} ${pt4.x.toFixed(1)},${pt4.y.toFixed(1)} ${pt5.x.toFixed(1)},${pt5.y.toFixed(1)}" fill="none" stroke="#FFFFFF" stroke-opacity="${lerp(0.15, 0.45, illumination)}" stroke-width="0.75" />\n`;
                    }
                }
            });
        }

        // 2. Draw Checkmark on top of the Peak block
        if (node.orig.isTop) {
            // Position checkmark above the center node
            const lx = node.orig.x * state.spacingX;
            const ly = node.orig.y * state.spacingX;
            
            // Z-height depends on block shape (sphere radius or box half-height)
            const checkOffsetZ = state.blockShape === 'sphere' ? bw * 0.70 : bh;
            const lz = node.orig.z * state.spacingZ + checkOffsetZ;

            // Local coordinates of checkmark path
            const markOffsets = [
                { dx: -bw * 0.40, dy: bd * 0.10 }, // Left Start
                { dx: -bw * 0.10, dy: bd * 0.50 }, // Bottom Vertex
                { dx: bw * 0.50,  dy: -bd * 0.35 } // Right End
            ];

            const alpha = node.alpha;
            const projectedMark = markOffsets.map(offset => {
                // Apply local rotation around Z-axis first
                const rx_local = state.alignToPath ? (offset.dx * Math.cos(alpha) - offset.dy * Math.sin(alpha)) : offset.dx;
                const ry_local = state.alignToPath ? (offset.dx * Math.sin(alpha) + offset.dy * Math.cos(alpha)) : offset.dy;

                const px = lx + rx_local;
                const py = ly + ry_local;
                const pz = lz;

                // Rotate checkmark point in 3D
                const rx1 = px * Math.cos(radYaw) - py * Math.sin(radYaw);
                const ry1 = px * Math.sin(radYaw) + py * Math.cos(radYaw);
                
                const rx2 = rx1;
                const ry2 = ry1 * Math.cos(radPitch) - pz * Math.sin(radPitch);

                return {
                    x: center_x + rx2,
                    y: center_y + ry2
                };
            });

            const pathStr = `M ${projectedMark[0].x.toFixed(1)},${projectedMark[0].y.toFixed(1)} L ${projectedMark[1].x.toFixed(1)},${projectedMark[1].y.toFixed(1)} L ${projectedMark[2].x.toFixed(1)},${projectedMark[2].y.toFixed(1)}`;
            const offset = state.deboss;

            // Render debossed 3D checkmark layers
            // Shadow layer (deboss recess)
            blocksMarkup += `        <!-- Deboss Recess Shadow -->\n`;
            blocksMarkup += `        <path d="${pathStr}" fill="none" stroke="#040608" stroke-opacity="0.85" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(${-offset}, ${-offset})" />\n`;
            // Bevel highlight layer
            blocksMarkup += `        <!-- Deboss Bevel Highlight -->\n`;
            blocksMarkup += `        <path d="${pathStr}" fill="none" stroke="${state.colorCyan}" stroke-opacity="0.65" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(${offset}, ${offset})" />\n`;
            // Top white surface line
            blocksMarkup += `        <!-- Checkmark Surface -->\n`;
            blocksMarkup += `        <path d="${pathStr}" fill="none" stroke="${state.colorCheckmark}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round" />\n`;
        }
    });

    // 3. Assemble SVG Code String
    const cyanGlowX = (top_cx - 30).toFixed(0);
    const cyanGlowY = (top_cy + 15).toFixed(0);
    const violetGlowX = (top_cx + 25).toFixed(0);
    const violetGlowY = (top_cy - 15).toFixed(0);

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
    <defs>
        <!-- Shadow blur for floating icon -->
        <filter id="shadowBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" />
        </filter>
        
        <!-- High-intensity aura glow blur -->
        <filter id="auraBlur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="${currentBlur}" />
        </filter>

        <!-- Glass block self-illumination filter -->
        <filter id="blockGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>

        <!-- Obsidian canvas background gradient -->
        <radialGradient id="bgGradient" cx="75%" cy="25%" r="90%">
            <stop offset="0%" stop-color="#141824" />
            <stop offset="60%" stop-color="${state.colorBg}" />
            <stop offset="100%" stop-color="#050608" />
        </radialGradient>

        <!-- Radial gradient for cyan glow -->
        <radialGradient id="cyanGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${state.colorCyan}" stop-opacity="${currentGlowOpacity}" />
            <stop offset="100%" stop-color="${state.colorCyan}" stop-opacity="0" />
        </radialGradient>

        <!-- Radial gradient for ultraviolet glow -->
        <radialGradient id="violetGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${state.colorUltraviolet}" stop-opacity="${currentGlowOpacity}" />
            <stop offset="100%" stop-color="${state.colorUltraviolet}" stop-opacity="0" />
        </radialGradient>
        
        <!-- Clipping path for squircle content -->
        <clipPath id="squircleClip">
            <rect x="50" y="50" width="400" height="400" rx="105" ry="105" />
        </clipPath>
        
        <!-- Dynamic radial gradients for glossy spheres (if shape is sphere) -->
${svgGradients}    </defs>

    <!-- Floating Shadow below the app icon container -->
    <ellipse cx="250" cy="465" rx="155" ry="16" fill="#000000" opacity="0.65" filter="url(#shadowBlur)" />

    <!-- Main Squircle App Icon -->
    <g clip-path="url(#squircleClip)">
        <!-- Background canvas -->
        <rect x="50" y="50" width="400" height="400" fill="url(#bgGradient)" />

        <!-- Glow Aura behind the blocks (centered at top block) -->
        <circle cx="${cyanGlowX}" cy="${cyanGlowY}" r="150" fill="url(#cyanGlowGrad)" filter="url(#auraBlur)" />
        <circle cx="${violetGlowX}" cy="${violetGlowY}" r="180" fill="url(#violetGlowGrad)" filter="url(#auraBlur)" />

        <!-- 3D Helix Blocks (Sorted Back-to-Front) -->
${blocksMarkup}    </g>

    <!-- App Icon Border Rim Highlight (Glass Edge) -->
    <rect x="50" y="50" width="400" height="400" rx="105" ry="105" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="2.5" pointer-events="none" />
</svg>`;

    // Update canvas and text elements
    elements.iconContainer.innerHTML = svgString;
    elements.svgCode.textContent = svgString;
}

// area of polygon (negative area = CCW = facing camera)
function getSignedArea(points) {
    let sum = 0;
    const len = points.length;
    for (let i = 0; i < len; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % len];
        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    return sum;
}

// Linear interpolation
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// Unified color parser (supports #FFF, #FFFFFF, rgb(r,g,b))
function parseColorToRgb(colorStr) {
    if (typeof colorStr === 'string' && colorStr.startsWith('rgb')) {
        const matches = colorStr.match(/\d+/g);
        if (matches && matches.length >= 3) {
            return {
                r: parseInt(matches[0]),
                g: parseInt(matches[1]),
                b: parseInt(matches[2])
            };
        }
    }
    // Assume Hex string
    let hex = colorStr.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

// Interpolate colors
function lerpColor(c1, c2, factor) {
    const rgb1 = parseColorToRgb(c1);
    const rgb2 = parseColorToRgb(c2);
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    return `rgb(${r}, ${g}, ${b})`;
}

// Multiply color components
function shadeColor(rgbStr, factor) {
    const rgb = parseColorToRgb(rgbStr);
    const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
    return `rgb(${r}, ${g}, ${b})`;
}

// Animation loop runner
function animationLoop(timestamp) {
    if (!state.pulse) return;
    render(timestamp);
    animationFrameId = requestAnimationFrame(animationLoop);
}

function startAnimationLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animationLoop);
}

function stopAnimationLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

// Run application
document.addEventListener('DOMContentLoaded', init);
window.onload = init;
init();
