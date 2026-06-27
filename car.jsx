import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const ROAD_LENGTH = 2000;
const ROAD_WIDTH = 24;
const NUM_SEGMENTS = 80;
const LANE_COUNT = 3;

function createCarGeometry() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(2.2, 0.6, 4.4);
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff2200, shininess: 120 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.2);
  const cabinMat = new THREE.MeshPhongMaterial({ color: 0xcc1800, shininess: 80 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);

  // Windows
  const winMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, shininess: 200 });
  const frontWinGeo = new THREE.PlaneGeometry(1.4, 0.45);
  const frontWin = new THREE.Mesh(frontWinGeo, winMat);
  frontWin.position.set(0, 1.05, 0.91);
  frontWin.rotation.x = -0.3;
  group.add(frontWin);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
  const rimMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 200 });
  const positions = [[-1.2, 0, 1.4], [1.2, 0, 1.4], [-1.2, 0, -1.4], [1.2, 0, -1.4]];
  positions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  });

  // Headlights
  const lightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.05);
  const lightMat = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.8 });
  [-0.7, 0.7].forEach(x => {
    const l = new THREE.Mesh(lightGeo, lightMat);
    l.position.set(x, 0.55, 2.23);
    group.add(l);
  });

  // Taillights
  const tailMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
  [-0.7, 0.7].forEach(x => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), tailMat);
    t.position.set(x, 0.55, -2.23);
    group.add(t);
  });

  group.castShadow = true;
  return group;
}

function createTrafficCar(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 80 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4.4), bodyMat);
  body.position.y = 0.5;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), new THREE.MeshPhongMaterial({ color: 0x333333 }));
  cabin.position.set(0, 1.0, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
  [[-1.2, 0, 1.4], [1.2, 0, 1.4], [-1.2, 0, -1.4], [1.2, 0, -1.4]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    group.add(w);
  });
  return group;
}

