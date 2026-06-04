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
    kartCanvas.style.background = 'transparent';
    kartCanvas.style.border = 'none';
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
kartRenderer.setSize(240, 240); // Aumentado de 200 a 240
kartRenderer.setPixelRatio(window.devicePixelRatio);
kartRenderer.setClearColor(0x000000, 0); // Transparent background

const kartScene = new THREE.Scene();
const kartCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
kartCamera.position.set(0, 1.6, 3.8); // Ajustado para una cámara más baja y cercana
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

let kartModel = null;
let kartLoaded = false;

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

// Load the 3D kart model (will replace the test cube)
const loader = new THREE.GLTFLoader();
loader.load('kart.glb', function(gltf) {
    // Remove test cube
    kartScene.remove(testCube);
    
    kartModel = gltf.scene;
    
    // Auto-scale model to fit
    const box = new THREE.Box3().setFromObject(kartModel);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    kartModel.scale.set(scale, scale, scale);
    
    kartModel.position.y = -0.65; // Bajado de -0.3 a -0.65 para colocar las ruedas en el piso
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

// Offscreen rendering for 3D obstacles
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = 128;
offscreenCanvas.height = 128;
const offscreenRenderer = new THREE.WebGLRenderer({ canvas: offscreenCanvas, alpha: true, antialias: true });
offscreenRenderer.setSize(128, 128);
offscreenRenderer.setClearColor(0x000000, 0);

const offscreenScene = new THREE.Scene();
const offscreenCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
offscreenCamera.position.set(0, 1.2, 3);
offscreenCamera.lookAt(0, 0, 0);

const offscreenAmbientLight = new THREE.AmbientLight(0xffffff, 1.5);
offscreenScene.add(offscreenAmbientLight);

const offscreenDirLight = new THREE.DirectionalLight(0x00ffff, 2.0);
offscreenDirLight.position.set(5, 5, 5);
offscreenScene.add(offscreenDirLight);

const offscreenPointLight = new THREE.PointLight(0xff00ff, 2.0, 10);
offscreenPointLight.position.set(-2, 1, 2);
offscreenScene.add(offscreenPointLight);

let eyeballModel = null;
let toothModel = null;

function prepareModel(gltfScene, scaleMultiplier = 1.8) {
    const model = gltfScene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    model.position.sub(center);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = scaleMultiplier / maxDim;
    model.scale.set(scale, scale, scale);
    
    const group = new THREE.Group();
    group.add(model);
    
    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.side = THREE.DoubleSide;
            }
        }
    });
    
    return group;
}

loader.load('eyeball.glb', function(gltf) {
    eyeballModel = prepareModel(gltf.scene, 1.6);
    console.log('Eyeball model loaded successfully');
}, undefined, function(error) {
    console.error('Error loading eyeball model:', error);
});

loader.load('tooth.glb', function(gltf) {
    toothModel = prepareModel(gltf.scene, 1.5);
    console.log('Tooth model loaded successfully');
}, undefined, function(error) {
    console.error('Error loading tooth model:', error);
});

// Configuración
const roadWidth = 2000;
const segmentLength = 200;
const drawDistance = 200;
const cameraDepth = 1 / Math.tan((80 / 2) * Math.PI / 180);
const totalTrackLength = 1000;

let segments = [];
let playerX = 0;
let position = 0;
let speed = 0;
let maxSpeed = 500; // Velocidad máxima inicial aumentada
let accel = 4; // Aceleración aumentada de 2 a 4
let breaking = -8; // Frenado aumentado para compensar la velocidad
let decel = -2;
let offRoadDecel = -15; // Mayor frenado fuera de pista
let gameActive = false;
let score = 0;
let highScore = localStorage.getItem('nightdriver_highscore') || 0;
let lives = 3; // Sistema de 3 vidas
let invincibilityTime = 0; // Segundos de invencibilidad en fotogramas

