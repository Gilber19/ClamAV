// Main application logic and state management

// Application states
const APP_STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SCANNING: 'scanning',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Scan status mapping
const SCAN_STATUS_MAP = {
  pending: { text: 'En cola...', type: 'warn' },
  scanning: { text: 'Escaneando...', type: 'warn' },
  completed: { text: 'Completado', type: 'success' },
  error: { text: 'Error', type: 'danger' }
};

// Custom hook for scan polling
function useScanPolling(apiService) {
  const [polling, setPolling] = React.useState(false);
  const intervalRef = React.useRef(null);

  const startPolling = React.useCallback(async (scanId, onStatusUpdate, onComplete, onError) => {
    if (polling) return;

    setPolling(true);
    let attempts = 0;
    const maxAttempts = 120; // 3 minutes at 1.5s intervals

    intervalRef.current = setInterval(async () => {
      attempts++;
      
      try {
        const { status } = await apiService.getScanStatus(scanId);
        
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status === 'completed' || status === 'error') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPolling(false);
          
          if (onComplete) {
            onComplete(scanId);
          }
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPolling(false);
          
          if (onError) {
            onError(new Error('Scan timeout - operation took too long'));
          }
        }
      } catch (error) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPolling(false);
        
        if (onError) {
          onError(error);
        }
      }
    }, 1500); // Poll every 1.5 seconds
  }, [polling, apiService]);

  const stopPolling = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { polling, startPolling, stopPolling };
}

