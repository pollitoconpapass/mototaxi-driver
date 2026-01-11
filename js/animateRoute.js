// Función para cargar datos de ruta dinámicamente
function loadRouteData() {
    try {
        const storedRouteData = sessionStorage.getItem('routeData');
        
        if (storedRouteData) {
            console.log('Cargando datos de ruta desde sessionStorage');
            return JSON.parse(storedRouteData);
        } else {
            console.warn('No se encontraron datos de ruta en sessionStorage, usando fallback.');
            return getFallbackRouteData();
        }
    } catch (error) {
        console.error('Error al cargar datos de ruta:', error);
    }
}


// Función para mostrar información de debug
function showRouteDebugInfo(routeData) {
    console.log('Información de la ruta cargada:');
    console.log(`Pasos totales: ${routeData.length}`);
    console.log(`Inicio: ${routeData[0]?.desde}`);
    console.log(`Destino: ${routeData[routeData.length - 1]?.hasta}`);
    
    const totalDistance = routeData.reduce((sum, step) => sum + (step.distancia_metros || 0), 0);
    console.log(`Distancia total: ${Math.round(totalDistance)} metros`);
}

// Función para validar datos de ruta
function validateRouteData(routeData) {
    if (!Array.isArray(routeData) || routeData.length === 0) {
        throw new Error('Los datos de ruta están vacíos o no son válidos');
    }
    
    for (let i = 0; i < routeData.length; i++) {
        const step = routeData[i];
        if (!step.fromCoords || !step.toCoords || step.fromCoords.length !== 2 || step.toCoords.length !== 2) {
            throw new Error(`Paso ${i + 1} no tiene coordenadas válidas`);
        }
    }
    
    return true;
}

// Función principal de inicialización
function initializeGame() {
    try {
        // Cargar datos de ruta
        let routeData = loadRouteData();
        
        // Validar datos
        validateRouteData(routeData);
        
        // Mostrar información de debug
        showRouteDebugInfo(routeData);
        
        // Adaptar los datos al formato que espera el juego (fromLat, fromLng, etc.)
        const gameData = routeData.map(step => ({
            ...step,
            fromLat: step.fromCoords[0],
            fromLng: step.fromCoords[1],
            toLat: step.toCoords[0],
            toLng: step.toCoords[1],
        }));

        // Inicializar el juego con los datos cargados
        const game = new Game(gameData);
        console.log('Juego inicializado correctamente');
        
        return game;
        
    } catch (error) {
        console.error('Error al inicializar el juego:', error);
        
        // Mostrar mensaje de error al usuario
        showErrorMessage(error.message);
        
        // Intentar cargar con datos de fallback como último recurso
        try {
            console.log('Intentando cargar con datos de fallback...');
            const fallbackData = getFallbackRouteData();
            const game = new Game(fallbackData);
            console.log('Juego inicializado con datos de fallback');
            return game;
        } catch (fallbackError) {
            console.error('Error crítico: No se pudo inicializar el juego:', fallbackError);
            showCriticalErrorMessage();
        }
    }
}

// Función para mostrar mensajes de error al usuario
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 1000;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
        <h3>Error al cargar la ruta</h3>
        <p>${message}</p>
        <button onclick="window.history.back()" style="
            background: white;
            color: red;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        ">Volver atrás</button>
    `;
    document.body.appendChild(errorDiv);
}

// Función para mostrar error crítico
function showCriticalErrorMessage() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #000;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        ">
            <div>
                <h1>Error Crítico</h1>
                <p>No se pudo cargar la simulación 3D</p>
                <button onclick="window.location.href='osm_mapping.html'" style="
                    background: #3182ce;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                ">Volver al Mapa</button>
                <button onclick="window.location.href='home.html'" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                ">Inicio</button>
            </div>
        </div>
    `;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando carga de simulación 3D...');
    initializeGame();
});

// Función adicional para debug - puedes llamarla desde la consola
window.debugRoute = function() {
    const stored = sessionStorage.getItem('routeData');
    if (stored) {
        console.log('Datos en sessionStorage:', JSON.parse(stored));
    } else {
        console.log('No hay datos en sessionStorage');
    }
};