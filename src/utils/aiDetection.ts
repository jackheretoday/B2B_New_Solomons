export interface DetectionBox {
  class: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface DetectionResult {
  is_pothole_detected: boolean;
  is_real_report: boolean;
  pothole_count: number;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | 'None';
  detections: DetectionBox[];
  annotated_image?: string;
  message: string;
}

export async function detectPothole(imageBase64: string): Promise<DetectionResult> {
  const endpoints = ['/api/detect-base64', 'http://127.0.0.1:8000/api/detect-base64'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          confidence_threshold: 0.25,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data as DetectionResult;
      }
    } catch {
      // Continue to next endpoint if failed
    }
  }

  throw new Error('Could not connect to the Pothole Detection model server.');
}

export async function checkModelHealth(): Promise<boolean> {
  const endpoints = ['/api/health', 'http://127.0.0.1:8000/api/health'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return data.status === 'healthy';
      }
    } catch {
      // Continue to next
    }
  }
  return false;
}