// Main App component
function MalwareScannerApp() {
  // Core state
  const [appState, setAppState] = React.useState(APP_STATES.IDLE);
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState('Esperando archivo...');
  const [chip, setChip] = React.useState({ text: 'Preparando...', type: 'neutral' });
  const [result, setResult] = React.useState(null);
  const [toast, setToast] = React.useState('');

  // Services
  const apiService = React.useMemo(() => new ApiService(), []);
  const { polling, startPolling, stopPolling } = useScanPolling(apiService);

  // Reset application state
  const resetApp = React.useCallback(() => {
    stopPolling();
    setAppState(APP_STATES.IDLE);
    setProgress(0);
    setChip({ text: 'Preparando...', type: 'neutral' });
    setStatusText('Esperando archivo...');
    setResult(null);
    setDragOver(false);
  }, [stopPolling]);

  // Show toast notification
  const showToast = React.useCallback((message) => {
    setToast(message);
  }, []);

  // Handle file upload
  const handleFileUpload = React.useCallback(async (file) => {
    const validation = FileValidator.validateFile(file);
    
    if (!validation.isValid) {
      showToast(validation.errors[0]);
      return;
    }

    try {
      setAppState(APP_STATES.UPLOADING);
      setProgress(0);
      setChip({ text: 'Subiendo...', type: 'warn' });
      setStatusText('Subiendo archivo...');

      const response = await apiService.uploadFile(file, (progressPercent) => {
        setProgress(progressPercent);
      });

      setChip({ text: 'Archivo subido', type: 'success' });
      setStatusText('Iniciando escaneo...');
      
      // Handle both fileId and id response formats
      const fileId = response.fileId || response.id;
      if (!fileId) {
        throw new Error('No se recibió ID de archivo válido');
      }
      
      // Start scan
      await handleScanStart(fileId);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setAppState(APP_STATES.ERROR);
      setChip({ text: 'Error al subir', type: 'danger' });
      setStatusText('No se pudo subir el archivo');
      setResult({ 
        status: 'error', 
        message: error.message || 'Error desconocido durante la subida' 
      });
      showToast('Error al subir el archivo');
    }
  }, [apiService, showToast]);

  // Handle scan start
  const handleScanStart = React.useCallback(async (fileId) => {
    try {
      setAppState(APP_STATES.SCANNING);
      setChip({ text: 'Iniciando...', type: 'warn' });
      setStatusText('Iniciando escaneo...');

      const scanResponse = await apiService.startScan(fileId);
      
      // Handle both scanId and id response formats
      const scanId = scanResponse.scanId || scanResponse.id;
      if (!scanId) {
        throw new Error('No se recibió ID de escaneo válido');
      }
      
      // Start polling for scan status
      startPolling(
        scanId,
        // onStatusUpdate
        (status) => {
          const statusInfo = SCAN_STATUS_MAP[status] || { text: status, type: 'neutral' };
          setChip(statusInfo);
          setStatusText(`Estado: ${status}...`);
        },
        // onComplete
        async (completedScanId) => {
          await handleScanComplete(completedScanId);
        },
        // onError
        (error) => {
          setAppState(APP_STATES.ERROR);
          setChip({ text: 'Error de escaneo', type: 'danger' });
          setStatusText('Error durante el escaneo');
          setResult({ 
            status: 'error', 
            message: error.message || 'Error desconocido durante el escaneo' 
          });
        }
      );

    } catch (error) {
      console.error('Scan start failed:', error);
      setAppState(APP_STATES.ERROR);
      setChip({ text: 'Error al escanear', type: 'danger' });
      setStatusText('Error al iniciar escaneo');
      setResult({ 
        status: 'error', 
        message: error.message || 'No se pudo iniciar el escaneo' 
      });
    }
  }, [apiService, startPolling]);

  // Handle scan completion
  const handleScanComplete = React.useCallback(async (scanId) => {
    try {
      const scanResult = await apiService.getScanResult(scanId);
      
      setAppState(APP_STATES.COMPLETED);
      setResult(scanResult);
      
      if (scanResult.status === 'clean') {
        setChip({ text: 'Completado', type: 'success' });
        setStatusText('Archivo limpio ✅');
      } else if (scanResult.status === 'infected') {
        setChip({ text: 'Completado', type: 'danger' });
        setStatusText('Archivo infectado ⚠️');
      } else {
        setChip({ text: 'Error', type: 'danger' });
        setStatusText('Error en el escaneo');
      }
      
    } catch (error) {
      console.error('Failed to get scan result:', error);
      setAppState(APP_STATES.ERROR);
      setChip({ text: 'Error', type: 'danger' });
      setStatusText('No se pudo obtener el resultado');
      setResult({ 
        status: 'error', 
        message: 'No se pudo obtener el resultado del escaneo' 
      });
    }
  }, [apiService]);

  // File drop handlers
  const handleDrop = React.useCallback((e) => {
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && appState === APP_STATES.IDLE) {
      handleFileUpload(file);
    }
  }, [appState, handleFileUpload]);

  const handleDragOver = React.useCallback(() => {
    if (appState === APP_STATES.IDLE) {
      setDragOver(true);
    }
  }, [appState]);

  const handleDragLeave = React.useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = React.useCallback((file) => {
    if (appState === APP_STATES.IDLE) {
      handleFileUpload(file);
    }
  }, [appState, handleFileUpload]);

  // Render the application
  const isProcessing = appState !== APP_STATES.IDLE && appState !== APP_STATES.COMPLETED;
  const showProgress = appState === APP_STATES.UPLOADING || appState === APP_STATES.SCANNING;
  const showResult = appState === APP_STATES.COMPLETED || appState === APP_STATES.ERROR;

  return React.createElement(React.Fragment, null,
    // Header
    React.createElement('header', { className: 'hero' },
      React.createElement('div', { className: 'hero-text' },
        React.createElement('h1', null, 'Escáner de Archivos'),
        React.createElement('p', null, 'Analiza tus archivos con ClamAV en segundos. Arrastra, suelta y listo.')
      ),
      React.createElement('div', { className: 'hero-badges' },
        React.createElement('span', { className: 'badge' }, 'ClamAV'),
        React.createElement('span', { className: 'badge' }, 'Express'),
        React.createElement('span', { className: 'badge' }, 'React')
      )
    ),

    // Main card
    React.createElement('section', { className: 'card' },
      React.createElement(DropZone, {
        onFileSelect: handleFileSelect,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        dragOver: dragOver,
        disabled: isProcessing
      }),

      showProgress && React.createElement(ProgressBar, {
        progress: progress,
        status: statusText,
        chip: chip
      }),

      React.createElement('div', { className: 'status-wrap' },
        React.createElement('div', { className: 'live-status muted' }, statusText),
        React.createElement('div', { className: 'actions' },
          React.createElement('button', {
            className: 'btn btn-ghost',
            type: 'button',
            onClick: resetApp,
            disabled: polling
          }, isProcessing ? 'Procesando...' : 'Subir otro')
        )
      )
    ),

    // Results
    showResult && React.createElement(ScanResult, {
      result: result,
      onReset: resetApp
    }),

    // Toast notifications
    React.createElement(Toast, {
      message: toast,
      onClose: () => setToast('')
    }),

    // Footer
    React.createElement('footer', { className: 'footer' },
      React.createElement('small', null, 'Malware Scanner • ClamAV + Express + React')
    )
  );
}

// Export the main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MalwareScannerApp, APP_STATES };
} else {
  window.MalwareScannerApp = MalwareScannerApp;
}
