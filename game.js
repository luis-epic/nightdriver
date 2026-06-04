const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 640;
canvas.height = 480;

// Three.js setup for 3D kart
const kartCanvas = document.getElementById('kart-canvas');
if (!kartCanvas) {
    console.error('kart-canvas element not found!');
    alert('Error: kart-canvas element not found!');
} else {
    console.log('kart-canvas found:', kartCanvas);
}

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded!');
    alert('Error: Three.js is not loaded!');
} else {
    console.log('Three.js is loaded:', THREE);
}

// Check if GLTFLoader is loaded
if (typeof THREE.GLTFLoader === 'undefined') {
    console.error('GLTFLoader is not loaded!');
    alert('Error: GLTFLoader is not loaded!');
} else {
    console.log('GLTFLoader is loaded');
}

const kartRenderer = new THREE.WebGLRenderer({ canvas: kartCanvas, alpha: true, antialias: true });
kartRenderer.setSize(200, 200);
kartRenderer.setPixelRatio(window.devicePixelRatio);
kartRenderer.setClearColor(0x000000, 0); // Transparent background

const kartScene = new THREE.Scene();
const kartCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
kartCamera.position.set(0, 1.5, 4);
kartCamera.lookAt(0, 0, 0);

// Lighting first (before adding objects)
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
kartScene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x00ffff, 2.0);
directionalLight.position.set(5, 10, 5);
kartScene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff00ff, 1, 10);
pointLight.position.set(-2, 1, 2);
kartScene.add(pointLight);

// Add a simple test cube to verify Three.js is working
const testGeometry = new THREE.BoxGeometry(1, 0.5, 1.5);
const testMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.y = 0;
testCube.rotation.y = Math.PI;
kartScene.add(testCube);
kartModel = testCube;
kartLoaded = true;
console.log('Test cube added as fallback');

// Render once to test
setTimeout(() => {
    kartRenderer.render(kartScene, kartCamera);
    console.log('Test render completed');
}, 100);

let kartModel = testCube; // Start with test cube
let kartLoaded = true; // Mark as loaded since we have the test cube

// Load the 3D kart model (will replace the test cube)
const loader = new THREE.GLTFLoader();
loader.load('racing_kart_125cc_low_poly (1).glb', function(gltf) {
    // Remove test cube
    kartScene.remove(testCube);
    
    kartModel = gltf.scene;
    
    // Auto-scale model to fit
    const box = new THREE.Box3().setFromObject(kartModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    kartModel.scale.set(scale, scale, scale);
    
    kartModel.position.y = -0.3;
    kartModel.rotation.y = Math.PI;
    
    // Enable shadows and ensure materials are visible
    kartModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.side = THREE.DoubleSide;
                // Ensure material is visible
                if (child.material.color) {
                    child.material.color.setHex(0xffffff);
                }
            }
        }
    });
    
    kartScene.add(kartModel);
    kartLoaded = true;
    console.log('Kart model loaded successfully, scale:', scale);
}, function(progress) {
    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
}, function(error) {
    console.error('Error loading kart model:', error);
    console.log('Keeping test cube as fallback');
});

// Configuración
const roadWidth = 2000;
const segmentLength = 200;
const drawDistance = 200;
const cameraDepth = 1 / Math.tan((80 / 2) * Math.PI / 180);
const playerZ = 0;
const totalTrackLength = 500; // Número de segmentos

let segments = [];
let playerX = 0;
let position = 0;
let speed = 0;
let maxSpeed = 300;
let accel = 2;
let breaking = -5;
let decel = -1;
let offRoadDecel = -10;
let gameActive = false;
let score = 0;
let timeLeft = 60;
let timerId = null;

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function resetTrack() {
    segments = [];
    for (let n = 0; n < totalTrackLength; n++) {
        segments.push({
            index: n,
            p1: { world: { x: 0, y: 0, z: n * segmentLength }, screen: {} },
            p2: { world: { x: 0, y: 0, z: (n + 1) * segmentLength }, screen: {} },
            curve: (n > 50 && n < 150) ? 2 : (n > 200 && n < 300) ? -3 : (n > 350) ? 5 : 0,
            color: Math.floor(n / 3) % 2 ? { road: '#111', grass: '#000', rumble: '#0ff' } : { road: '#222', grass: '#005', rumble: '#f0f' }
        });
    }
}

function project(p, cameraX, cameraY, cameraZ) {
    p.camera = {
        x: (p.world.x || 0) - cameraX,
        y: (p.world.y || 0) - cameraY,
        z: (p.world.z || 0) - cameraZ
    };
    const scale = cameraDepth / (p.camera.z || 1); // Evitar división por cero
    p.screen.x = Math.round((canvas.width / 2) + (scale * p.camera.x * canvas.width / 2));
    p.screen.y = Math.round((canvas.height / 2) - (scale * p.camera.y * canvas.height / 2));
    p.screen.w = Math.round(scale * roadWidth * canvas.width / 2);
}

function initGame() {
    position = 0;
    speed = 0;
    playerX = 0;
    score = 0;
    timeLeft = 60;
    gameActive = true;
    resetTrack();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        if (gameActive) {
            timeLeft--;
            if (timeLeft <= 0) endGame("¡TIEMPO AGOTADO!", false);
        }
    }, 1000);
}

