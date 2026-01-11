class DestinationPin {
    static createDestinationPin(scene, position) {
        const pinGroup = new THREE.Group();
        
        // Main pin body (teardrop shape made from sphere and cone)
        const pinRadius = 6;
        const pinHeight = 15;
        
        // Upper sphere part
        const sphereGeometry = new THREE.SphereGeometry(pinRadius, 32, 32);
        const pinMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xEA4335, // Google Maps red
            transparent: true,
            opacity: 0.95
        });
        const sphere = new THREE.Mesh(sphereGeometry, pinMaterial);
        sphere.position.y = pinHeight;
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        pinGroup.add(sphere);

        // Lower cone/point part
        const coneGeometry = new THREE.ConeGeometry(pinRadius, pinHeight, 32);
        const cone = new THREE.Mesh(coneGeometry, pinMaterial);
        cone.position.y = pinHeight / 2;
        cone.castShadow = true;
        cone.receiveShadow = true;
        pinGroup.add(cone);

        // Inner white circle (center of pin)
        const innerCircleGeometry = new THREE.CircleGeometry(3, 32);
        const innerCircleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        
        // Front circle
        const innerCircleFront = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial);
        innerCircleFront.position.set(0, pinHeight, pinRadius + 0.1);
        pinGroup.add(innerCircleFront);
        
        // Back circle
        const innerCircleBack = new THREE.Mesh(innerCircleGeometry, innerCircleMaterial);
        innerCircleBack.position.set(0, pinHeight, -pinRadius - 0.1);
        innerCircleBack.rotation.y = Math.PI;
        pinGroup.add(innerCircleBack);

        // White cross symbol in the center
        const crossSize = 2;
        const crossThickness = 0.4;
        
        const crossVerticalGeometry = new THREE.BoxGeometry(crossThickness, crossSize, 0.2);
        const crossHorizontalGeometry = new THREE.BoxGeometry(crossSize, crossThickness, 0.2);
        const crossMaterial = new THREE.MeshLambertMaterial({ color: 0xEA4335 });
        
        // Front cross
        const crossVFront = new THREE.Mesh(crossVerticalGeometry, crossMaterial);
        const crossHFront = new THREE.Mesh(crossHorizontalGeometry, crossMaterial);
        crossVFront.position.set(0, pinHeight, pinRadius + 0.15);
        crossHFront.position.set(0, pinHeight, pinRadius + 0.15);
        pinGroup.add(crossVFront);
        pinGroup.add(crossHFront);

        // Back cross
        const crossVBack = new THREE.Mesh(crossVerticalGeometry, crossMaterial);
        const crossHBack = new THREE.Mesh(crossHorizontalGeometry, crossMaterial);
        crossVBack.position.set(0, pinHeight, -pinRadius - 0.15);
        crossHBack.position.set(0, pinHeight, -pinRadius - 0.15);
        crossVBack.rotation.y = Math.PI;
        crossHBack.rotation.y = Math.PI;
        pinGroup.add(crossVBack);
        pinGroup.add(crossHBack);

        // Shadow circle at the base (optional)
        const shadowGeometry = new THREE.CircleGeometry(4, 32);
        const shadowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.01;
        pinGroup.add(shadow);

        // Glossy highlight on the pin (optional shine effect)
        const highlightGeometry = new THREE.SphereGeometry(2, 16, 16);
        const highlightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(-2, pinHeight + 2, 2);
        highlight.scale.set(1, 0.8, 0.6);
        pinGroup.add(highlight);

        // Position the entire pin group
        pinGroup.position.copy(position);
        scene.add(pinGroup);
        
        return pinGroup;
    }
}