const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function resetTrack() {
    segments = [];
    for (let n = 0; n < totalTrackLength; n++) {
        // Añadir curvas
        let curve = 0;
        if (n > 50 && n < 150) curve = 2;
        else if (n > 200 && n < 300) curve = -3;
        else if (n > 400 && n < 600) curve = 4;
        else if (n > 700 && n < 900) curve = -4;

        // Añadir obstáculos de forma aleatoria (no en la salida)
        let obstacle = null;
        if (n > 100 && Math.random() < 0.05) {
            // Posición del obstáculo: -0.5 (izquierda), 0 (centro), 0.5 (derecha)
            obstacle = (Math.random() * 2) - 1; 
        }

        segments.push({
            index: n,
            p1: { world: { x: 0, y: 0, z: n * segmentLength }, screen: {} },
            p2: { world: { x: 0, y: 0, z: (n + 1) * segmentLength }, screen: {} },
            curve: curve,
            obstacle: obstacle,
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
    const scale = cameraDepth / (p.camera.z || 1);
    p.screen.x = Math.round((canvas.width / 2) + (scale * p.camera.x * canvas.width / 2));
    p.screen.y = Math.round((canvas.height / 2) - (scale * p.camera.y * canvas.height / 2));
    p.screen.w = Math.round(scale * roadWidth * canvas.width / 2);
    p.screen.scale = scale;
}

function updateLivesUI() {
    const livesDiv = document.getElementById('lives');
    if (livesDiv) {
        livesDiv.innerText = `VIDAS: ${'❤️'.repeat(lives)}`;
    }
}

function initGame() {
    position = 0;
    speed = 0;
    playerX = 0;
    score = 0;
    lives = 3;
    invincibilityTime = 0;
    gameActive = true;
    maxSpeed = 500; // Reiniciar velocidad máxima inicial a 500 (antes 300)
    resetTrack();
    
    // Actualizar High Score y Vidas en la interfaz
    document.getElementById('highscore').innerText = `HIGH SCORE: ${Math.floor(highScore).toString().padStart(4, '0')}`;
    updateLivesUI();
}

function endGame() {
    gameActive = false;
    
    // Guardar High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('nightdriver_highscore', highScore);
    }

    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('end-title').innerText = "¡COLISIÓN!";
    document.getElementById('end-title').style.color = '#f0f';
    document.getElementById('final-stats').innerText = `SCORE FINAL: ${Math.floor(score)}\nHIGH SCORE: ${Math.floor(highScore)}`;
    document.getElementById('msg').innerText = "EL NEÓN TE CONSUMIÓ";
}

function update(dt) {
    if (!gameActive) return;

    // Aceleración y Frenado
    if (keys['ArrowUp']) speed += accel;
    else if (keys['ArrowDown']) speed += breaking;
    else speed += decel;

    // Aumentar la velocidad máxima poco a poco (dificultad progresiva)
    maxSpeed += 0.1; // Progresión de velocidad más rápida (de 0.05 a 0.1)

    // Manejo de giro (aumentada la respuesta del kart para compensar la velocidad)
    if (keys['ArrowLeft']) playerX -= 0.06 * (speed / maxSpeed);
    if (keys['ArrowRight']) playerX += 0.06 * (speed / maxSpeed);

    // Salirse de la carretera te frena mucho
    if (Math.abs(playerX) > 1) {
        if (speed > 50) speed += offRoadDecel;
    }

    speed = Math.max(0, Math.min(speed, maxSpeed));
    position += speed;

    // Pista Infinita (Loop)
    if (position >= totalTrackLength * segmentLength) {
        position -= totalTrackLength * segmentLength;
    }

    // Curvatura de la carretera
    const currentSegmentIndex = Math.floor(position / segmentLength) % totalTrackLength;
    const currentSegment = segments[currentSegmentIndex];
    playerX -= (speed / maxSpeed) * currentSegment.curve * 0.01;

    // Disminuir tiempo de invencibilidad
    if (invincibilityTime > 0) {
        invincibilityTime--;
    }

    // Detección de Colisión con Obstáculos (calculado 12 segmentos por delante, donde se renderiza visualmente el kart)
    const collisionSegmentIndex = (Math.floor(position / segmentLength) + 12) % totalTrackLength;
    const collisionSegment = segments[collisionSegmentIndex];
    if (collisionSegment.obstacle !== null) {
        // Si el coche está en el segmento del obstáculo y cerca de él (X)
        const distanceToObstacle = Math.abs(playerX - collisionSegment.obstacle);
        if (distanceToObstacle < 0.25) { // Hitbox a 0.25 para mayor precisión
            if (invincibilityTime <= 0) {
                if (lives > 1) {
                    lives--;
                    invincibilityTime = 120; // 2 segundos de invencibilidad a 60 fps
                    speed = speed * 0.3; // Freno del vehículo por impacto
                    updateLivesUI();
                } else {
                    lives = 0;
                    updateLivesUI();
                    endGame();
                }
            }
        }
    }

    // Puntaje progresivo
    if (speed > 10) score += (speed / 100);

    // UI
    document.getElementById('speed').innerText = `VELOCIDAD: ${Math.floor(speed)} KM/H`;
    document.getElementById('score').innerText = `SCORE: ${Math.floor(score).toString().padStart(4, '0')}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cielo Reactivo
    const skyColor = Math.floor(position / 100) % 2 ? '#001' : '#002';
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startPos = Math.floor(position / segmentLength);
    const cameraY = 1500;
    let maxy = canvas.height;
    let x = 0;
    let dx = 0;

    for (let n = startPos; n < startPos + drawDistance; n++) {
        const segment = segments[n % totalTrackLength];
        const loop = (n >= totalTrackLength);
        const zOffset = (loop ? totalTrackLength * segmentLength : 0);
        
        project(segment.p1, playerX * roadWidth - x, cameraY, position - zOffset);
        project(segment.p2, playerX * roadWidth - x - dx, cameraY, position - zOffset);
        
        x += dx;
        dx += segment.curve;

        if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= maxy) continue;

        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;

        // Césped
        ctx.fillStyle = segment.color.grass;
        ctx.fillRect(0, p2.y, canvas.width, p1.y - p2.y);

        // Bordes neón
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

    // Dibujar obstáculos en una segunda pasada (para que se vean encima de la carretera)
    for (let n = startPos + drawDistance - 1; n >= startPos; n--) {
        const segment = segments[n % totalTrackLength];
        if (segment.obstacle !== null && segment.p1.camera.z > cameraDepth) {
            const p1 = segment.p1.screen;
            // Calcular posición X del obstáculo en pantalla
            const obsX = p1.x + (segment.obstacle * p1.w);
            const obsW = p1.w * 0.25; // Ancho del obstáculo
            const obsH = p1.w * 0.25; // Alto del obstáculo
            
            const useEyeball = (segment.index % 2 === 0);
            const model = useEyeball ? eyeballModel : toothModel;
            
            if (model) {
                // Clear previous meshes from offscreen scene
                offscreenScene.children = offscreenScene.children.filter(c => 
                    c === offscreenAmbientLight || c === offscreenDirLight || c === offscreenPointLight
                );
                
                // Add model to scene
                offscreenScene.add(model);
                
                // Animate rotation (spinning + floating)
                const time = Date.now() * 0.001;
                model.rotation.y = time * 2;
                if (useEyeball) {
                    model.rotation.x = Math.sin(time * 3) * 0.2;
                    model.rotation.z = Math.cos(time * 2) * 0.1;
                } else {
                    model.rotation.x = Math.cos(time * 3) * 0.2;
                    model.rotation.z = Math.sin(time * 2) * 0.1;
                }
                
                // Render offscreen
                offscreenRenderer.render(offscreenScene, offscreenCamera);
                
                // Draw onto main canvas
                ctx.drawImage(offscreenCanvas, obsX - obsW / 2, p1.y - obsH, obsW, obsH);
            } else {
                // Fallback a rectángulos neón de color si aún se están cargando los modelos
                ctx.fillStyle = useEyeball ? '#ff00ff' : '#00ffff';
                ctx.shadowBlur = 15;
                ctx.shadowColor = ctx.fillStyle;
                ctx.fillRect(obsX - obsW / 2, p1.y - obsH, obsW, obsH);
                ctx.shadowBlur = 0;
            }
        }
    }

    // Dibujar Coche
    drawPlayer(canvas.width / 2, canvas.height - 30);
}

function drawPlayer(x, y) {
    // Parpadeo visual durante invencibilidad
    if (invincibilityTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }

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

// Inicialización
resetTrack();
document.getElementById('highscore').innerText = `HIGH SCORE: ${Math.floor(highScore).toString().padStart(4, '0')}`;
gameLoop();
