let map;
let routeLayer;
let startMarker;
let endMarker;
let routeDataForGame = null;

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const startLat = params.get('startLat');
    const startLon = params.get('startLon');
    const destLat = params.get('destLat');
    const destLon = params.get('destLon');
    const startName = params.get('start');
    const destName = params.get('dest');

    document.getElementById('displayStart').textContent = startName || 'No especificado';
    document.getElementById('displayEnd').textContent = destName || 'No especificado';

    if (startLat && startLon && destLat && destLon) {
        initMap([startLat, startLon], [destLat, destLon]);
        fetchRoute([startLat, startLon], [destLat, destLon]);
    } else {
        alert('No se proporcionaron las coordenadas de inicio y destino.');
        initMap([-12.046374, -77.042793], [-12.046374, -77.042793]); // Lima center fallback
    }
    
    document.getElementById('view3D').addEventListener('click', () => {
        if (routeDataForGame) {
            sessionStorage.setItem('routeData', JSON.stringify(routeDataForGame));
            window.location.href = 'threejsAnimation.html';
        } else {
            alert('Los datos de la ruta aún no están listos para la simulación.');
        }
    });
});

function initMap(startCoords, destCoords) {
    map = L.map('map').setView(startCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const startIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#00ff88;' class='marker-pin'></div><i>S</i>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    const endIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#ff0080;' class='marker-pin'></div><i>D</i>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    startMarker = L.marker(startCoords, { icon: startIcon }).addTo(map);
    endMarker = L.marker(destCoords, { icon: endIcon }).addTo(map);

    map.fitBounds([startCoords, destCoords], { padding: [50, 50] });
}

async function fetchRoute(startCoords, destCoords) {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson&steps=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch route');
        
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            routeDataForGame = convertOSRMToGameFormat(route, document.getElementById('displayStart').textContent, document.getElementById('displayEnd').textContent);
            
            displayRoute(route.geometry);
            displayInstructions(route.legs[0].steps);
            document.getElementById('view3D').style.display = 'inline-flex';
        } else {
            alert('No se pudo encontrar una ruta.');
        }
    } catch (error) {
        console.error('Error fetching route:', error);
        alert('Error al calcular la ruta. Verifique la consola para más detalles.');
    }
}

function convertOSRMToGameFormat(route, startName, endName) {
    const steps = route.legs[0].steps;
    const totalDistance = route.distance;

    return steps.map((step, index) => {
        const stepCoords = step.geometry.coordinates;
        const fromCoords = stepCoords[0];
        const toCoords = stepCoords[stepCoords.length - 1];

        return {
            paso: index + 1,
            desde: index === 0 ? startName : steps[index - 1].name || 'Calle sin nombre',
            hasta: step.name || 'Calle sin nombre',
            fromCoords: [fromCoords[1], fromCoords[0]], // OSRM is Lng,Lat -> Game is Lat,Lng
            toCoords: [toCoords[1], toCoords[0]],
            nombreCalle: step.name || 'N/A',
            tipoCalle: 'N/A',
            unidireccional: 'N/A',
            distancia_metros: step.distance,
            distanciaLineaRectaAlDestino: 0, // Placeholder
            velocidadMaxima_kmh: 'N/A',
            instruccion: step.maneuver.instruction,
            distanciaTotal: index === 0 ? totalDistance : null
        };
    });
}

function displayRoute(geometry) {
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    routeLayer = L.geoJSON(geometry, {
        style: {
            color: '#006eff',
            weight: 5,
            opacity: 0.8
        }
    }).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

function displayInstructions(steps) {
    const stepsContainer = document.getElementById('routeSteps');
    stepsContainer.innerHTML = '';
    
    if (!steps || steps.length === 0) {
        stepsContainer.innerHTML = '<p>No hay instrucciones disponibles.</p>';
        return;
    }

    steps.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';
        
        const header = document.createElement('div');
        header.className = 'step-header';
        header.textContent = step.maneuver.instruction;
        
        const details = document.createElement('div');
        details.className = 'step-details';
        const distance = (step.distance / 1000).toFixed(2);
        const duration = Math.round(step.duration / 60);
        details.textContent = `Distancia: ${distance} km, Duración: ${duration} min`;
        
        stepDiv.appendChild(header);
        stepDiv.appendChild(details);
        stepsContainer.appendChild(stepDiv);
    });

    document.getElementById('routeInfo').style.display = 'block';
}

function goBack() {
    window.location.href = "home.html";
}