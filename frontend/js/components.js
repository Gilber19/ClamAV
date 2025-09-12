// React Components for the malware scanner

// Status chip component
function Chip({ text, type }) {
  const cls =
    type === "success"
      ? "chip chip-success"
      : type === "danger"
      ? "chip chip-danger"
      : type === "warn"
      ? "chip chip-warn"
      : "chip";
  return React.createElement("span", { className: cls }, text);
}

// Progress bar component
function ProgressBar({ progress, status, chip }) {
  if (!progress && progress !== 0) return null;

  return React.createElement(
    "div",
    { className: "progress-wrap", "aria-live": "polite" },
    React.createElement(
      "div",
      { className: "progress-head" },
      React.createElement(Chip, { text: chip.text, type: chip.type }),
      React.createElement("span", { className: "muted" }, `${progress}%`)
    ),
    React.createElement(
      "div",
      { className: "progress" },
      React.createElement("div", {
        className: "progress-bar",
        style: { width: `${progress}%` },
      })
    )
  );
}

// File drop zone component
function DropZone({
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
  disabled,
}) {
  const fileInputRef = React.useRef(null);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return React.createElement(
    "div",
    {
      className: `drop-zone${dragOver ? " dragover" : ""}${
        disabled ? " disabled" : ""
      }`,
      tabIndex: disabled ? -1 : 0,
      "aria-label": "Zona de carga de archivos",
      onClick: handleClick,
      onDragOver: (e) => {
        e.preventDefault();
        if (!disabled && onDragOver) onDragOver();
      },
      onDragLeave: () => {
        if (!disabled && onDragLeave) onDragLeave();
      },
      onDrop: (e) => {
        e.preventDefault();
        if (!disabled && onDrop) onDrop(e);
      },
    },
    React.createElement(
      "div",
      { className: "dz-illustration", "aria-hidden": "true" },
      React.createElement(
        "svg",
        { viewBox: "0 0 24 24", className: "icon-xl" },
        React.createElement("path", {
          d: "M7 18a5 5 0 0 1 0-10 6 6 0 0 1 11.3-1.7A4.5 4.5 0 0 1 18.5 18H16",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.5",
        }),
        React.createElement("path", {
          d: "m12 13 3 3m-3-3-3 3m3-3v8",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.5",
          strokeLinecap: "round",
        })
      )
    ),
    React.createElement(
      "div",
      { className: "dz-copy" },
      React.createElement(
        "h2",
        null,
        disabled ? "Procesando..." : "Arrastra tu archivo aquí"
      ),
      React.createElement("p", { className: "muted" }, "o"),
      React.createElement(
        "button",
        {
          className: "btn btn-primary",
          type: "button",
          disabled: disabled,
          onClick: (e) => {
            e.preventDefault();
            handleClick();
          },
        },
        disabled ? "Procesando..." : "Seleccionar archivo"
      ),
      React.createElement(
        "p",
        { className: "hint" },
        "PDF, DOC/DOCX, TXT, ZIP · Máx. 10MB"
      )
    ),
    React.createElement("input", {
      ref: fileInputRef,
      type: "file",
      hidden: true,
      accept: ".pdf,.doc,.docx,.txt,.zip",
      onChange: handleFileChange,
    })
  );
}