export default function CarGame() {
  const mountRef = useRef(null);
  const gameRef = useRef({});
  const keysRef = useRef({});
  const [gameState, setGameState] = useState("menu"); // menu, playing, gameover
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [lives, setLives] = useState(3);
  const [bestScore, setBestScore] = useState(0);
  const animFrameRef = useRef(null);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setSpeed(0);
    setLives(3);
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;

    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

    // Camera
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 500);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(30, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);

    // Road — tiled segments
    const segmentLength = ROAD_LENGTH / NUM_SEGMENTS;
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const stripeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const roadSegments = [];
    const stripeSegments = [];

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const roadGeo = new THREE.BoxGeometry(ROAD_WIDTH, 0.1, segmentLength);
      const seg = new THREE.Mesh(roadGeo, roadMat);
      seg.receiveShadow = true;
      seg.position.set(0, -0.05, -i * segmentLength);
      scene.add(seg);
      roadSegments.push(seg);

      // Lane stripes
      if (i % 2 === 0) {
        for (let l = -1; l <= 1; l++) {
          const strGeo = new THREE.BoxGeometry(0.2, 0.12, segmentLength * 0.5);
          const stripe = new THREE.Mesh(strGeo, stripeMat);
          stripe.position.set(l * 8, 0.01, -i * segmentLength);
          scene.add(stripe);
          stripeSegments.push(stripe);
        }
      }
    }

    // Side barriers
    const barrierMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xff6600 });
    for (let i = 0; i < NUM_SEGMENTS * 2; i++) {
      [-ROAD_WIDTH / 2 - 0.5, ROAD_WIDTH / 2 + 0.5].forEach(x => {
        const mat = i % 4 < 2 ? barrierMat : orangeMat;
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, segmentLength), mat);
        b.position.set(x, 0.6, -i * segmentLength * 0.5);
        scene.add(b);
      });
    }

    // Grass
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x4a9e4a });
    [-40, 40].forEach(x => {
      const grass = new THREE.Mesh(new THREE.BoxGeometry(40, 0.1, ROAD_LENGTH * 2), grassMat);
      grass.position.set(x, -0.1, -ROAD_LENGTH / 2);
      scene.add(grass);
    });

    // Trees
    const treeTrunkMat = new THREE.MeshPhongMaterial({ color: 0x5c3317 });
    const treeTopMat = new THREE.MeshPhongMaterial({ color: 0x228822 });
    for (let i = 0; i < 60; i++) {
      const z = -Math.random() * ROAD_LENGTH;
      [-22, 22].forEach(baseX => {
        const x = baseX + (Math.random() - 0.5) * 12;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), treeTrunkMat);
        trunk.position.set(x, 1.5, z);
        scene.add(trunk);
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4, 8), treeTopMat);
        top.position.set(x, 5, z);
        scene.add(top);
      });
    }

    // Player car
    const playerCar = createCarGeometry();
    playerCar.position.set(0, 0, 0);
    playerCar.castShadow = true;
    scene.add(playerCar);

    // Traffic cars
    const trafficColors = [0x2255ff, 0xffcc00, 0x00cc88, 0xff88aa, 0x8844ff, 0xff8800];
    const trafficCars = [];
    const lanePositions = [-8, 0, 8];

    for (let i = 0; i < 8; i++) {
      const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
      const car = createTrafficCar(color);
      const lane = Math.floor(Math.random() * 3);
      car.position.set(lanePositions[lane], 0, -50 - Math.random() * 300);
      car.userData = { lane, speed: 10 + Math.random() * 15 };
      scene.add(car);
      trafficCars.push(car);
    }

    // Game state
    let carX = 0;
    let carVelX = 0;
    let gameSpeed = 20;
    let totalDistance = 0;
    let gameScore = 0;
    let gameLives = 3;
    let invincible = 0;
    let roadOffset = 0;
    let alive = true;
    let shakeTimer = 0;

    // Input
    const handleKey = (e) => { keysRef.current[e.code] = e.type === "keydown"; };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);

    // Touch
    let touchStartX = 0;
    const handleTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
    const handleTouchMove = (e) => {
      const dx = e.touches[0].clientX - touchStartX;
      if (dx > 20) { keysRef.current["ArrowRight"] = true; keysRef.current["ArrowLeft"] = false; }
      else if (dx < -20) { keysRef.current["ArrowLeft"] = true; keysRef.current["ArrowRight"] = false; }
      else { keysRef.current["ArrowLeft"] = false; keysRef.current["ArrowRight"] = false; }
    };
    const handleTouchEnd = () => { keysRef.current["ArrowLeft"] = false; keysRef.current["ArrowRight"] = false; };
    mount.addEventListener("touchstart", handleTouchStart);
    mount.addEventListener("touchmove", handleTouchMove);
    mount.addEventListener("touchend", handleTouchEnd);

    // Resize
    const handleResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();

    const animate = () => {
      if (!alive) return;
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Steering
      const steerForce = 18;
      if (keysRef.current["ArrowLeft"] || keysRef.current["KeyA"]) carVelX -= steerForce * dt;
      if (keysRef.current["ArrowRight"] || keysRef.current["KeyD"]) carVelX += steerForce * dt;
      carVelX *= 0.88;
      carX += carVelX * dt;
      carX = Math.max(-ROAD_WIDTH / 2 + 1.5, Math.min(ROAD_WIDTH / 2 - 1.5, carX));

      // Tilt on steer
      playerCar.rotation.z = -carVelX * 0.03;
      playerCar.rotation.y = carVelX * 0.04;

      // Speed ramp
      gameSpeed = Math.min(120, 20 + totalDistance * 0.03);

      // Move road (move everything toward camera)
      totalDistance += gameSpeed * dt;
      roadOffset = (roadOffset + gameSpeed * dt) % segmentLength;
      roadSegments.forEach((seg, i) => {
        seg.position.z = (((-i * segmentLength + roadOffset) % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH;
        if (seg.position.z > 20) seg.position.z -= ROAD_LENGTH;
      });

      // Move traffic
      trafficCars.forEach(tc => {
        tc.position.z += (gameSpeed - tc.userData.speed) * dt;
        if (tc.position.z > 20) {
          tc.position.z = -200 - Math.random() * 200;
          tc.userData.lane = Math.floor(Math.random() * 3);
          tc.position.x = lanePositions[tc.userData.lane];
        }
        // Rotate wheels
        tc.children.forEach(c => {
          if (c.geometry && c.geometry.type === "CylinderGeometry" && c.rotation.z === Math.PI / 2) {
            c.rotation.x += gameSpeed * dt * 0.5;
          }
        });
      });

      // Wheel spin
      playerCar.children.forEach(c => {
        if (c.geometry && c.geometry.type === "CylinderGeometry") {
          c.rotation.x += gameSpeed * dt * 0.5;
        }
      });

      // Camera
      playerCar.position.x += (carX - playerCar.position.x) * 0.12;
      if (shakeTimer > 0) {
        shakeTimer -= dt;
        camera.position.x = playerCar.position.x + (Math.random() - 0.5) * 0.6;
        camera.position.y = 5 + (Math.random() - 0.5) * 0.3;
      } else {
        camera.position.x += (playerCar.position.x - camera.position.x) * 0.08;
        camera.position.y = 5;
      }
      camera.lookAt(playerCar.position.x, 1.5, playerCar.position.z - 8);

      // Score & lives update
      gameScore = Math.floor(totalDistance / 5);
      setScore(gameScore);
      setSpeed(Math.floor(gameSpeed * 1.2)); // km/h feel

      // Collision
      if (invincible > 0) { invincible -= dt; }
      else {
        trafficCars.forEach(tc => {
          const dx = Math.abs(tc.position.x - playerCar.position.x);
          const dz = Math.abs(tc.position.z - playerCar.position.z);
          if (dx < 2.0 && dz < 4.0) {
            gameLives--;
            setLives(gameLives);
            invincible = 2.0;
            shakeTimer = 0.5;
            carVelX += (playerCar.position.x < tc.position.x ? -1 : 1) * 15;
            if (gameLives <= 0) {
              alive = false;
              setBestScore(prev => Math.max(prev, gameScore));
              setGameState("gameover");
            }
          }
        });
      }

      // Flash when invincible
      if (invincible > 0) {
        playerCar.visible = Math.floor(invincible * 8) % 2 === 0;
      } else {
        playerCar.visible = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    gameRef.current = { scene, renderer, camera };

    return () => {
      alive = false;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("touchstart", handleTouchStart);
      mount.removeEventListener("touchmove", handleTouchMove);
      mount.removeEventListener("touchend", handleTouchEnd);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [gameState]);

  const livesDisplay = "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, 3 - lives));

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', sans-serif", overflow: "hidden", userSelect: "none" }}>
      {/* HUD */}
      {gameState === "playing" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px", pointerEvents: "none" }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 12, padding: "10px 18px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ color: "#ff2200", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Speed</div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{speed} <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa" }}>km/h</span></div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 12, padding: "10px 18px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
            <div style={{ color: "#ffcc00", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Score</div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{score.toLocaleString()}</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 12, padding: "10px 18px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "right" }}>
            <div style={{ color: "#ff6666", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Lives</div>
            <div style={{ fontSize: 22, lineHeight: 1.4 }}>{livesDisplay}</div>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {gameState === "playing" && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "rgba(0,0,0,0.45)", borderRadius: 8, padding: "6px 16px", color: "#aaa", fontSize: 12, letterSpacing: 1, pointerEvents: "none" }}>
          ← → Arrow Keys or A / D to steer • Avoid traffic!
        </div>
      )}

      {/* Touch controls */}
      {gameState === "playing" && (
        <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 20px", zIndex: 10 }}>
          <button
            onTouchStart={() => { keysRef.current["ArrowLeft"] = true; }}
            onTouchEnd={() => { keysRef.current["ArrowLeft"] = false; }}
            onMouseDown={() => { keysRef.current["ArrowLeft"] = true; }}
            onMouseUp={() => { keysRef.current["ArrowLeft"] = false; }}
            style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 28, cursor: "pointer", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >◀</button>
          <button
            onTouchStart={() => { keysRef.current["ArrowRight"] = true; }}
            onTouchEnd={() => { keysRef.current["ArrowRight"] = false; }}
            onMouseDown={() => { keysRef.current["ArrowRight"] = true; }}
            onMouseUp={() => { keysRef.current["ArrowRight"] = false; }}
            style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 28, cursor: "pointer", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >▶</button>
        </div>
      )}

      {/* 3D canvas */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", display: gameState === "playing" ? "block" : "none" }} />

      {/* Menu */}
      {gameState === "menu" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a0010 100%)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(255,50,0,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ textAlign: "center", zIndex: 1 }}>
            <div style={{ fontSize: 13, color: "#ff4400", letterSpacing: 8, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Turbo</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", lineHeight: 0.9, letterSpacing: -2, textShadow: "0 0 40px rgba(255,80,0,0.6)" }}>HORIZON</div>
            <div style={{ fontSize: 14, color: "#666", letterSpacing: 4, marginTop: 8, textTransform: "uppercase" }}>Street Racing</div>
            <div style={{ margin: "40px 0 20px", fontSize: 48 }}>🏎️</div>
            {bestScore > 0 && (
              <div style={{ color: "#ffcc00", fontSize: 14, marginBottom: 20, letterSpacing: 2 }}>
                BEST: {bestScore.toLocaleString()}
              </div>
            )}
            <button
              onClick={startGame}
              style={{ background: "linear-gradient(135deg, #ff2200, #ff6600)", color: "#fff", border: "none", padding: "18px 56px", borderRadius: 40, fontSize: 18, fontWeight: 800, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", boxShadow: "0 0 30px rgba(255,80,0,0.5)", transition: "transform 0.1s" }}
              onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            >
              Start Race
            </button>
            <div style={{ marginTop: 32, color: "#444", fontSize: 13, lineHeight: 1.8 }}>
              ← → Arrow Keys or A/D to steer<br />
              Avoid traffic · Survive as long as you can
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === "gameover" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0000 0%, #1a0a00 100%)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>💥</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#ff2200", letterSpacing: -1, textShadow: "0 0 20px rgba(255,0,0,0.5)" }}>WRECKED</div>
            <div style={{ color: "#666", fontSize: 13, letterSpacing: 3, marginTop: 4, textTransform: "uppercase" }}>Race Over</div>

            <div style={{ margin: "32px 0", display: "flex", gap: 24, justifyContent: "center" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 28px", textAlign: "center" }}>
                <div style={{ color: "#888", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Score</div>
                <div style={{ color: "#fff", fontSize: 36, fontWeight: 900 }}>{score.toLocaleString()}</div>
              </div>
              <div style={{ background: "rgba(255,204,0,0.08)", border: "1px solid rgba(255,204,0,0.2)", borderRadius: 12, padding: "16px 28px", textAlign: "center" }}>
                <div style={{ color: "#ffcc00", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Best</div>
                <div style={{ color: "#ffcc00", fontSize: 36, fontWeight: 900 }}>{bestScore.toLocaleString()}</div>
              </div>
            </div>

            <button
              onClick={startGame}
              style={{ background: "linear-gradient(135deg, #ff2200, #ff6600)", color: "#fff", border: "none", padding: "16px 48px", borderRadius: 40, fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", boxShadow: "0 0 20px rgba(255,80,0,0.4)", marginBottom: 14 }}
            >
              Race Again
            </button>
            <br />
            <button
              onClick={() => setGameState("menu")}
              style={{ background: "transparent", color: "#555", border: "1px solid #333", padding: "10px 32px", borderRadius: 40, fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
