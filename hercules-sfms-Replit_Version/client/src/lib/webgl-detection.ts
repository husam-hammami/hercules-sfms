/**
 * WebGL Detection Utility
 * Safely checks for WebGL support in the browser
 */

export interface WebGLSupport {
  supported: boolean;
  version: '1' | '2' | null;
  vendor: string | null;
  renderer: string | null;
  error: string | null;
}

/**
 * Detects WebGL support and capabilities
 * @returns WebGLSupport object with detection results
 */
export function detectWebGL(): WebGLSupport {
  // Initial result object
  const result: WebGLSupport = {
    supported: false,
    version: null,
    vendor: null,
    renderer: null,
    error: null
  };

  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.document) {
      result.error = 'Not in browser environment';
      return result;
    }

    // Create canvas element for testing
    const canvas = document.createElement('canvas');
    
    // Try WebGL 2 first
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    
    try {
      gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
      if (gl) {
        result.version = '2';
      }
    } catch (e) {
      // WebGL 2 not supported
    }
    
    // Fall back to WebGL 1
    if (!gl) {
      try {
        gl = canvas.getContext('webgl') || 
             canvas.getContext('experimental-webgl') as WebGLRenderingContext;
        if (gl) {
          result.version = '1';
        }
      } catch (e) {
        // WebGL 1 not supported
      }
    }
    
    if (!gl) {
      result.error = 'WebGL not supported';
      return result;
    }
    
    // WebGL is supported
    result.supported = true;
    
    // Get debug info if available
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
    } else {
      // Fallback to standard parameters
      result.vendor = gl.getParameter(gl.VENDOR) || 'Unknown';
      result.renderer = gl.getParameter(gl.RENDERER) || 'Unknown';
    }
    
    // Clean up
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error during WebGL detection';
  }
  
  return result;
}

/**
 * Simple check for WebGL support
 * @returns boolean indicating if WebGL is supported
 */
export function hasWebGL(): boolean {
  return detectWebGL().supported;
}

/**
 * Get WebGL error message for display
 * @returns User-friendly error message
 */
export function getWebGLErrorMessage(): string {
  const detection = detectWebGL();
  
  if (detection.supported) {
    return '';
  }
  
  if (detection.error === 'Not in browser environment') {
    return 'WebGL requires a browser environment';
  }
  
  return `WebGL is not supported on this device. 
    Please try updating your browser or graphics drivers, 
    or use a different device for the best experience.`;
}