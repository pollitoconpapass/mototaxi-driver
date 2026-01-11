class MotoTaxi {
    constructor(scene, startPosition) {
        this.scene = scene;
        this.mesh = this.createVehicleMesh();
        this.mesh.position.copy(startPosition);
        this.mesh.position.y = 0.1;
        this.scene.add(this.mesh);
        
        // Physics properties
        this.speed = 0;
        this.maxSpeed = 40; // Increased max speed
        this.acceleration = 0;
        this.steering = 0;
        this.drag = 0.98; // Natural deceleration/friction
        this.turnSpeed = 0.05; // How quickly the vehicle turns
        this.currentWaypointIndex = 0;
        this.stepProgress = 0;
        
        // Emergency lights properties
        this.emergencyLights = [];
        this.lightBlinkTimer = 0;
        this.lightBlinkSpeed = 0.5; // Controls blink frequency
        this.lightsOn = true;

        this.routeCompleted = false
    }

    createVehicleMesh() {
        const mototaxiGroup = new THREE.Group();
        
        // Materiales
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0000FF });
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x44AAFF });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

        // --- 1. CHASIS Y CABINA ELEVADA ---
        const mainBody = new THREE.Group();
        
        // Piso de la cabina (Subimos el 'y' a 0.5 para que no esté pegado al suelo)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.8), bodyMat);
        floor.position.set(0, 0.5, -0.2); 
        mainBody.add(floor);

        // Pared trasera (Más alta y estilizada)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.1), bodyMat);
        backWall.position.set(0, 1.1, 0.5); // "Cierra" la vista trasera
        mainBody.add(backWall);

        // Laterales
        const sideGeom = new THREE.BoxGeometry(0.1, 1.3, 1.5);
        const leftSide = new THREE.Mesh(sideGeom, bodyMat);
        leftSide.position.set(-0.8, 1.1, -0.2);
        mainBody.add(leftSide);

        const rightSide = leftSide.clone();
        rightSide.position.set(0.8, 1.1, -0.2);
        mainBody.add(rightSide);

        // Techo (Un poco inclinado hacia adelante para aerodinámica)
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 2.0), roofMat);
        roof.position.set(0, 1.8, -0.2);
        roof.rotation.x = 0.05; 
        mainBody.add(roof);

        mototaxiGroup.add(mainBody);

        // --- 2. FRENTE (NARIZ) ---
        const noseGeom = new THREE.CylinderGeometry(0.05, 0.6, 0.9, 3);
        const nose = new THREE.Mesh(noseGeom, new THREE.MeshPhongMaterial({color: 0xFF0000}));
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 0.8, -1.2); 
        mototaxiGroup.add(nose);

        // --- 3. RUEDAS Y SUSPENSIÓN (Siguen en el suelo) ---
        const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        
        // Ruedas traseras (Ahora se verá el espacio entre la rueda y el piso azul)
        const wheelBackL = new THREE.Mesh(wheelGeom, blackMat);
        wheelBackL.rotation.z = Math.PI / 2;
        wheelBackL.position.set(-0.95, 0.35, 0.4); 
        mototaxiGroup.add(wheelBackL);

        const wheelBackR = wheelBackL.clone();
        wheelBackR.position.set(0.95, 0.35, 0.4);
        mototaxiGroup.add(wheelBackR);

        // Eje trasero (Une las ruedas, se ve muy bien desde atrás)
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8), metalMat);
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, 0.35, 0.4);
        mototaxiGroup.add(axle);

        // Rueda delantera
        const frontWheel = new THREE.Mesh(wheelGeom, blackMat);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.35, -1.2);
        mototaxiGroup.add(frontWheel);

        return mototaxiGroup;
    }

    createWheels(group) {
        const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
        
        // Rueda delantera con su protector (fender)
        const fWheel = new THREE.Mesh(wheelGeom, wheelMat);
        fWheel.rotation.z = Math.PI / 2;
        fWheel.position.set(0, 0, 1.4);
        group.add(fWheel);

        // Ruedas traseras
        const rWheelL = new THREE.Mesh(wheelGeom, wheelMat);
        rWheelL.rotation.z = Math.PI / 2;
        rWheelL.position.set(-0.7, 0, -1);
        group.add(rWheelL);

        const rWheelR = rWheelL.clone();
        rWheelR.position.set(0.7, 0, -1);
        group.add(rWheelR);
    }

    update(inputManager, waypoints) {
        this.handleInput(inputManager, waypoints);
        this.updatePhysics(inputManager);
        this.followWaypoints(waypoints);
    }

    handleInput(inputManager, waypoints) {
        // Acceleration
        const forwardAccel = 0.8; // More powerful acceleration
        const reverseAccel = -0.5; // More powerful brake/reverse
        
        if (inputManager.isKeyPressed('KeyW')) {
            this.acceleration = forwardAccel;
        } else if (inputManager.isKeyPressed('KeyS')) {
            this.acceleration = reverseAccel;
        } else {
            this.acceleration = 0;
        }
        
        // Handbrake for sharp turns/stops
        if (inputManager.isKeyPressed('Space')) {
            this.drag = 0.9; // Stronger friction for handbrake
        } else {
            this.drag = 0.98; // Normal friction
        }
        
        // Steering
        const steerInput = (inputManager.isKeyPressed('KeyA') ? 1 : 0) - (inputManager.isKeyPressed('KeyD') ? 1 : 0);
        this.steering = steerInput * this.turnSpeed;
        
        // Reset
        if (inputManager.isKeyPressed('KeyR')) {
            this.reset(waypoints[0].from);
        }
    }

    updatePhysics(inputManager) {
        // Apply acceleration
        this.speed += this.acceleration * 0.1;

        // Apply drag
        this.speed *= this.drag;

        // Clamp to max speed
        this.speed = Math.max(-this.maxSpeed / 2, Math.min(this.speed, this.maxSpeed));
        
        // Steering is more effective at lower speeds
        const steeringEffectiveness = 1 - (Math.abs(this.speed) / this.maxSpeed);
        const turn = this.steering * steeringEffectiveness;
        
        // Update rotation
        this.mesh.rotation.y += turn;
        
        // Move forward
        const forward = new THREE.Vector3(0, 0, -1); // Corrected Z component
        forward.applyQuaternion(this.mesh.quaternion);
        forward.multiplyScalar(this.speed * 0.1); // Adjusted multiplier for new physics
        this.mesh.position.add(forward);
    }

    followWaypoints(waypoints) {
        
        
        if (this.currentWaypointIndex >= waypoints.length) {
            if (!this.routeCompleted) {
                this.routeCompleted = true;
                if (typeof onRouteCompleted === 'function') {
                    onRouteCompleted(this, waypoints);
                } else {
                    console.log("onRouteCompleted function not found");
                }
            }
            return;
        }
        
        const currentWaypoint = waypoints[this.currentWaypointIndex];
        
        // Estrategia más inteligente para determinar el objetivo
        let targetPosition = currentWaypoint.to;
        let distanceToTarget = this.mesh.position.distanceTo(targetPosition);
        
        // Si la distancia es demasiado grande, buscar el waypoint más cercano
        if (distanceToTarget > 500) { // Si está a más de 500 unidades
            
            
            let closestWaypointIndex = this.currentWaypointIndex;
            let closestDistance = distanceToTarget;
            
            // Buscar en los próximos 5 waypoints para encontrar el más cercano
            for (let i = this.currentWaypointIndex; i < Math.min(this.currentWaypointIndex + 5, waypoints.length); i++) {
                const distanceToFrom = this.mesh.position.distanceTo(waypoints[i].from);
                const distanceToTo = this.mesh.position.distanceTo(waypoints[i].to);
                
                if (distanceToFrom < closestDistance) {
                    closestDistance = distanceToFrom;
                    closestWaypointIndex = i;
                    targetPosition = waypoints[i].from;
                }
                
                if (distanceToTo < closestDistance) {
                    closestDistance = distanceToTo;
                    closestWaypointIndex = i;
                    targetPosition = waypoints[i].to;
                }
            }
            
            if (closestWaypointIndex !== this.currentWaypointIndex) {
                this.currentWaypointIndex = closestWaypointIndex;
                distanceToTarget = closestDistance;
            }
        }
        
        // Usar distancia adaptativa basada en la velocidad
        let switchDistance = Math.max(15, Math.abs(this.speed) * 2); 
        
        // Si aún está muy lejos, usar una distancia más grande
        if (distanceToTarget > 200) {
            switchDistance = Math.max(switchDistance, 50);
        }
        
        
        
        if (distanceToTarget < switchDistance) {
            
            this.currentWaypointIndex++;
            this.stepProgress = 0;
            
            // Si llegamos al final, marcar como completado
            if (this.currentWaypointIndex >= waypoints.length) {
                console.log("🎯 Last waypoint reached!");
                if (!this.routeCompleted) {
                    this.routeCompleted = true;
                    if (typeof onRouteCompleted === 'function') {
                        onRouteCompleted(this, waypoints);
                    }
                }
            }
        } else {
            const totalDistance = currentWaypoint.from.distanceTo(currentWaypoint.to);
            let traveledDistance;
            
            // Si el total distance es muy pequeño o 0, usar distancia al objetivo
            if (totalDistance < 1) {
                const maxDistance = 100; // Asumir 100 unidades como máximo
                traveledDistance = Math.max(0, maxDistance - distanceToTarget);
                this.stepProgress = Math.min(100, (traveledDistance / maxDistance) * 100);
            } else {
                traveledDistance = this.mesh.position.distanceTo(currentWaypoint.from);
                this.stepProgress = Math.min(100, (traveledDistance / totalDistance) * 100);
            }
        }
    }

    reset(startPosition) {
        this.mesh.position.copy(startPosition);
        this.mesh.position.y = 0.1;
        this.mesh.rotation.y = 0;
        this.speed = 0;
        this.acceleration = 0;
        this.currentWaypointIndex = 0;
        this.stepProgress = 0;
        this.lightBlinkTimer = 0;
        this.routeCompleted = false
    }
}