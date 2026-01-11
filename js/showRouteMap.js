// Inicializar el mapa centrado en Lima
const map = L.map('map').setView([-12.0464, -77.0428], 13);

// Agregar capa de mapa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);


// Función principal para calcular ambas rutas
async function calculateRoute() {
    const startLocation = document.getElementById('startLocation').value.trim();
    const endLocation = document.getElementById('endLocation').value.trim();
    
    // Validar inputs
    if (!startLocation || !endLocation) {
        showMessage('Por favor ingresa tanto la ubicación de inicio como la de destino.', 'error');
        return;
    }
    
    // Mostrar estado de carga
    const calculateBtn = document.getElementById('calculateBtn');
    const originalText = calculateBtn.textContent;
    calculateBtn.textContent = '⏳ Calculando rutas...';
    calculateBtn.disabled = true;
    
    // Limpiar rutas existentes
    clearAllRoutes();
    
    try {
        // Calcular ambas rutas en paralelo
        const [bellmanResult, astarResult] = await Promise.allSettled([
            fetchRoute('bellman', startLocation, endLocation),
            fetchRoute('astar', startLocation, endLocation)
        ]);
        
        let successCount = 0;
        let errorMessages = [];
        
        // Procesar resultado de Bellman-Ford
        if (bellmanResult.status === 'fulfilled') {
            routeData.bellman = processApiRouteData(bellmanResult.value.routeData);
            visualizeRoute('bellman', routeData.bellman, bellmanResult.value.totalTime);
            successCount++;
        } else {
            errorMessages.push(`Bellman-Ford: ${bellmanResult.reason.message}`);
        }
        
        // Procesar resultado de A*
        if (astarResult.status === 'fulfilled') {
            routeData.astar = processApiRouteData(astarResult.value.routeData);
            visualizeRoute('astar', routeData.astar, astarResult.value.totalTime);
            successCount++;
        } else {
            errorMessages.push(`A*: ${astarResult.reason.message}`);
        }
        
        if (successCount > 0) {
            // Mostrar panel de comparación
            showRouteComparison();
            
            // Ajustar vista del mapa para mostrar ambas rutas
            adjustMapView();
            
            // Seleccionar automáticamente la primera ruta disponible
            if (routeData.bellman) {
                selectRoute('bellman');
            } else if (routeData.astar) {
                selectRoute('astar');
            }
            
            // Configurar botón de vista 3D inmediatamente después de calcular las rutas
            const view3DBtn = document.getElementById('view3D');
            if (view3DBtn) {
                // Remover listeners anteriores
                const newBtn = view3DBtn.cloneNode(true);
                view3DBtn.parentNode.replaceChild(newBtn, view3DBtn);
                
                // Agregar nuevo listener
                newBtn.addEventListener('click', () => {
                    // Verificar que hay una ruta seleccionada
                    if (!selectedRoute) {
                        alert('Por favor selecciona una ruta primero antes de ver la simulación 3D.');
                        return;
                    }
                    
                    // Verificar que los datos estén guardados
                    const savedData = sessionStorage.getItem('routeData');
                    if (savedData) {
                        console.log('✅ Datos de ruta guardados correctamente');
                        console.log('🚀 Navegando a simulación 3D...');
                        window.location.href = './threejsAnimation.html';
                    } else {
                        console.error('❌ Error: No se pudieron guardar los datos de ruta');
                        alert('Error al preparar la simulación 3D. Por favor intenta de nuevo.');
                    }
                });
            }
            
            showMessage(`✅ ${successCount} ruta(s) calculada(s) exitosamente!`, 'success');
        } else {
            showMessage(`❌ Error al calcular las rutas: ${errorMessages.join(', ')}`, 'error');
        }
        
    } catch (error) {
        console.error('Error general al calcular rutas:', error);
        showMessage(`❌ Error general: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        calculateBtn.textContent = originalText;
        calculateBtn.disabled = false;
    }
}

// Función para obtener datos de una ruta específica
async function fetchRoute(routeType, startLocation, endLocation) {
    const endpoint = routeConfig[routeType].endpoint;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            start_location: startLocation,
            end_location: endLocation
        })
    });
    
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    const routeData = data["ruta"];
    const totalTime = data["tiempo_estimado"];
    
    if (!routeData || routeData.length === 0) {
        throw new Error('No se encontró una ruta válida entre las ubicaciones especificadas.');
    }
    
    return { routeData, totalTime };
}

// Función para procesar datos de la API
function processApiRouteData(apiData) {
    return apiData.map(step => ({
        paso: step.paso,
        desde: step.desde,
        hasta: step.hasta,
        nombreCalle: step.nombreCalle,
        tipoCalle: step.tipoCalle,
        unidireccional: step.unidireccional,
        distancia_metros: step.distancia_metros,
        velocidadMaxima_kmh: step.velocidadMaxima_kmh,
        instruccion: step.instruccion,
        osmid: step.OSMID,
        fromCoords: [step.fromLat, step.fromLng],
        toCoords: [step.toLat, step.toLng]
    }));
}

// Función para visualizar una ruta específica
function visualizeRoute(routeType, routeData, totalTime) {
    if (!routeData || routeData.length === 0) return;
    
    const config = routeConfig[routeType];
    const coordinates = [];
    
    // Procesar coordenadas
    routeData.forEach((step, index) => {
        if (index === 0) {
            coordinates.push(step.fromCoords);
        }
        coordinates.push(step.toCoords);
    });
    
    // Crear polilínea de la ruta
    const routeStyle = {
        color: config.color,
        weight: 5,
        opacity: 0.7,
        smoothFactor: 1
    };
    
    currentRoutes[routeType] = L.polyline(coordinates, routeStyle).addTo(map);
    
    // Agregar marcadores solo para la primera ruta calculada
    if (Object.keys(currentRoutes).filter(key => currentRoutes[key]).length === 1) {
        const startMarker = L.marker(coordinates[0], {
            icon: L.divIcon({
                html: '🚩',
                iconSize: [30, 30],
                className: 'start-marker'
            })
        }).addTo(map).bindPopup(`<b>Inicio:</b><br>${routeData[0].desde}`);
        
        const endMarker = L.marker(coordinates[coordinates.length - 1], {
            icon: L.divIcon({
                html: '🏁',
                iconSize: [30, 30],
                className: 'end-marker'
            })
        }).addTo(map).bindPopup(`<b>Destino:</b><br>${routeData[routeData.length - 1].hasta}`);
        
        routeMarkers[routeType].push(startMarker, endMarker);
    }
    
    // Almacenar tiempo estimado
    currentRoutes[routeType].estimatedTime = totalTime;
}

// Función para limpiar ruta (mantener compatibilidad)
function clearRoute() {
    clearAllRoutes();
}

// Eventos del DOM
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('startLocation').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculateRoute();
        }
    });
    
    document.getElementById('endLocation').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            calculateRoute();
        }
    });
    
    document.getElementById('calculateBtn').addEventListener('click', calculateRoute);
});

// Evento para manejar clicks en el mapa
map.on('click', function(e) {
    console.log('Coordenadas:', e.latlng.lat, e.latlng.lng);
});