function endGame(title, win) {
    gameActive = false;
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = title;
    document.getElementById('end-title').style.color = win ? '#0ff' : '#f0f';
    document.getElementById('final-stats').innerText = `SCORE FINAL: ${Math.floor(score)}`;
    document.getElementById('msg').innerText = win ? "DOMINASTE LA NOCHE" : "EL NEÓN TE CONSUMIÓ";
}

function update(dt) {
    if (!gameActive) return;

    // Aceleración y Frenado
    if (keys['ArrowUp']) speed += accel;
    else if (keys['ArrowDown']) speed += breaking;
    else speed += decel;

    // Manejo de giro
    if (keys['ArrowLeft']) playerX -= 0.05 * (speed / maxSpeed);
    if (keys['ArrowRight']) playerX += 0.05 * (speed / maxSpeed);

    // Salirse de la carretera
    if (Math.abs(playerX) > 1) {
        if (speed > 50) speed += offRoadDecel;
    }

    speed = Math.max(0, Math.min(speed, maxSpeed));
    position += speed;

    // Curvatura de la carretera
    const currentSegment = segments[Math.floor(position / segmentLength) % segments.length];
    playerX -= (speed / maxSpeed) * currentSegment.curve * 0.01;

    // Puntaje progresivo
    if (speed > 10) score += (speed / 100);

    // Condición de Victoria
    if (position > (totalTrackLength - 20) * segmentLength) {
        endGame("¡META ALCANZADA!", true);
    }

    // UI
    document.getElementById('speed').innerText = `VELOCIDAD: ${Math.floor(speed)} KM/H`;
    document.getElementById('score').innerText = `SCORE: ${Math.floor(score).toString().padStart(4, '0')}`;
    document.getElementById('time').innerText = `TIEMPO: ${timeLeft}s`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Dinámico (Momento WOW: Cielo Reactivo)
    const skyColor = Math.floor(position / 100) % 2 ? '#001' : '#002';
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startPos = Math.floor(position / segmentLength);
    const cameraY = 1500;
    let maxy = canvas.height;
    let x = 0;
    let dx = 0;

    for (let n = startPos; n < startPos + drawDistance; n++) {
        const segment = segments[n % segments.length];
        const loop = (n >= totalTrackLength);
        
        project(segment.p1, playerX * roadWidth - x, cameraY, position - (loop ? totalTrackLength * segmentLength : 0));
        project(segment.p2, playerX * roadWidth - x - dx, cameraY, position - (loop ? totalTrackLength * segmentLength : 0));
        
        x += dx;
        dx += segment.curve;

        if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= maxy) continue;

        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;

        // Césped
        ctx.fillStyle = segment.color.grass;
        ctx.fillRect(0, p2.y, canvas.width, p1.y - p2.y);

        // Rumbe strips (Bordes neón)
        const rumbleW1 = p1.w * 0.1;
        const rumbleW2 = p2.w * 0.1;
        ctx.fillStyle = segment.color.rumble;
        // Izquierda
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w - rumbleW1, p1.y); ctx.lineTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p2.x - p2.w, p2.y); ctx.lineTo(p2.x - p2.w - rumbleW2, p2.y);
        ctx.fill();
        // Derecha
        ctx.beginPath();
        ctx.moveTo(p1.x + p1.w + rumbleW1, p1.y); ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y); ctx.lineTo(p2.x + p2.w + rumbleW2, p2.y);
        ctx.fill();

        // Carretera
        ctx.fillStyle = segment.color.road;
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w, p1.y); ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y); ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.fill();

        maxy = p2.y;
    }

    // Dibujar Coche (Neon Sprite)
    drawPlayer(canvas.width / 2, canvas.height - 30);
}

function drawPlayer(x, y) {
    // Render 3D kart model instead of 2D sprite
    if (kartLoaded && kartModel) {
        // Get current segment for curve info
        const currentSegment = segments[Math.floor(position / segmentLength) % segments.length];
        
        // Calculate rotation based on player movement
        const targetRotationZ = -playerX * 0.5; // Lean when turning
        const targetRotationY = -playerX * 0.3; // Turn direction
        
        // Calculate tilt based on road curve
        const targetTilt = currentSegment.curve * 0.02;
        
        // Smooth interpolation
        kartModel.rotation.z += (targetRotationZ - kartModel.rotation.z) * 0.1;
        kartModel.rotation.y = Math.PI + targetRotationY;
        kartModel.rotation.x = targetTilt;
        
        // Render the 3D kart
        kartRenderer.render(kartScene, kartCamera);
    } else {
        // Fallback to 2D sprite if model not loaded
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#0ff";
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(x - 30, y);
        ctx.lineTo(x + 30, y);
        ctx.lineTo(x + 20, y - 40);
        ctx.lineTo(x - 20, y - 40);
        ctx.fill();
        
        // Luces traseras
        ctx.shadowColor = "#f0f";
        ctx.fillStyle = "#f0f";
        ctx.fillRect(x - 25, y - 10, 15, 5);
        ctx.fillRect(x + 10, y - 10, 15, 5);
        ctx.shadowBlur = 0;
        
        // Debug: show loading status
        if (!kartLoaded) {
            ctx.fillStyle = "#ff0";
            ctx.font = "12px Courier New";
            ctx.fillText("Cargando modelo 3D...", x - 60, y - 50);
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Inicialización inmediata para evitar errores de dibujo
resetTrack();
gameLoop();