// Scan result component
function ScanResult({ result, onReset }) {
  if (!result) return null;

  // Normalize the result data to handle different formats
  const normalizeResult = (result) => {
    // Handle nested details format
    if (result.details) {
      return {
        status: result.details.status || result.status,
        meta: result.details.meta || result.meta || {},
        signature: result.details.signature || result.signature,
        message: result.message,
        scannedAt: result.details.scannedAt || result.scannedAt || result.details.meta?.scannedAt
      };
    }
    
    // Handle flat format
    return {
      status: result.status,
      meta: result.meta || {},
      signature: result.signature,
      message: result.message,
      scannedAt: result.scannedAt || result.meta?.scannedAt
    };
  };

  const normalizedResult = normalizeResult(result);
  const { status, meta, signature, message, scannedAt } = normalizedResult;

  const renderResultContent = () => {
    if (status === "clean") {
      return React.createElement(
        "div",
        { className: "result-body" },
        React.createElement("strong", null, "No se detectó malware."),
        React.createElement(
          "div",
          { className: "result-kv" },
          React.createElement("div", { className: "k" }, "Nombre"),
          React.createElement(
            "div",
            { className: "v" },
            Utils.escapeHtml(meta.originalName || "—")
          ),
          React.createElement("div", { className: "k" }, "Tamaño"),
          React.createElement(
            "div",
            { className: "v" },
            Utils.formatBytes(meta.size)
          ),
          React.createElement("div", { className: "k" }, "Tipo"),
          React.createElement(
            "div",
            { className: "v" },
            Utils.escapeHtml(meta.mimetype || "—")
          ),
          scannedAt &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement("div", { className: "k" }, "Escaneado"),
              React.createElement(
                "div",
                { className: "v" },
                Utils.formatDate(scannedAt)
              )
            )
        )
      );
    }

    if (status === "infected") {
      return React.createElement(
        "div",
        { className: "result-body" },
        React.createElement("strong", null, "Se detectó una firma maliciosa."),
        React.createElement(
          "div",
          { className: "result-kv" },
          React.createElement("div", { className: "k" }, "Firma"),
          React.createElement(
            "div",
            { className: "v threat" },
            Utils.escapeHtml(signature || "desconocida")
          ),
          React.createElement("div", { className: "k" }, "Nombre"),
          React.createElement(
            "div",
            { className: "v" },
            Utils.escapeHtml(meta.originalName || "—")
          ),
          React.createElement("div", { className: "k" }, "Tamaño"),
          React.createElement(
            "div",
            { className: "v" },
            Utils.formatBytes(meta.size)
          ),
          scannedAt &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement("div", { className: "k" }, "Detectado"),
              React.createElement(
                "div",
                { className: "v" },
                Utils.formatDate(scannedAt)
              )
            )
        ),
        React.createElement(
          "div",
          { className: "warning-box" },
          React.createElement(
            "p",
            null,
            "⚠️ Recomendación: no abras el archivo y elimínalo de tu dispositivo."
          )
        )
      );
    }

    return React.createElement(
      "div",
      { className: "result-body" },
      React.createElement(
        "strong",
        null,
        "Ocurrió un problema durante el escaneo."
      ),
      React.createElement(
        "pre",
        {
          style: { whiteSpace: "pre-wrap", fontSize: "0.9em", color: "#666" },
        },
        Utils.escapeHtml(message || JSON.stringify(result, null, 2))
      )
    );
  };

  const getStatusChip = () => {
    switch (status) {
      case "clean":
        return { text: "LIMPIO", type: "success" };
      case "infected":
        return { text: "INFECTADO", type: "danger" };
      default:
        return { text: "ERROR", type: "neutral" };
    }
  };

  const statusChip = getStatusChip();

  return React.createElement(
    "section",
    { className: "card result-card" },
    React.createElement(
      "div",
      { className: "result-head" },
      React.createElement("h3", null, "Resultado del escaneo"),
      React.createElement(Chip, {
        text: statusChip.text,
        type: statusChip.type,
      })
    ),
    renderResultContent(),
    React.createElement(
      "div",
      { className: "result-actions" },
      React.createElement(
        "button",
        {
          className: "btn btn-primary",
          type: "button",
          onClick: onReset,
        },
        "Escanear otro archivo"
      )
    )
  );
}

// Toast notification component
function Toast({ message, onClose }) {
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return React.createElement(
    "div",
    {
      className: "toast show",
      role: "status",
      "aria-live": "polite",
    },
    message
  );
}

// Export components
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Chip, ProgressBar, DropZone, ScanResult, Toast };
} else {
  window.Chip = Chip;
  window.ProgressBar = ProgressBar;
  window.DropZone = DropZone;
  window.ScanResult = ScanResult;
  window.Toast = Toast;
}
