class Game {
    constructor(routeData) {
        this.clock = new THREE.Clock();
        this.routeData = routeData;
        this.gameScene = new GameScene();
        this.inputManager = new InputManager();
        this.uiManager = new UIManager(routeData);
        
        // Convert route data
        this.waypoints = RouteConverter.convertRouteToWaypoints(routeData);
        this.points = RouteConverter.getRoutePoints(routeData);
        
        // Create game objects
        this.road = new Road(this.gameScene.scene);
        this.ambulance = new MotoTaxi(this.gameScene.scene, this.points[0]);
        
        // Generate road
        this.road.generateRoad(this.points);

        // Initialize traffic system with driver data
        this.initializeTrafficSystem();
        
        // Generate buildings and environment
        Buildings.createBuildingsAlongRoute(this.gameScene.scene, this.points);
        Trees.createTreesAlongRoute(this.gameScene.scene, this.points);
        Banners.createBannersAlongRoute(this.gameScene.scene, this.points);
        Houses.createHousesAlongRoute(this.gameScene.scene, this.points);

        // Placing the destination pin at the end of the road
        const endPosition = this.points[this.points.length - 1];
        DestinationPin.createDestinationPin(this.gameScene.scene, endPosition);

        window.gameInstance = this;
        
        // Start game loop
        this.animate();
    }

    async initializeTrafficSystem() {
        this.trafficManager = new TrafficManager(this.gameScene.scene, this.points);
        const playerStartSegment = 0;
        this.trafficManager.populateInitialTraffic(playerStartSegment);
    }


    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update game objects
        this.ambulance.update(this.inputManager, this.waypoints);
        recordSpeedSample(this.ambulance.speed);
        
        // Update camera
        this.gameScene.updateCamera(this.ambulance);
        
        // Update UI
        this.uiManager.updateUI(
            this.ambulance.currentWaypointIndex, 
            this.ambulance.stepProgress, 
            this.ambulance.speed
        );
        
        // Update traffic vehicles (now with emergency capabilities)
        const playerSegment = this.ambulance.currentWaypointIndex || 0;
        if (this.trafficManager) {
            this.trafficManager.update(deltaTime, playerSegment);
        }
        // Render scene
        this.gameScene.render();
    }

    // Enhanced traffic info including emergency status
    getTrafficInfo() {
        if (!this.trafficManager) return null;
        
        const baseInfo = this.trafficManager.getTrafficInfo();

        return {
            ...baseInfo,
            driversOnRoad,
            totalDriversLoaded: window.driverDataManager?.drivers.length || 0,
            emergencySystem: emergencyStatus
        };
    }
}
